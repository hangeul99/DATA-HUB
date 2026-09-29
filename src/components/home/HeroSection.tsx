"use client";

/* ============================================================
   HeroSection — 홈 최상단 (시안 v3)

   구성: 다크 네이비→틸 그라디언트 + 도트 그리드(마우스 패럴랙스)
         + 빛줄기 + 궤도 링 + 필름 그레인 위에
         로고 → 센터명 → 뱃지 → 타이틀 → 설명 → 검색 → 카테고리 칩

   ★ 문구 수정: 아래 JSX의 텍스트를 바로 고치면 됩니다.
   ★ 카테고리 칩: CHIPS 배열 (label = 화면 표시, category = 데이터셋 목록 필터 값)
============================================================ */

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { handleSpotlightMove, prefersReducedMotion } from "./motion";

// 히어로 아래 카테고리 칩 — category 값은 /datasets 필터 이름과 정확히 같아야 함
const CHIPS = [
  { label: "통계/공공 데이터", category: "통계/공공 데이터" },
  { label: "연구/학술", category: "연구/학술 데이터" },
  { label: "금융/경제", category: "금융/경제 데이터" },
  { label: "지역/업체", category: "지역/업체 데이터" },
];

// 타이틀 어절 — 순서대로 흐림→선명 애니메이션 (accent = 틸 강조색)
const TITLE_LINES: { w: string; accent?: boolean }[][] = [
  [{ w: "데이터로" }, { w: "여는" }],
  [{ w: "지역", accent: true }, { w: "혁신의", accent: true }, { w: "시대", accent: true }],
];

