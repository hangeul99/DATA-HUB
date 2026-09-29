"use client";

/* ============================================================
   CategorySection — 애플식 분야 타일 2×2 (시안 v7)

   밝은 타일과 어두운 타일이 대각선으로 번갈아 놓이고,
   각 타일의 그림(막대·산점도·추세선·점 지도)은 화면에 들어올 때 한 번 그려집니다.
   - 개수는 Supabase에서 실시간 집계
   ★ 문구 수정: TILES 배열
============================================================ */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useInViewOnce, useReveal } from "./motion";

/** 고정 난수 — 서버·브라우저에서 같은 값이 나와야 화면이 어긋나지 않음 */
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

/* ── 타일 그림들 (장식이라 스크린리더에서 숨김) ── */
function BarsViz() {
  const bars = [[16, 120], [84, 92], [152, 140], [220, 74], [288, 104], [356, 56]];
  return (
    <svg viewBox="0 0 500 230" fill="none" aria-hidden="true" className="block w-full h-auto overflow-visible">
      <g fill="#C5CDD6">
        {bars.map(([x, y], i) => (
          <rect key={x} className="viz-bar" style={{ "--i": i } as React.CSSProperties} x={x} y={y} width="46" height={230 - y} rx="10" />
        ))}
      </g>
      <rect className="viz-bar" style={{ "--i": 6 } as React.CSSProperties} x="424" y="22" width="46" height="208" rx="10" fill="#0D7377" />
    </svg>
  );
}

function ScatterViz() {
  const pts = useMemo(() => {
    const rnd = seeded(11);
    return Array.from({ length: 44 }, () => {
      const x = 24 + rnd() * 452;
      const y = Math.max(26, Math.min(214, 205 - (x - 20) * (170 / 460) + (rnd() - 0.5) * 64));
      return { x, y, r: 3 + rnd() * 4, o: 0.45 + rnd() * 0.55 };
    });
  }, []);
  return (
    <svg viewBox="0 0 500 230" fill="none" aria-hidden="true" className="block w-full h-auto overflow-visible">
      <g stroke="rgba(255,255,255,.08)"><path d="M10 210H490M10 150H490M10 90H490M10 30H490" /></g>
      <path className="viz-draw" style={{ "--len": 500 } as React.CSSProperties} d="M20 205 L480 35" stroke="#4FAFAF" strokeWidth="2" strokeDasharray="6 6" />
      <g fill="#8FD3D3">
        {pts.map((p, i) => (
          <circle key={i} className="viz-pt" style={{ "--i": i, "--o": p.o.toFixed(2) } as React.CSSProperties} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.r.toFixed(1)} />
        ))}
      </g>
    </svg>
  );
}

