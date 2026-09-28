"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface StatItem { value: number; suffix: string; label: string; }

// 숫자 카운트업 — 화면에 들어왔을 때 한 번만, 감속 모션 설정이면 즉시 최종값
function useCountUp(target: number, started: boolean, instant: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started || instant) return;
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, started, instant]);
  return instant && started ? target : count;
}

function Stat({ value, suffix, label, started, instant }: StatItem & { started: boolean; instant: boolean }) {
  const count = useCountUp(value, started, instant);
  return (
    <div className="py-10 px-6 first:pl-0 last:pr-0">
      <div className="text-4xl md:text-5xl font-semibold tabular-nums tracking-tight text-neutral-900">
        {count.toLocaleString()}<span className="text-brand-600">{suffix}</span>
      </div>
      <div className="mt-2 text-sm text-neutral-500">{label}</div>
    </div>
  );
}

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion() ?? false;

  const [stats, setStats] = useState<StatItem[]>([
    { value: 0, suffix: "+", label: "등록 데이터셋" },
    { value: 0, suffix: "+", label: "이용 신청" },
    { value: 0, suffix: "+", label: "누적 다운로드" },
    { value: 4, suffix: "개", label: "데이터 분야" },
  ]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const [{ count: datasets }, { count: applications }, { count: downloads }] = await Promise.all([
          supabase.from("datasets").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("applications").select("*", { count: "exact", head: true }),
          supabase.from("download_logs").select("*", { count: "exact", head: true }),
        ]);
        setStats([
          { value: datasets ?? 0,     suffix: "+", label: "등록 데이터셋" },
          { value: applications ?? 0, suffix: "+", label: "이용 신청" },
          { value: downloads ?? 0,    suffix: "+", label: "누적 다운로드" },
          { value: 4,                 suffix: "개", label: "데이터 분야" },
        ]);
      } catch { /* 수치 조회 실패해도 화면은 유지 */ }
    })();
  }, []);

  return (
    <section className="bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 md:divide-x divide-neutral-200 border-y border-neutral-200">
          {stats.map((s) => (
            <Stat key={s.label} {...s} started={inView} instant={reduce} />
          ))}
        </div>
      </div>
    </section>
  );
}
