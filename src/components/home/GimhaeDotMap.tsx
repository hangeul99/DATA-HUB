"use client";

/* ============================================================
   GimhaeDotMap — 히어로 오른쪽 "김해 점지도"

   김해시 외곽선(근사) 안에 점을 깔고, 선택한 데이터의 분포를 앰버로 강조합니다.
   움직임:
   - 처음 나타날 때 점이 왼쪽 위에서 오른쪽 아래로 물결처럼 차오름 (한 번, 1.4초)
   - 강조 점은 따로 그린 캔버스 위에서 CSS로 은은하게 맥박 (매 프레임 다시 그리지 않음)
   - 칩을 누르면 강조 영역이 부드럽게 바뀌고 숫자 카드가 새 값으로 굴러감
   - 마우스를 따라 지도 전체가 살짝 기울어지듯 움직임 (스프링, PC에서만)
   - 숫자 카드는 천천히 떠다님 (CSS)
   "움직임 줄이기" 설정이면 모두 정지하고 완성된 모습만 보여 줍니다.

   점 위치는 분포를 나타내는 예시입니다 (실제 좌표 데이터가 연결되면 그대로 찍도록 교체).
   ★ 숫자·문구 수정: FOCUS 배열 (등록 데이터 설명의 수치와 맞춰 주세요)
============================================================ */

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";
import { useCountUp } from "./useCountUp";

// 김해시 외곽선 근사 (0~1 정규화 좌표, 위가 북쪽) — 북서쪽이 넓고 남동쪽으로 좁아지는 모양
const OUTLINE: [number, number][] = [[.22,.08],[.40,.04],[.56,.08],[.70,.16],[.80,.27],[.90,.40],[.94,.55],[.86,.70],[.78,.84],[.62,.95],[.46,.92],[.34,.86],[.24,.74],[.12,.62],[.06,.46],[.08,.30],[.12,.18]];

