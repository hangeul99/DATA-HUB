"use client";

/* ============================================================
   HeroSection — 홈 최상단 (시안 v9 "김해를 데이터로 읽는 곳")

   왼쪽: 센터명 → 제목(명조) → 설명 → 검색 → 공개 통계 4개
   오른쪽: 김해 점지도 + 숫자 카드 + 데이터 선택 칩 (GimhaeDotMap)
   배경: 짙은 남색 + 반짝이는 별(캔버스, 한 번만 그림) + 아래쪽 앰버 빛

   ★ 문구 수정: 아래 JSX 텍스트를 바로 고치면 됩니다.
   ★ 통계 숫자: useHubStats (실제 등록 데이터에서 자동 계산)
============================================================ */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import GimhaeDotMap from "./GimhaeDotMap";
import { useHubStats } from "./useHubStats";

/**
 * 별 캔버스 3장 — 별을 3묶음으로 나눠 각 캔버스에 "한 번만" 그림.
 * 반짝임은 CSS가 캔버스 투명도만 바꿔서 처리 (매 프레임 다시 그리지 않아 가벼움)
 */
function useStarfield(layersRef: React.RefObject<(HTMLCanvasElement | null)[]>) {
  useEffect(() => {
    const canvases = (layersRef.current ?? []).filter(Boolean) as HTMLCanvasElement[];
    if (canvases.length === 0) return;
    const paint = () => {
      const r = canvases[0].getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = r.width, H = r.height;
      const ctxs = canvases.map((cv) => {
        cv.width = W * dpr; cv.height = H * dpr;
        const ctx = cv.getContext("2d")!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        return ctx;
      });
      let seed = 5; // 고정 난수 → 새로고침해도 같은 하늘
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      const n = Math.round((W * H) / 5200);
      for (let i = 0; i < n; i++) {
        const big = rnd() < 0.08;
        const x = rnd() * W, y = rnd() * H * 0.9;
        const rad = big ? 1.1 + rnd() * 0.9 : 0.35 + rnd() * 0.7;
        const alpha = 0.3 + rnd() * 0.55;
        const ctx = ctxs[Math.floor(rnd() * ctxs.length)];
        ctx.fillStyle = rnd() < 0.07 ? "#F6E3A6" : "#FFFFFF"; // 일부 별은 앰버 빛
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
        if (big) { ctx.globalAlpha = alpha * 0.25; ctx.beginPath(); ctx.arc(x, y, rad * 3.2, 0, Math.PI * 2); ctx.fill(); }
      }
      ctxs.forEach((c) => { c.globalAlpha = 1; });
    };
    paint();
    let timer: ReturnType<typeof setTimeout>;
    let lastW = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastW) return; // 모바일 주소창 높이 변화로는 다시 그리지 않음
      lastW = window.innerWidth;
      clearTimeout(timer); timer = setTimeout(paint, 200);
    };
    window.addEventListener("resize", onResize);
    return () => { clearTimeout(timer); window.removeEventListener("resize", onResize); };
  }, [layersRef]);
}

const STAR_LAYERS = [{ tw: "3.2s", delay: "0s" }, { tw: "4.6s", delay: "-1.5s" }, { tw: "6s", delay: "-3s" }];

/** 통계 한 칸 — 숫자 + 단위 + 설명 */
function Fact({ value, unit, label, index }: { value: string; unit?: string; label: string; index: number }) {
  return (
    <li className="enter flex flex-col gap-1" style={{ "--i": index } as React.CSSProperties}>
      <b className="text-[26px] font-extrabold leading-none tracking-[-.02em] tabular-nums sm:text-3xl">
        {value}{unit && <small className="ml-0.5 text-base font-bold text-accent-300">{unit}</small>}
      </b>
      <span className="text-[13px] text-[#9AAFC2]">{label}</span>
    </li>
  );
}

