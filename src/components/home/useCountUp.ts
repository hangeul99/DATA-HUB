"use client";

/* ============================================================
   useCountUp — 숫자가 0에서 목표값까지 굴러 올라가는 효과

   started 가 true 가 되는 순간부터 duration 동안 올라갑니다.
   목표값이 바뀌면(예: 칩 전환) 현재 값에서 새 값으로 다시 굴러갑니다.
   "움직임 줄이기" 설정이면 바로 목표값을 보여 줍니다.
============================================================ */

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";

export function useCountUp(target: number, started = true, duration = 1400) {
  const [count, setCount] = useState(0);
  const fromRef = useRef(0); // 직전 표시값 (목표가 바뀌면 여기서부터 출발)

  useEffect(() => {
    if (!started) return;
    const from = fromRef.current;
    const dur = prefersReducedMotion() ? 0 : duration;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = dur === 0 ? 1 : Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 4); // 끝에서 천천히 멈춤
      const v = Math.round(from + (target - from) * eased);
      setCount(v); fromRef.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, started, duration]);

  return count;
}