interface Focus { chip: string; label: string; value: number; unit: string; source: string; spots: [number, number, number][] }
const FOCUS: Focus[] = [
  { chip: "제조업체", label: "김해시 등록 제조업체", value: 10086, unit: "곳", source: "2024.10.1 기준 · 경상남도 김해시", spots: [[.40,.56,.17],[.62,.70,.12],[.30,.30,.10]] },
  { chip: "산업단지 입주업체", label: "산업단지 입주업체", value: 1465, unit: "곳", source: "2026.8.18 기준 · 한국산업단지공단", spots: [[.70,.64,.11],[.36,.40,.09],[.52,.82,.08]] },
  { chip: "산업단지·농공단지", label: "산업단지·농공단지", value: 25, unit: "곳", source: "2026.8.18 기준 · 경상남도 김해시", spots: [[.72,.62,.07],[.34,.38,.06],[.52,.82,.05],[.24,.64,.05]] },
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

const COLS = 26;
/** 캔버스 크기에 맞춰 점 격자 좌표 목록 (외곽선 안쪽만) */
function dotsFor(w: number, h: number) {
  const step = w / COLS, out: { x: number; y: number; nx: number; ny: number }[] = [];
  for (let gy = step / 2; gy < h; gy += step) for (let gx = step / 2; gx < w; gx += step) {
    const nx = gx / w, ny = gy / h;
    if (inside(nx, ny)) out.push({ x: gx, y: gy, nx, ny });
  }
  return { step, dots: out };
}
/** 강조 영역에 얼마나 가까운지 (0 = 바깥, 1 = 중심) */
function hitOf(nx: number, ny: number, spots: Focus["spots"]) {
  let hit = 0;
  for (const [cx, cy, rad] of spots) { const d = Math.hypot(nx - cx, (ny - cy) * .92); if (d < rad) hit = Math.max(hit, 1 - d / rad); }
  return hit;
}
function prepare(cv: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext("2d")!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  return { g, w, h };
}

export default function GimhaeDotMap() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);  // 회색 바탕 점 (한 번 그림)
  const hiRef = useRef<HTMLCanvasElement>(null);    // 앰버 강조 점 (칩 바뀔 때만 다시 그림)
  const [focus, setFocus] = useState(0);
  const [hiVisible, setHiVisible] = useState(true);
  const f = FOCUS[focus];
  const shown = useCountUp(f.value, true, 1100);

  // ── 바탕 점: 처음에 물결처럼 차오르는 그리기 (한 번), 크기 바뀌면 완성본으로 다시 ──
  useEffect(() => {
    const cv = baseRef.current;
    if (!cv) return;
    let raf = 0;
    const drawBase = (t: number) => { // t: 0~1 진행도 (1이면 완성)
      const { g, w, h } = prepare(cv);
      const { step, dots } = dotsFor(w, h);
      for (const d of dots) {
        const at = (d.nx + d.ny) / 2;              // 왼쪽 위 0 → 오른쪽 아래 1
        const local = Math.min(1, Math.max(0, (t * 1.25 - at) / .25)); // 각 점의 등장 진행도
        if (local <= 0) continue;
        const pop = 1 + (1 - local) * .9;         // 튀어나오며 작아짐
        g.fillStyle = `rgba(255,255,255,${.16 * local})`;
        g.beginPath(); g.arc(d.x, d.y, step * .13 * pop, 0, Math.PI * 2); g.fill();
      }
    };
    const once = () => drawBase(1);
    if (prefersReducedMotion()) once();
    else {
      const t0 = performance.now();
      const tick = (now: number) => { const t = Math.min((now - t0) / 1400, 1); drawBase(t); if (t < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    }
    const ro = new ResizeObserver(once);
    ro.observe(cv);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  // ── 강조 점: 선택이 바뀌면 살짝 사라졌다가 새 분포로 나타남 ──
  useEffect(() => {
    const cv = hiRef.current;
    if (!cv) return;
    const draw = () => {
      const { g, w, h } = prepare(cv);
      const { step, dots } = dotsFor(w, h);
      for (const d of dots) {
        const hit = hitOf(d.nx, d.ny, f.spots);
        if (hit <= 0) continue;
        g.fillStyle = `rgba(228,184,78,${.45 + hit * .55})`;
        g.beginPath(); g.arc(d.x, d.y, step * (.17 + hit * .12), 0, Math.PI * 2); g.fill();
      }
      for (const [cx, cy, rad] of f.spots) { g.beginPath(); g.strokeStyle = "rgba(228,184,78,.35)"; g.lineWidth = 1; g.arc(cx * w, cy * h, rad * w * .9, 0, Math.PI * 2); g.stroke(); }
    };
    // 처음 그릴 때는 바탕 점이 차오른 뒤에 나타나도록 살짝 기다림
    const delay = prefersReducedMotion() ? 0 : 900;
    setHiVisible(false);
    const timer = setTimeout(() => { draw(); setHiVisible(true); }, focus === 0 ? delay : 220);
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => { clearTimeout(timer); ro.disconnect(); };
  }, [f, focus]);

  // ── 마우스를 따라 살짝 움직임 (스프링, 호버 가능한 PC에서만, transform 직접 변경 → 리렌더 없음) ──
  useEffect(() => {
    const wrap = wrapRef.current, hero = wrap?.closest("section");
    if (!wrap || !hero || prefersReducedMotion()) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const step = () => {
      cx += (tx - cx) * .08; cy += (ty - cy) * .08;
      wrap.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      raf = Math.abs(tx - cx) > .05 || Math.abs(ty - cy) > .05 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - .5) * 18; ty = ((e.clientY - r.top) / r.height - .5) * 18; kick();
    };
    const onLeave = () => { tx = 0; ty = 0; kick(); };
    hero.addEventListener("pointermove", onMove); hero.addEventListener("pointerleave", onLeave);
    return () => { cancelAnimationFrame(raf); hero.removeEventListener("pointermove", onMove); hero.removeEventListener("pointerleave", onLeave); };
  }, []);

  return (
    <div className="enter" style={{ "--i": 6 } as React.CSSProperties}>
      <div ref={wrapRef} className="relative mx-auto w-full max-w-[440px] aspect-[1/.92] will-change-transform lg:max-w-none">
        <canvas ref={baseRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
        {/* 강조 점: 바깥 div가 맥박(CSS), 안쪽 캔버스는 칩 전환 때 페이드 */}
        <div className="map-pulse absolute inset-0">
          <canvas ref={hiRef} role="img" aria-label={`김해시 모양의 점지도. ${f.label} 분포를 강조해 보여줍니다.`}
            className="absolute inset-0 h-full w-full transition-opacity duration-500" style={{ opacity: hiVisible ? 1 : 0 }} />
        </div>
        {/* 숫자 카드: 천천히 떠다니고, 칩을 누르면 숫자가 굴러감 */}
        <div className="card-float absolute bottom-[14%] left-0 min-w-[190px] rounded-2xl bg-white px-[18px] py-3.5 text-neutral-900 shadow-[0_30px_60px_-30px_rgba(0,0,0,.7)]">
          <p className="text-[13px] text-neutral-600">{f.label}</p>
          <p className="mt-0.5 text-3xl font-extrabold leading-[1.1] tracking-[-.02em] tabular-nums">{shown.toLocaleString()}<small className="ml-0.5 text-base">{f.unit}</small></p>
          <p className="mt-1.5 text-xs text-neutral-500">{f.source}</p>
        </div>
      </div>

      {/* 데이터 선택 칩 */}
      <div role="group" aria-label="강조할 데이터" className="mt-2.5 flex flex-wrap gap-2">
        {FOCUS.map((x, i) => (
          <button key={x.chip} type="button" aria-pressed={i === focus} onClick={() => setFocus(i)}
            className={`press h-[38px] rounded-full border px-4 text-sm font-bold transition-colors duration-300 ${
              i === focus ? "border-accent-400 bg-accent-400 text-navy-900" : "border-white/15 bg-white/[.06] text-white hover:bg-white/10"}`}>
            {x.chip}
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-[13.5px] text-[#B4C3D3]">점의 위치는 분포를 나타내는 예시입니다. 실제 좌표 데이터가 연결되면 그대로 찍힙니다.</p>
    </div>
  );
}
