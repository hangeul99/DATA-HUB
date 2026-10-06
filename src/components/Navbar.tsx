"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, User, Settings, ChevronDown, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const navLinks = [
  { href: "/",         label: "홈" },
  { href: "/datasets", label: "데이터 탐색" },
  { href: "/analysis", label: "데이터 분석" },
  { href: "/policy",   label: "정책" },
  { href: "/survey",   label: "만족도 조사" },
  { href: "/board/free", label: "게시판" },
];

// 관련 사이트 — 새 탭으로 열림. ★ 추가·수정은 여기서
const RELATED_SITES = [
  { href: "https://ai-teaching-bice.vercel.app/", label: "AI솔루션센터", desc: "인제대학교 AI 교육·솔루션" },
  { href: "https://mosquito-zero.vercel.app/",   label: "모기제로",      desc: "오늘의 김해 모기지수" },
  { href: "https://workmanager-ochre.vercel.app/dashboard", label: "업무 관리 시스템", desc: "업무 실적·일정·회의 예약" },
];

export default function Navbar() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError,  setLogoError]  = useState(false);
  const [user,       setUser]       = useState<SupabaseUser | null | undefined>(undefined); // undefined = 아직 로딩 중
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
    let initialized = false;

    const applyUser = async (u: SupabaseUser | null) => {
      setUser(u);
      if (!u) { setIsAdmin(false); return; }
      const { data } = await supabase.from("profiles").select("role").eq("id", u.id).maybeSingle();
      setIsAdmin(data?.role === "admin");
    };

    // getUser()가 완료돼야 초기화 — 그 전엔 onAuthStateChange 이벤트 무시 (초록 번쩍임 방지)
    supabase.auth.getUser().then(({ data }) => {
      initialized = true;
      applyUser(data.user);
    });

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

  const linkColor = isHome && !scrolled ? "text-white" : "text-neutral-700";

  // 홈 맨 위에서도 로고·로그인/시작하기를 보여 줌 (v9 히어로에는 큰 로고가 없어 겹치지 않음)
  // 다시 숨기고 싶으면: const hideOnHeroTop = isHome && !scrolled;
  const hideOnHeroTop = false;
  const heroTopHidden = hideOnHeroTop
    ? "opacity-0 invisible -translate-y-1 pointer-events-none"
    : "opacity-100 visible translate-y-0";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* 배경 레이어: 스크롤하면 흰 바로 전환 (흐림 효과는 스크롤마다 뒤를 다시 그려 무거워서 뺌), opacity로 부드럽게 */}
        <div aria-hidden="true" className={`absolute inset-0 -z-10 bg-white/[.96] border-b border-neutral-200/60 shadow-[0_8px_30px_-20px_rgba(15,20,28,.25)] [transition:opacity_200ms] ${
          isHome && !scrolled ? "opacity-0" : "opacity-100"
        }`} />
        <div className="relative w-full px-4 md:px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 md:h-20 gap-4">

            {/* 로고 */}
            <Link href="/" aria-hidden={hideOnHeroTop || undefined} tabIndex={hideOnHeroTop ? -1 : undefined}
              className={`flex items-center gap-2 flex-shrink-0 group outline-none focus:outline-none [transition:opacity_250ms,translate_300ms,visibility_250ms] ${heroTopHidden}`}>
              {/* 스크롤하면 로고가 살짝 작아짐 */}
              {!logoError ? (
                <div className={`relative flex-shrink-0 [transition:width_250ms,height_250ms] ${scrolled ? "h-10 w-10 md:h-11 md:w-11" : "h-12 w-12 md:h-14 md:w-14"}`}>
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
                const isActive = link.href === "/board/free"
                  ? pathname.startsWith("/board")
                  : pathname === link.href;
                return (
                  <Link key={link.href} href={link.href}
                    className={`relative text-xs xl:text-sm font-semibold px-2 py-1 rounded-md whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-brand-400 [transition:color_150ms,opacity_150ms] ${linkColor} ${
                      isActive ? "opacity-100" : "opacity-55 hover:opacity-90"
                    } after:absolute after:left-2 after:right-2 after:-bottom-0.5 after:h-0.5 after:rounded after:origin-left after:[transition:transform_250ms_cubic-bezier(.16,1,.3,1)] ${
                      isHome && !scrolled ? "after:bg-brand-300" : "after:bg-brand-500"
                    } ${isActive ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"}`}>
                    {link.label}
                  </Link>
                );
              })}
              {/* 관련 사이트 드롭다운 */}
              <div className="relative group">
                <button type="button" aria-haspopup="menu"
                  className={`flex items-center gap-0.5 text-xs xl:text-sm font-semibold px-2 py-1 rounded-md whitespace-nowrap opacity-55 outline-none [transition:opacity_150ms] group-hover:opacity-90 group-focus-within:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-400 ${linkColor}`}>
                  관련 사이트 <ChevronDown size={13} aria-hidden="true" />
                </button>
                <div role="menu"
                  className="invisible absolute left-1/2 top-full z-10 w-60 -translate-x-1/2 pt-2 opacity-0 [transition:opacity_150ms,visibility_150ms] group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-[0_20px_50px_-20px_rgba(10,22,38,.4)]">
                    {RELATED_SITES.map((s) => (
                      <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" role="menuitem"
                        className="flex items-start justify-between gap-2 rounded-xl px-3 py-2.5 hover:bg-neutral-50">
                        <span><span className="block text-sm font-bold text-neutral-900">{s.label}</span><span className="block text-xs text-neutral-500">{s.desc}</span></span>
                        <ExternalLink size={13} className="mt-1 flex-none text-neutral-400" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            {/* 인증 영역 — lg 이상에서만 표시 / min-w 고정으로 auth 로드 시 nav 밀림 방지 */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0 min-w-[220px] justify-end">
              {user === undefined ? null : user ? (
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
                <div className={`flex items-center gap-2 [transition:opacity_250ms,translate_300ms,visibility_250ms] ${heroTopHidden}`}>
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
                </div>
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
                    (link.href === "/board/free" ? pathname.startsWith("/board") : pathname === link.href)
                      ? "text-brand-700 bg-brand-50"
                      : "text-neutral-600 opacity-70 hover:bg-neutral-50 hover:text-brand-600 hover:opacity-100"
                  }`}>
                  {link.label}
                </Link>
              ))}
              <hr className="border-neutral-100 my-2" />
              <p className="px-3 pb-1 text-[11px] font-bold tracking-[.08em] text-neutral-400">관련 사이트</p>
              {RELATED_SITES.map((s) => (
                <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 hover:text-brand-600">
                  <span>{s.label} <span className="ml-1 text-xs font-normal text-neutral-400">{s.desc}</span></span>
                  <ExternalLink size={13} className="flex-none text-neutral-400" aria-hidden="true" />
                </a>
              ))}
              <hr className="border-neutral-100 my-2" />
              {user === undefined ? null : user ? (
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