export default function HeroSection() {
  const router = useRouter();
  const dotsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  // ── "/" 키를 누르면 검색창으로 이동 (입력 중일 때는 무시) ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (e.key !== "/" || tag === "input" || tag === "textarea") return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── 도트 그리드 마우스 패럴랙스 (state 대신 CSS 변수 → 리렌더 없음) ──
  const onHeroMove = (e: MouseEvent<HTMLElement>) => {
    const dots = dotsRef.current;
    if (!dots || prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    dots.style.setProperty("--px", `${x * -18}px`);
    dots.style.setProperty("--py", `${y * -18}px`);
  };
  const onHeroLeave = () => {
    dotsRef.current?.style.setProperty("--px", "0px");
    dotsRef.current?.style.setProperty("--py", "0px");
  };

  // ── 검색 제출 → 데이터셋 목록으로 검색어 전달 ──
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/datasets?q=${encodeURIComponent(q)}` : "/datasets");
  };

  let wordIndex = 0; // 어절 순번 → 애니메이션 지연 시간 계산용

  return (
    <section
      onMouseMove={onHeroMove}
      onMouseLeave={onHeroLeave}
      className="relative overflow-hidden flex items-center justify-center text-center pt-32 pb-40 md:pt-36 md:pb-44 bg-gradient-to-br from-navy-900 via-brand-800 to-brand-600"
    >
      {/* ── 배경 레이어 (장식이라 스크린리더에서 숨김) ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div ref={dotsRef} className="hero-dots absolute -inset-20 opacity-20" />
        <div className="hero-beam absolute inset-0" />
        <div className="absolute left-1/2 top-[40%] w-[960px] h-[680px] -translate-x-1/2 -translate-y-1/2 blur-[30px] bg-[radial-gradient(closest-side,rgba(13,115,119,.38),transparent)]" />
        <div className="hero-ring absolute left-1/2 top-[41%] w-[520px] h-[520px] -translate-x-1/2 -translate-y-1/2" />
        <div className="hero-ring absolute left-1/2 top-[41%] w-[760px] h-[760px] -translate-x-1/2 -translate-y-1/2 border-white/[.045] [animation-duration:22s] [animation-direction:reverse]" />
        <div className="hero-grain absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-navy-900/35" />
      </div>

      {/* ── 콘텐츠 ── */}
      <div className="relative z-10 max-w-4xl mx-auto px-6">
        {/* 글로컬 로고 */}
        <div className="pop-in relative mx-auto mb-4 w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 drop-shadow-[0_24px_44px_rgba(0,0,0,.5)]" style={{ "--d": ".05s" } as React.CSSProperties}>
          <Image src="/logo.png" alt="인제대학교 글로컬대학 로고" fill
            sizes="(max-width:640px) 128px,(max-width:768px) 160px,192px"
            style={{ objectFit: "contain" }} priority draggable={false} />
        </div>
        <p className="fade-up text-white text-2xl sm:text-3xl font-black tracking-tight" style={{ "--d": ".2s" } as React.CSSProperties}>
          데이터거버넌스센터
        </p>

        <div className="fade-up w-14 h-px bg-white/20 mx-auto my-7" style={{ "--d": ".3s" } as React.CSSProperties} />

        {/* 기관 뱃지 */}
        <div className="fade-up inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full bg-white/[.06] border border-white/[.12] font-mono text-[11px] sm:text-xs tracking-[.08em] text-brand-200" style={{ "--d": ".32s" } as React.CSSProperties}>
          <i className="pulse-dot w-1.5 h-1.5 rounded-full bg-brand-300" />
          {/* 모바일에서는 한 줄에 들어가도록 뒷부분 생략 */}
          INJE UNIVERSITY · GLOCAL 30<span className="hidden sm:inline"> · DATA PLATFORM</span>
        </div>

        {/* 메인 타이틀 — 어절 단위 스태거 */}
        <h1 className="text-white text-[40px] sm:text-5xl md:text-6xl lg:text-[68px] font-black leading-[1.1] tracking-[-.035em] text-balance">
          {TITLE_LINES.map((line, li) => (
            <span key={li} className="block">
              {line.map((part) => {
                const delay = 0.38 + wordIndex++ * 0.1;
                return (
                  <span key={part.w}>
                    <span className={`word-in ${part.accent ? "text-brand-300" : ""}`} style={{ "--d": `${delay}s` } as React.CSSProperties}>
                      {part.w}
                    </span>{" "}
                  </span>
                );
              })}
            </span>
          ))}
        </h1>

        <p className="fade-up mt-5 sm:mt-6 text-[15px] sm:text-[17px] text-white/65 max-w-xl mx-auto leading-relaxed" style={{ "--d": ".9s" } as React.CSSProperties}>
          {/* 모바일에서 줄바꿈이 사라질 때 문장이 붙지 않도록 공백 추가 */}
          연구자·기업·지자체·일반인 모두를 위한 인제대학교 데이터 플랫폼.{" "}
          <br className="hidden md:block" />
          통계·공공·연구·금융 데이터를 한 곳에서 탐색하고 신청하세요.
        </p>

        {/* 검색 — 제출 시 /datasets?q=검색어 로 이동 */}
        <form onSubmit={onSearch} role="search" className="fade-up mt-9 flex flex-col sm:flex-row gap-2.5 max-w-[660px] mx-auto" style={{ "--d": "1.05s" } as React.CSSProperties}>
          <label htmlFor="hero-search" className="flex-1 flex items-center gap-2.5 bg-white/[.97] rounded-[14px] px-4 shadow-[0_14px_44px_-12px_rgba(0,0,0,.55)] transition-shadow focus-within:shadow-[0_0_0_3px_rgba(79,175,175,.55),0_14px_44px_-12px_rgba(0,0,0,.55)]">
            <Search size={17} className="flex-none text-neutral-400" aria-hidden="true" />
            <input
              ref={inputRef}
              id="hero-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="데이터 검색 (예: 인구통계, 주가, 논문...)"
              className="flex-1 min-w-0 bg-transparent py-4 text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
            />
            <kbd className="hidden sm:inline font-mono text-[11px] text-neutral-400 border border-neutral-200 rounded-md px-1.5 py-0.5 bg-neutral-50">/</kbd>
          </label>
          <button type="submit"
            className="group relative overflow-hidden flex-none flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-bold text-sm px-6 py-4 rounded-[14px] shadow-[0_14px_40px_-8px_rgba(13,115,119,.6)] [transition:background-color_150ms,transform_150ms] active:scale-[.97] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
            {/* hover 시 버튼 위로 광택이 한 번 스침 */}
            <span aria-hidden="true" className="absolute inset-0 -translate-x-[120%] group-hover:translate-x-[120%] transition-transform duration-600 ease-[cubic-bezier(.16,1,.3,1)] bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,.28)_50%,transparent_70%)]" />
            <span className="relative">탐색하기</span>
            <ArrowRight size={15} className="relative" />
          </button>
        </form>

        {/* 카테고리 칩 */}
        <div className="fade-up mt-4 flex flex-wrap justify-center gap-2" style={{ "--d": "1.2s" } as React.CSSProperties}>
          {CHIPS.map((chip) => (
            <Link
              key={chip.label}
              href={`/datasets?category=${encodeURIComponent(chip.category)}`}
              onMouseMove={handleSpotlightMove}
              className="spotlight spotlight-light text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white/[.08] border border-white/[.14] text-white/70 hover:text-white hover:border-white/40 [transition:color_150ms,border-color_150ms]"
            >
              <span className="relative">{chip.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 스크롤 안내 */}
      <div aria-hidden="true" className="absolute bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1.5 font-mono text-[10px] tracking-[.25em] text-white/40">
        SCROLL
        <span className="scroll-cue block w-px h-7 bg-gradient-to-b from-white/50 to-transparent" />
      </div>
    </section>
  );
}
