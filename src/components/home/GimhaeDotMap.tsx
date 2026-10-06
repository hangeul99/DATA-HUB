"use client";

/* ============================================================
   GimhaeDotMap — 히어로 오른쪽 "김해 점지도"

   김해시 외곽선(근사) 안에 점을 깔고, 선택한 데이터의 분포를 청록으로 강조합니다.
   아래 칩을 누르면 강조 영역과 흰 숫자 카드가 바뀝니다.
   점 위치는 분포를 나타내는 예시입니다 (실제 좌표 데이터가 연결되면 그대로 찍도록 교체).

   ★ 숫자·문구 수정: FOCUS 배열 (등록 데이터 설명의 수치와 맞춰 주세요)
============================================================ */

import { useEffect, useRef, useState } from "react";

// 김해시 외곽선 근사 (0~1 정규화 좌표, 위가 북쪽) — 북서쪽이 넓고 남동쪽으로 좁아지는 모양
const OUTLINE: [number, number][] = [[.22,.08],[.40,.04],[.56,.08],[.70,.16],[.80,.27],[.90,.40],[.94,.55],[.86,.70],[.78,.84],[.62,.95],[.46,.92],[.34,.86],[.24,.74],[.12,.62],[.06,.46],[.08,.30],[.12,.18]];

interface Focus { chip: string; label: string; value: string; unit: string; source: string; spots: [number, number, number][] }
const FOCUS: Focus[] = [
  { chip: "제조업체", label: "김해시 등록 제조업체", value: "10,086", unit: "곳", source: "2024.10.1 기준 · 경상남도 김해시", spots: [[.40,.56,.17],[.62,.70,.12],[.30,.30,.10]] },
  { chip: "산업단지 입주업체", label: "산업단지 입주업체", value: "1,465", unit: "곳", source: "2026.8.18 기준 · 한국산업단지공단", spots: [[.70,.64,.11],[.36,.40,.09],[.52,.82,.08]] },
  { chip: "산업단지·농공단지", label: "산업단지·농공단지", value: "25", unit: "곳", source: "2026.8.18 기준 · 경상남도 김해시", spots: [[.72,.62,.07],[.34,.38,.06],[.52,.82,.05],[.24,.64,.05]] },
];

// 점이 외곽선 안에 있는지 (홀짝 규칙)
function inside(x: number, y: number) {
  let c = false;
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const [xi, yi] = OUTLINE[i], [xj, yj] = OUTLINE[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export default function GimhaeDotMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [focus, setFocus] = useState(0);
  const f = FOCUS[focus];

  // 캔버스는 선택이 바뀌거나 크기가 바뀔 때만 다시 그림 (매 프레임 그리지 않음)
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      cv.width = w * dpr; cv.height = h * dpr;
      const g = cv.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      const step = w / 26;
      for (let gy = step / 2; gy < h; gy += step) for (let gx = step / 2; gx < w; gx += step) {
        const nx = gx / w, ny = gy / h;
        if (!inside(nx, ny)) continue;
        let hit = 0;
        for (const [cx, cy, rad] of f.spots) { const d = Math.hypot(nx - cx, (ny - cy) * .92); if (d < rad) hit = Math.max(hit, 1 - d / rad); }
        g.beginPath();
        if (hit > 0) { g.fillStyle = `rgba(228,184,78,${.45 + hit * .55})`; g.arc(gx, gy, step * (.17 + hit * .12), 0, Math.PI * 2); }
        else { g.fillStyle = "rgba(255,255,255,.16)"; g.arc(gx, gy, step * .13, 0, Math.PI * 2); }
        g.fill();
      }
      for (const [cx, cy, rad] of f.spots) { g.beginPath(); g.strokeStyle = "rgba(228,184,78,.35)"; g.lineWidth = 1; g.arc(cx * w, cy * h, rad * w * .9, 0, Math.PI * 2); g.stroke(); }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [f]);

  return (
    <div className="enter" style={{ "--i": 6 } as React.CSSProperties}>
      <div className="relative mx-auto w-full max-w-[440px] lg:max-w-none aspect-[1/.92]">
        <canvas ref={canvasRef} role="img" aria-label="김해시 모양의 점지도. 선택한 데이터의 분포를 강조해 보여줍니다." className="absolute inset-0 h-full w-full" />
        {/* 숫자 카드 */}
        <div className="absolute bottom-[14%] left-0 min-w-[190px] rounded-2xl bg-white px-[18px] py-3.5 text-neutral-900 shadow-[0_30px_60px_-30px_rgba(0,0,0,.7)]">
          <p className="text-xs text-neutral-500">{f.label}</p>
          <p className="mt-0.5 text-3xl font-extrabold leading-[1.1] tracking-[-.02em] tabular-nums">{f.value}<small className="ml-0.5 text-base">{f.unit}</small></p>
          <p className="mt-1.5 text-[11px] text-neutral-400">{f.source}</p>
        </div>
      </div>

      {/* 데이터 선택 칩 */}
      <div role="group" aria-label="강조할 데이터" className="mt-2.5 flex flex-wrap gap-2">
        {FOCUS.map((x, i) => (
          <button key={x.chip} type="button" aria-pressed={i === focus} onClick={() => setFocus(i)}
            className={`press h-[38px] rounded-full border px-4 text-sm font-bold transition-colors ${
              i === focus ? "border-[#E4B84E] bg-[#E4B84E] text-[#05080F]" : "border-white/15 bg-white/[.06] text-white hover:bg-white/10"}`}>
            {x.chip}
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-[12.5px] text-[#9AAFC2]">점의 위치는 분포를 나타내는 예시입니다. 실제 좌표 데이터가 연결되면 그대로 찍힙니다.</p>
    </div>
  );
}