export default function HeroSection() {
  const router = useRouter();
  const starsRef = useRef<(HTMLCanvasElement | null)[]>([]);
  const [query, setQuery] = useState("");
  const stats = useHubStats();
  useStarfield(starsRef);

  // 검색 제출 → 데이터 탐색으로 검색어 전달
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/datasets?q=${encodeURIComponent(q)}` : "/datasets");
  };

  const n = (v: number) => (stats.loaded ? v.toLocaleString() : "–");
  const latest = stats.latest ? `${Number(stats.latest.slice(5, 7))}.${Number(stats.latest.slice(8, 10))}` : "–";

  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden text-white bg-[radial-gradient(90%_60%_at_50%_115%,rgba(212,160,50,.22),transparent_62%),linear-gradient(180deg,#05080F_0%,#08101D_55%,#0A1626_100%)]"
    >
      {/* 배경: 별 (장식) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {STAR_LAYERS.map((l, i) => (
          <canvas key={i} ref={(el) => { starsRef.current[i] = el; }}
            className="star-layer absolute inset-0 h-full w-full"
            style={{ "--tw": l.tw, animationDelay: l.delay } as React.CSSProperties} />
        ))}
        <div className="hero-grain absolute inset-0" />
      </div>

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-4 pb-16 pt-28 sm:px-6 md:pt-32 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:gap-14 lg:pb-24">
        {/* ── 왼쪽: 글 ── */}
        <div>
          <p className="enter inline-flex items-center gap-2 text-[13px] font-bold tracking-[.06em] text-accent-300" style={{ "--i": 0 } as React.CSSProperties}>
            <i aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent-400" />인제대학교 데이터거버넌스센터
          </p>
          <h1 id="hero-title" className="enter mt-4 font-[family-name:var(--font-hahmlet)] text-[40px] font-bold leading-[1.14] tracking-[-.02em] text-balance sm:text-[54px] lg:text-[72px]" style={{ "--i": 1 } as React.CSSProperties}>
            김해를<br />데이터로 <em className="not-italic text-accent-300">읽는</em> 곳
          </h1>
          <p className="enter mt-5 max-w-[34em] text-[17px] leading-[1.75] text-[#9AAFC2]" style={{ "--i": 2 } as React.CSSProperties}>
            산업단지부터 상권, 유동인구, 학교까지. 센터가 모으고 개인정보를 걸러낸 지역 데이터를 찾아 신청하고, 받은 파일은 여기서 바로 분석해 보세요.
          </p>

          {/* 검색 — 제출 시 /datasets?q=검색어 로 이동 */}
          <form onSubmit={onSearch} role="search"
            className="enter mt-8 flex h-[58px] max-w-[560px] items-center gap-2 rounded-full bg-white pl-[18px] pr-1.5 shadow-[0_20px_50px_-24px_rgba(0,0,0,.6)] transition-shadow focus-within:shadow-[0_0_0_4px_rgba(228,184,78,.45),0_20px_50px_-24px_rgba(0,0,0,.6)]"
            style={{ "--i": 3 } as React.CSSProperties}>
            <Search size={18} className="flex-none text-neutral-500" aria-hidden="true" />
            <label htmlFor="hero-search" className="sr-only">데이터 검색</label>
            <input id="hero-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 김해 제조업체 종업원 수"
              className="h-full min-w-0 flex-1 bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-500" />
            <button type="submit" className="press h-[46px] flex-none rounded-full bg-accent-400 px-5 font-bold text-navy-900 hover:bg-accent-300">검색</button>
          </form>

          {/* 공개 통계 4개 (실제 등록 데이터에서 계산) */}
          <ul aria-label="데이터허브 현황" className="mt-8 flex flex-wrap gap-x-9 gap-y-4">
            <Fact index={4} value={n(stats.datasets)} unit="건" label="공개 데이터셋" />
            <Fact index={4} value={n(stats.orgs)} unit="곳" label="제공 기관" />
            <Fact index={5} value="4" unit="개" label="데이터 분야" />
            <Fact index={5} value={latest} label={stats.latest ? `최신 기준일 · ${stats.latest.slice(0, 4)}년` : "최신 기준일"} />
          </ul>
        </div>

        {/* ── 오른쪽: 김해 점지도 ── */}
        <GimhaeDotMap />
      </div>
    </section>
  );
}
