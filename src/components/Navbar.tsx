"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, User, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const navLinks = [
  { href: "/",         label: "홈" },
  { href: "/datasets", label: "데이터 탐색" },
  { href: "/analysis", label: "데이터 분석" },
  { href: "/policy",   label: "정책" },
  { href: "/survey",   label: "만족도 조사" },
  { href: "/board",    label: "게시판" },
];

export default function Navbar() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError,  setLogoError]  = useState(false);
  const [user,       setUser]       = useState<SupabaseUser | null>(null);
  const [isAdmin,    setIsAdmin]    = useState(false);

  const pathname = usePathname();
  const router   = useRouter();
  const isHome   = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const checkUser = async (u: SupabaseUser | null) => {
      setUser(u);
      if (!u) { setIsAdmin(false); return; }
      const { data } = await supabase.from("profiles").select("role").eq("id", u.id).maybeSingle();
      setIsAdmin(data?.role === "admin");
    };
    supabase.auth.getUser().then(({ data }) => checkUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      checkUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  const navBg = isHome
    ? scrolled
      ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-neutral-200/60"
      : "bg-transparent"
    : "bg-white/95 backdrop-blur-md shadow-sm border-b border-neutral-200/60";

  const linkColor = isHome && !scrolled ? "text-white" : "text-neutral-700";

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-150 ${navBg}`}>
        <div className="w-full px-4 md:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 md:h-20 gap-4">

            {/* 로고 */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0 group outline-none focus:outline-none">
              {!logoError ? (
                <div className="relative h-12 w-12 md:h-14 md:w-14 flex-shrink-0">
                  <Image src="/logo.png" alt="인제대학교 글로컬대학 로고" fill sizes="56px"
                    style={{ objectFit: "contain" }} priority draggable={false}
                    onError={() => setLogoError(true)} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">IU</div>
              )}
              <span className={`hidden sm:block text-sm md:text-base font-bold tracking-tight transition-colors duration-150 whitespace-nowrap ${isHome && !scrolled ? "text-white" : "text-neutral-800"}`}>
                데이터거버넌스센터
              </span>
            </Link>

            {/* 데스크탑 네비게이션 — lg 이상에서만 표시 */}
            <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-4 flex-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link key={link.href} href={link.href}
                    className={`text-xs xl:text-sm font-semibold px-2 py-1 rounded-md whitespace-nowrap outline-none focus:outline-none [transition:color_150ms,opacity_150ms] ${linkColor} ${
                      isActive ? "opacity-100" : "opacity-55 hover:opacity-80"
                    }`}>
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* 인증 영역 — lg 이상에서만 표시 / min-w 고정으로 auth 로드 시 nav 밀림 방지 */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0 min-w-[220px] justify-end">
              {user ? (
                <>
                  {isAdmin && (
                    <Link href="/admin"
                      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg outline-none focus:outline-none [transition:color_150ms,background-color_150ms] ${
                        isHome && !scrolled ? "text-white/70 hover:bg-white/15" : "text-neutral-400 hover:bg-neutral-100"
                      }`}>
                      <Settings size={12} /> 관리자
                    </Link>
                  )}
                  <Link href="/mypage"
                    className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg outline-none focus:outline-none [transition:color_150ms,background-color_150ms] whitespace-nowrap max-w-[100px] truncate ${
                      isHome && !scrolled ? "text-white hover:bg-white/15" : "text-neutral-600 hover:bg-neutral-100"
                    }`}>
                    <User size={13} />
                    {user.user_metadata?.full_name?.split(" ")[0] ?? user.email?.split("@")[0]}
                  </Link>
                  <button onClick={logout}
                    className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg outline-none focus:outline-none [transition:color_150ms,background-color_150ms] ${
                      isHome && !scrolled ? "text-white/70 hover:bg-white/15" : "text-neutral-400 hover:bg-neutral-100"
                    }`}>
                    <LogOut size={13} /> 로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login"
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg outline-none focus:outline-none [transition:color_150ms,background-color_150ms] ${
                      isHome && !scrolled ? "text-white hover:bg-white/15" : "text-neutral-600 hover:bg-neutral-100"
                    }`}>
                    로그인
                  </Link>
                  <Link href="/login"
                    className={`text-xs font-semibold px-4 py-1.5 rounded-lg outline-none focus:outline-none [transition:color_150ms,background-color_150ms] active:scale-95 ${
                      isHome && !scrolled
                        ? "bg-white text-brand-700 hover:bg-brand-50"
                        : "bg-brand-600 text-white hover:bg-brand-700"
                    }`}>
                    시작하기
                  </Link>
                </>
              )}
            </div>

            {/* 모바일/태블릿 햄버거 — lg 미만에서 표시 */}
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className={`lg:hidden p-2 rounded-lg outline-none focus:outline-none [transition:color_150ms,background-color_150ms] flex-shrink-0 ${
                isHome && !scrolled ? "text-white hover:bg-white/20" : "text-neutral-700 hover:bg-neutral-100"
              }`} aria-label="메뉴">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* 모바일 드롭다운 */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-neutral-100 shadow-lg">
            <div className="px-5 py-3 flex flex-col gap-0.5">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                  className={`text-sm font-semibold py-2 px-3 rounded-lg outline-none focus:outline-none transition-colors ${
                    pathname === link.href
                      ? "text-brand-700 bg-brand-50"
                      : "text-neutral-600 opacity-70 hover:bg-neutral-50 hover:text-brand-600 hover:opacity-100"
                  }`}>
                  {link.label}
                </Link>
              ))}
              <hr className="border-neutral-100 my-2" />
              {user ? (
                <div className="flex flex-col gap-2">
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 text-sm font-medium text-neutral-500 py-2 px-3 rounded-lg outline-none focus:outline-none hover:bg-neutral-50">
                      <Settings size={14} /> 관리자 페이지
                    </Link>
                  )}
                  <Link href="/mypage" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-sm font-medium text-neutral-700 py-2 px-3 rounded-lg outline-none focus:outline-none hover:bg-neutral-50">
                    <User size={14} />
                    {user.user_metadata?.full_name?.split(" ")[0] ?? user.email?.split("@")[0]}
                  </Link>
                  <button onClick={logout}
                    className="text-sm font-semibold text-center bg-neutral-100 text-neutral-700 py-3 rounded-xl outline-none focus:outline-none hover:bg-neutral-200 transition-colors">
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setMobileOpen(false)}
                  className="text-sm font-semibold text-center bg-brand-600 text-white py-3 rounded-xl outline-none focus:outline-none hover:bg-brand-700 transition-colors active:scale-95">
                  로그인 / 시작하기
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