function LineViz() {
  const d = "M0 182 L38 170 L76 176 L114 144 L152 152 L190 116 L228 128 L266 92 L304 100 L342 68 L380 80 L418 42 L456 50 L500 22";
  return (
    <svg viewBox="0 0 500 230" fill="none" aria-hidden="true" className="block w-full h-auto overflow-visible">
      <defs>
        <linearGradient id="cat-line-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#4FAFAF" stopOpacity=".38" /><stop offset="1" stopColor="#4FAFAF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="viz-area" d={`${d} V230 H0Z`} fill="url(#cat-line-fill)" />
      <path className="viz-draw" style={{ "--len": 720 } as React.CSSProperties} d={d} stroke="#8FD3D3" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** 점 지도 — 김해 권역을 닮은 덩어리, 밀집 지점은 틸로 강조 */
export function DotMap({ w, h, step, hot, base }: { w: number; h: number; step: number; hot: [number, number][]; base: string }) {
  const dots = useMemo(() => {
    const out: { x: number; y: number; r: number; hot: boolean; o: number }[] = [];
    const cx = w * 0.52, cy = h * 0.55;
    for (let y = step; y < h; y += step) {
      for (let x = step; x < w; x += step) {
        const dx = (x - cx) / (w * 0.42), dy = (y - cy) / (h * 0.46);
        const wob = Math.sin(x * 0.045) * 0.12 + Math.cos(y * 0.06) * 0.1;
        if (dx * dx + dy * dy > 1 + wob) continue;
        const d = Math.min(...hot.map(([hx, hy]) => Math.hypot(x - hx, y - hy)));
        const near = Math.max(0, 1 - d / (step * 4.5));
        const isHot = near > 0.15;
        out.push({ x, y, r: step * 0.22 + near * step * 0.2, hot: isHot, o: isHot ? 0.55 + near * 0.45 : 1 });
      }
    }
    return out;
  }, [w, h, step, hot]);
  return (
    // 점이 수백 개라 점마다 애니메이션하면 무거움 → 묶음(viz-group) 전체를 한 번에 나타나게
    <svg viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true" className="viz-group block w-full h-auto overflow-visible">
      {dots.map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={p.r.toFixed(1)} fill={p.hot ? "#0D7377" : base} opacity={p.o.toFixed(2)} />
      ))}
    </svg>
  );
}

const MAP_HOT: [number, number][] = [[240, 125], [320, 95], [180, 165]];

const TILES: { category: string; title: string; desc: string; dark: boolean; viz: ReactNode }[] = [
  { category: "통계/공공 데이터", title: "숫자로 보는 우리 지역", desc: "인구, 교통, 행정까지 공공기관이 만든 공신력 있는 통계.", dark: false, viz: <BarsViz /> },
  { category: "연구/학술 데이터", title: "연구의 다음 단계를 위한 원자료", desc: "논문과 실험에서 나온 검증된 데이터로 바로 분석을 시작하세요.", dark: true, viz: <ScatterViz /> },
  { category: "금융/경제 데이터", title: "시장의 흐름을 한눈에", desc: "주가, 경제지표, 기업 재무 정보를 일 단위로 제공합니다.", dark: true, viz: <LineViz /> },
  { category: "지역/업체 데이터", title: "김해의 거리를 데이터로", desc: "상권, 업체, 시설의 위치를 지도 위에서 확인하세요.", dark: false, viz: <DotMap w={500} h={230} step={14} hot={MAP_HOT} base="#C5CDD6" /> },
];

function Tile({ tile, count, index }: { tile: (typeof TILES)[0]; count: number; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const seen = useInViewOnce(ref, 0.35); // 화면에 들어오면 그림을 그림
  const short = tile.category.replace(" 데이터", "");
  return (
    <div className="reveal" style={{ "--i": index % 2 } as React.CSSProperties}>
      <Link
        ref={ref}
        href={`/datasets?category=${encodeURIComponent(tile.category)}`}
        className={`group relative flex h-full min-h-[540px] lg:min-h-[600px] flex-col items-center overflow-hidden rounded-3xl px-6 pt-11 sm:px-9 sm:pt-14 text-center ${seen ? "seen" : ""} ${
          tile.dark ? "bg-[linear-gradient(180deg,#0E253C,#071220)] text-white" : "bg-[#F3F5F7] text-neutral-900"
        }`}
      >
        <span className={`text-[15px] font-bold ${tile.dark ? "text-[#8FD3D3]" : "text-brand-600"}`}>
          {short}{count > 0 ? ` · ${count.toLocaleString()}개` : ""}
        </span>
        <h3 className="mt-2 text-[28px] sm:text-[34px] lg:text-[40px] font-extrabold leading-[1.22] tracking-[-.035em] text-balance">{tile.title}</h3>
        <p className={`mt-3 max-w-[22em] text-base sm:text-[17px] leading-relaxed ${tile.dark ? "text-white/80" : "text-neutral-600"}`}>{tile.desc}</p>
        <span className={`press mt-6 inline-flex h-11 items-center rounded-full px-5 text-[15px] font-bold ${
          tile.dark ? "bg-[#4FAFAF] text-[#04282A] group-hover:bg-[#8FD3D3]" : "bg-brand-500 text-white group-hover:bg-brand-600"
        }`}>
          데이터 보기
        </span>
        <div className="mt-auto w-full max-w-[500px] pt-9">{tile.viz}</div>
      </Link>
    </div>
  );
}

export default function CategorySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  useReveal(sectionRef);

  // ── 카테고리별 데이터셋 개수 (category 컬럼만 가져와 집계) ──
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("datasets")
      .select("category")
      .eq("is_active", true)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const c: Record<string, number> = {};
        for (const d of data) c[d.category] = (c[d.category] ?? 0) + 1;
        setCounts(c);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <section ref={sectionRef} aria-label="데이터 분야" className="pt-4 pb-28">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-4 px-4 md:grid-cols-2">
        {TILES.map((t, i) => <Tile key={t.category} tile={t} count={counts[t.category] ?? 0} index={i} />)}
      </div>
    </section>
  );
}
