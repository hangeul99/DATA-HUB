"use client";

/* ============================================================
   HeroSection — 홈 최상단 (시안 v7 "우주" 히어로)

   배경: 네이비→틸 그라디언트 위에
         반짝이는 별(캔버스) + 도트 무늬(마우스 스프링 패럴랙스)
         + 궤도 링 3개 + 행성 지평선 + 필름 그레인
   내용: 로고 → 센터명 → 타이틀 → 설명 → 검색 (글 요소 4개로 제한)

   ★ 문구 수정: 아래 JSX 텍스트를 바로 고치면 됩니다.
============================================================ */

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { prefersReducedMotion } from "./motion";

// 타이틀 어절 — 순서대로 흐림→선명 (accent = 밝은 틸)
const TITLE_LINES: { w: string; accent?: boolean }[][] = [
  [{ w: "데이터로" }, { w: "여는" }],
  [{ w: "지역", accent: true }, { w: "혁신의", accent: true }, { w: "시대", accent: true }],
];

/** 별 캔버스 — 크기·밝기가 다른 별이 천천히 반짝임. 화면 밖이면 멈춤 */
function useStarfield(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = prefersReducedMotion();

    type Star = { x: number; y: number; r: number; b: number; sp: number; ph: number; teal: boolean };
    let stars: Star[] = [];
    let W = 0, H = 0, raf = 0, running = false;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        const a = s.b * (reduce ? 1 : 0.55 + 0.45 * Math.sin((t / 1000) * s.sp + s.ph));
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = s.teal ? "#8FD3D3" : "#FFFFFF";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        if (s.r > 1.2) { // 큰 별은 은은하게 번짐
          ctx.globalAlpha = a * 0.25;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    // 캔버스 크기를 맞추고 별 배치 (고정 난수 → 새로고침해도 같은 하늘)
    const setup = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      let seed = 5;
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      const n = Math.round((W * H) / 4800);
      stars = Array.from({ length: n }, () => {
        const big = rnd() < 0.08;
        return {
          x: rnd() * W, y: rnd() * H * 0.92,
          r: big ? 1.1 + rnd() * 0.9 : 0.35 + rnd() * 0.7,
          b: 0.35 + rnd() * 0.6, sp: 0.4 + rnd() * 1.4, ph: rnd() * 6.28, teal: rnd() < 0.18,
        };
      });
      draw(0);
    };

    const loop = (t: number) => { draw(t); if (running) raf = requestAnimationFrame(loop); };

    setup();
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(setup, 150); };
    window.addEventListener("resize", onResize);

    // 화면에 보일 때만 애니메이션 (배터리 절약)
    const io = new IntersectionObserver(([e]) => {
      if (reduce) return;
      if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(loop); }
      else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
    });
    io.observe(cv);

    return () => {
      running = false; cancelAnimationFrame(raf); clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize); io.disconnect();
    };
  }, [canvasRef]);
}

