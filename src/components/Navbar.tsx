"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, User, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
// 상단 네비게이션 링크 목록
const navLinks = [
  { href: "/",         label: "홈" },
  { href: "/datasets", label: "데이터 탐색" },
  { href: "/analysis", label: "데이터 분석" },
  { href: "/policy",   label: "정책" },
  { href: "/survey",   label: "만족도 조사" },
];

export default function Navbar() {
  const [scrolled,      setScrolled]      = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [logoError,     setLogoError]     = useState(false);
  const [user,          setUser]          = useState<SupabaseUser | null>(null);
  const [isAdmin,       setIsAdmin]       = useState(false);

  const pathname = usePathname();
  const router   = useRouter();
  // 홈에서만 투명 배경 적용
  const isHome   = pathname === "/";

  // 스크롤 감지 — 40px 이상 내려가면 배경 고정
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 로그인 상태 감지 + 관리자 여부 확인 (profiles.role = 'admin')
  useEffect(() => {
    const supabase = createClient();

    const checkUser = async (u: SupabaseUser | null) => {
      setUser(u);
      if (!u) { setIsAdmin(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", u.id)
        .maybeSingle();
      setIsAdmin(data?.role === "admin");
    };

    // 초기 로드 시 세션 확인
    supabase.auth.getUser().then(({ data }) => checkUser(data.user));

    // 로그인/아웃 이벤트 실시간 반영, cleanup으로 구독 해제
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // 홈 + 스크롤 여부에 따라 Navbar 배경/텍스트 색상 결정
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
        {/* CSS grid 3-column: 로고(좌) | 네비(중) | 인증(우) */}
        <div className="grid grid-cols-3 items-center h-16">

          {/* 로고 — 왼쪽 고정 */}
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0 justify-self-start">
            {!logoError ? (
              <div className="relative w-9 h-9 flex-shrink-0 bg-white rounded-lg border border-neutral-100 p-0.5 shadow-sm">
                <Image src="/logo.png" alt="인제대학교 로고" fill sizes="36px"
                  style={{ objectFit: "contain" }} priority draggable={false}
                  onError={() => setLogoError(true)} />
              </div>
            ) : (
              // 로고 이미지 로드 실패 시 텍스트 폴백
              <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">IU</div>
            )}
            <div className="flex flex-col justify-center leading-snug">
              <span className={`text-[10px] font-medium transition-colors duration-300 ${isHome && !scrolled ? "text-white/60" : "text-neutral-400"}`}>
                인제대학교 글로컬대학
              </span>
              <span className={`text-sm font-bold tracking-tight transition-colors duration-300 ${isHome && !scrolled ? "text-white" : "text-neutral-800"}`}>
                데이터거버넌스센터
              </span>
            </div>
          </Link>

          {/* 데스크탑 네비게이션 — 가운데 정렬 */}
          <nav className="hidden md:flex items-center justify-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className={`text-sm font-medium transition-colors duration-200 hover:opacity-70 ${linkColor} ${
                  pathname === link.href ? "opacity-100 font-semibold" : "opacity-75"
                }`}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 인증 영역 — 오른쪽 고정 */}
          <div className="hidden md:flex items-center gap-3 justify-end">
            {user ? (
              <>
                {/* 관리자 메뉴 — role = 'admin' 인 경우만 표시 */}
                {isAdmin && (
                  <Link href="/admin"
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
                      isHome && !scrolled ? "text-white/70 hover:bg-white/15" : "text-neutral-400 hover:bg-neutral-100"
                    }`}>
                    <Settings size={13} />
                    관리자
                  </Link>
                )}
                {/* 마이페이지 — 이름 첫 번째 단어 표시 */}
                <Link href="/mypage"
                  className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 ${
                    isHome && !scrolled ? "text-white hover:bg-white/15" : "text-neutral-600 hover:bg-neutral-100"
                  }`}>
                  <User size={14} />
                  {user.user_metadata?.full_name?.split(" ")[0] ?? user.email?.split("@")[0]}
                </Link>
                {/* 로그아웃 */}
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

          {/* 모바일 햄버거 버튼 */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors justify-self-end ${
              isHome && !scrolled ? "text-white hover:bg-white/20" : "text-neutral-700 hover:bg-neutral-100"
            }`} aria-label="메뉴">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
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
