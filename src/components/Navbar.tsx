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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${navBg}`}>
      <div className="w-full px-6 lg:px-10">
        <div className="grid grid-cols-3 items-center h-20">

          {/* 로고 */}
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0 justify-self-start">
            {!logoError ? (
              <div className="relative h-16 w-16 flex-shrink-0">
                <Image src="/logo.png" alt="인제대학교 글로컬대학 로고" fill sizes="64px"
                  style={{ objectFit: "contain" }} priority draggable={false}
                  onError={() => setLogoError(true)} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-brand-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">IU</div>
            )}
            <span className={`text-base font-bold tracking-tight transition-colors duration-300 ${isHome && !scrolled ? "text-white" : "text-neutral-800"}`}>
              데이터거버넌스센터
            </span>
          </Link>

          {/* 데스크탑 네비게이션 */}
          <nav className="hidden md:flex items-center justify-center gap-5">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className={`text-sm font-medium transition-colors duration-200 hover:opacity-70 ${linkColor} ${
                  pathname === link.href ? "opacity-100 font-semibold" : "opacity-75"
                }`}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 인증 영역 */}
          <div className="hidden md:flex items-center gap-3 justify-end">
            {user ? (
              <>
                {isAdmin && (
                  <Link href="/admin"
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
                      isHome && !scrolled ? "text-white/70 hover:bg-white/15" : "text-neutral-400 hover:bg-neutral-100"
                    }`}>
                    <Settings size={13} />
                    관리자
                  </Link>
                )}
                <Link href="/mypage"
                  className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                    isHome && !scrolled ? "text-white hover:bg-white/15" : "text-neutral-600 hover:bg-neutral-100"
                  }`}>
                  <User size={14} />
                  {user.user_metadata?.full_name?.split(" ")[0] ?? user.email?.split("@")[0]}
                </Link>
                <button onClick={logout}
                  className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                    isHome && !scrolled ? "text-white/70 hover:bg-white/15" : "text-neutral-400 hover:bg-neutral-100"
                  }`}>
                  <LogOut size={14} />
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/login"
                  className={`text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                    isHome && !scrolled ? "text-white hover:bg-white/15" : "text-neutral-600 hover:bg-neutral-100"
                  }`}>
                  로그인
                </Link>
                <Link href="/login"
                  className={`text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    isHome && !scrolled
                      ? "bg-white text-brand-700 hover:bg-brand-50"
                      : "bg-brand-600 text-white hover:bg-brand-700 shadow-brand"
                  }`}>
                  시작하기
                </Link>
              </>
            )}
          </div>

          {/* 모바일 햄버거 */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors justify-self-end ${
              isHome && !scrolled ? "text-white hover:bg-white/20" : "text-neutral-700 hover:bg-neutral-100"
            }`} aria-label="메뉴">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-neutral-100 shadow-lg">
          <div className="px-6 py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-neutral-700 py-2 hover:text-brand-600 transition-colors">
                {link.label}
              </Link>
            ))}
            <hr className="border-neutral-100 my-1" />
            {user ? (
              <button onClick={logout}
                className="text-sm font-semibold text-center bg-neutral-100 text-neutral-700 py-3 rounded-xl hover:bg-neutral-200 transition-colors">
                로그아웃
              </button>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)}
                className="text-sm font-semibold text-center bg-brand-600 text-white py-3 rounded-xl hover:bg-brand-700 transition-colors active:scale-95">
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