export default function HeroSection() {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const starsRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");

  useStarfield(starsRef);

  // ── 도트 무늬: 마우스를 스프링처럼 살짝 늦게 따라감 (transform 직접 변경 → 리렌더 없음) ──
  useEffect(() => {
    const hero = sectionRef.current, dots = dotsRef.current;
    if (!hero || !dots || prefersReducedMotion()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const step = () => {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      dots.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      raf = Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * -22;
      ty = ((e.clientY - r.top) / r.height - 0.5) * -22;
      kick();
    };
    const onLeave = () => { tx = 0; ty = 0; kick(); };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // ── 검색 제출 → 데이터셋 목록으로 검색어 전달 ──
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/datasets?q=${encodeURIComponent(q)}` : "/datasets");
  };

  let wordIndex = 2; // 로고(0)·센터명(1) 다음부터 어절 순번

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden flex items-center justify-center text-center text-white min-h-[min(940px,100svh)] pt-28 pb-36 md:pt-32 md:pb-40 bg-[linear-gradient(135deg,#071220_0%,#063A3C_58%,#0B6063_100%)]"
    >
      {/* ── 배경 레이어 (장식) ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <canvas ref={starsRef} className="absolute inset-0 w-full h-full" />
        <div ref={dotsRef} className="hero-dots absolute -inset-20 opacity-20" />
        <div className="absolute left-1/2 top-[42%] w-[960px] h-[680px] -translate-x-1/2 -translate-y-1/2 blur-[30px] bg-[radial-gradient(closest-side,rgba(13,115,119,.42),transparent)]" />
        <div className="hero-ring absolute left-1/2 top-[44%] w-[560px] h-[560px] -ml-[280px] -mt-[280px]" />
        <div className="hero-ring hero-ring-2 absolute left-1/2 top-[44%] w-[820px] h-[820px] -ml-[410px] -mt-[410px]" />
        <div className="hero-ring hero-ring-3 absolute left-1/2 top-[44%] w-[1120px] h-[1120px] -ml-[560px] -mt-[560px]" />
        <div className="hero-horizon absolute left-1/2 bottom-0 w-[170%] h-[340px] -translate-x-1/2 translate-y-[62%]" />
        <div className="hero-grain absolute inset-0" />
      </div>

      {/* ── 콘텐츠 ── */}
      <div className="relative max-w-[860px] px-6">
        <Image
          src="/logo.png" alt="인제대학교 글로컬대학 로고" width={176} height={240} priority draggable={false}
          className="enter mx-auto mb-3.5 w-[120px] sm:w-[150px] lg:w-[176px] h-auto drop-shadow-[0_20px_40px_rgba(0,0,0,.45)]"
          style={{ "--i": 0 } as React.CSSProperties}
        />
        <p className="enter text-xl sm:text-2xl lg:text-[26px] font-extrabold tracking-[-.02em] text-white/90" style={{ "--i": 1 } as React.CSSProperties}>
          데이터거버넌스센터
        </p>

        <h1 className="mt-9 text-[40px] sm:text-6xl lg:text-[76px] font-extrabold leading-[1.12] tracking-[-.045em] text-balance">
          {TITLE_LINES.map((line, li) => (
            <span key={li} className="block">
              {line.map((part) => (
                <span key={part.w}>
                  <span className={`enter inline-block ${part.accent ? "text-[#8FD3D3]" : ""}`} style={{ "--i": wordIndex++ } as React.CSSProperties}>
                    {part.w}
                  </span>{" "}
                </span>
              ))}
            </span>
          ))}
        </h1>

        <p className="enter mt-5 mx-auto max-w-[30em] text-[17px] sm:text-lg lg:text-xl leading-relaxed text-white/80" style={{ "--i": 8 } as React.CSSProperties}>
          통계, 공공, 연구, 금융 데이터를 한 곳에서 찾고 신청하세요.
        </p>

        {/* 검색 — 제출 시 /datasets?q=검색어 로 이동 */}
        <form onSubmit={onSearch} role="search"
          className="enter mt-10 mx-auto max-w-[580px] flex items-center gap-2 h-[58px] sm:h-16 pl-5 sm:pl-6 pr-2 rounded-full bg-white shadow-[0_18px_50px_-14px_rgba(0,0,0,.55)] transition-shadow focus-within:shadow-[0_0_0_4px_rgba(79,175,175,.45),0_18px_50px_-14px_rgba(0,0,0,.55)]"
          style={{ "--i": 9 } as React.CSSProperties}>
          <Search size={20} className="flex-none text-neutral-500" aria-hidden="true" />
          <label htmlFor="hero-search" className="sr-only">데이터 검색</label>
          <input
            id="hero-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="어떤 데이터를 찾으세요?"
            className="flex-1 min-w-0 h-full bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-500"
          />
          <button type="submit" className="press flex-none h-11 sm:h-12 px-4 sm:px-6 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold">
            검색
          </button>
        </form>
      </div>

      {/* 스크롤 안내 선 */}
      <span aria-hidden="true" className="hero-cue hidden sm:block absolute left-1/2 bottom-28 w-px h-9 bg-gradient-to-b from-white/55 to-transparent" />
    </section>
  );
}
