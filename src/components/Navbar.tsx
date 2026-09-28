"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, User, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const navLinks = [
  { href: "/",           label: "홈" },
  { href: "/datasets",   label: "데이터 탐색" },
  { href: "/analysis",   label: "데이터 분석" },
  { href: "/policy",     label: "정책" },
  { href: "/survey",     label: "만족도 조사" },
  { href: "/board/free", label: "게시판" },
];

// 버튼 공통 상태 (DESIGN.md 5장): hover / focus-visible / active 모두 포함
const pressable =
  "transition-[background-color,color,transform] duration-150 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError,  setLogoError]  = useState(false);
  const [user,       setUser]       = useState<SupabaseUser | null | undefined>(undefined); // undefined = 로딩 중
  const [isAdmin,    setIsAdmin]    = useState(false);

  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let initialized = false;

    const applyUser = async (u: SupabaseUser | null) => {
      setUser(u);
      if (!u) { setIsAdmin(false); return; }
      const { data } = await supabase.from("profiles").select("role").eq("id", u.id).maybeSingle();
      setIsAdmin(data?.role === "admin");
    };

    // getUser()가 끝나기 전의 onAuthStateChange 이벤트는 무시 (로그인 버튼 깜빡임 방지)
    supabase.auth.getUser()
      .then(({ data }) => { initialized = true; applyUser(data.user); })
      .catch(() => { initialized = true; applyUser(null); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!initialized) return;
      applyUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/board/free" ? pathname.startsWith("/board") : pathname === href;

  const displayName = user
    ? (user.user_metadata?.full_name?.split(" ")[0] ?? user.email?.split("@")[0])
    : "";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-neutral-50/90 backdrop-blur border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">

          {/* 로고 */}
          <Link href="/" className={`flex items-center gap-2.5 flex-shrink-0 rounded-xl ${pressable}`}>
            {!logoError ? (
              <div className="relative h-9 w-9 flex-shrink-0">
                <Image src="/logo.png" alt="인제대학교 글로컬대학 로고" fill sizes="36px"
                  style={{ objectFit: "contain" }} priority draggable={false}
                  onError={() => setLogoError(true)} />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-lg bg-brand-600 text-white text-xs font-semibold flex items-center justify-center">IU</div>
            )}
            <span className="hidden sm:block text-[15px] font-semibold tracking-tight text-neutral-900 whitespace-nowrap">
              데이터거버넌스센터
            </span>
          </Link>

          {/* 데스크탑 내비게이션 — lg 이상, 한 줄 */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className={`text-sm px-3 py-2 rounded-xl whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                  isActive(link.href)
                    ? "text-neutral-900 font-medium"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                }`}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 인증 영역 — min-w로 로드 전후 레이아웃 고정 */}
          <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0 min-w-[200px] justify-end">
            {user === undefined ? null : user ? (
              <>
                {isAdmin && (
                  <Link href="/admin"
                    className={`flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 px-3 py-2 rounded-xl ${pressable}`}>
                    <Settings size={14} strokeWidth={1.75} /> 관리자
                  </Link>
                )}
                <Link href="/mypage"
                  className={`flex items-center gap-1.5 text-sm text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 px-3 py-2 rounded-xl max-w-[140px] ${pressable}`}>
                  <User size={14} strokeWidth={1.75} className="flex-shrink-0" />
                  <span className="truncate">{displayName}</span>
                </Link>
                <button onClick={logout}
                  className={`flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 px-3 py-2 rounded-xl ${pressable}`}>
                  <LogOut size={14} strokeWidth={1.75} /> 로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/login"
                  className={`text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 px-3 py-2 rounded-xl ${pressable}`}>
                  로그인
                </Link>
                <Link href="/signup"
                  className={`text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl ${pressable}`}>
                  시작하기
                </Link>
              </>
            )}
          </div>

          {/* 모바일 햄버거 — lg 미만 */}
          <button onClick={() => setMobileOpen((o) => !o)}
            className={`lg:hidden p-2 rounded-xl text-neutral-700 hover:bg-neutral-100 ${pressable}`}
            aria-label="메뉴" aria-expanded={mobileOpen}>
            {mobileOpen ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 */}
      {mobileOpen && (
        <div className="lg:hidden bg-neutral-50 border-t border-neutral-200">
          <div className="px-6 py-3 flex flex-col gap-0.5">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className={`text-sm py-2.5 px-3 rounded-xl transition-colors duration-150 ${
                  isActive(link.href)
                    ? "text-neutral-900 font-medium bg-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}>
                {link.label}
              </Link>
            ))}
            <hr className="border-neutral-200 my-2" />
            {user === undefined ? null : user ? (
              <div className="flex flex-col gap-0.5">
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-sm text-neutral-600 py-2.5 px-3 rounded-xl hover:bg-neutral-100">
                    <Settings size={14} strokeWidth={1.75} /> 관리자 페이지
                  </Link>
                )}
                <Link href="/mypage" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-sm text-neutral-700 py-2.5 px-3 rounded-xl hover:bg-neutral-100">
                  <User size={14} strokeWidth={1.75} /> {displayName}
                </Link>
                <button onClick={logout}
                  className={`mt-2 text-sm font-medium text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-100 py-3 rounded-xl ${pressable}`}>
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link href="/login" onClick={() => setMobileOpen(false)}
                  className={`text-sm font-medium text-center text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-100 py-3 rounded-xl ${pressable}`}>
                  로그인
                </Link>
                <Link href="/signup" onClick={() => setMobileOpen(false)}
                  className={`text-sm font-medium text-center bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl ${pressable}`}>
                  시작하기
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
