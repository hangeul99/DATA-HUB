"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface StatItem { value: number; suffix: string; label: string; }

function useCountUp(target: number, duration = 1400, started: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let cur = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      cur += step;
      if (cur >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(cur));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, started]);
  return count;
}

function StatCard({ value, suffix, label, delay, started }: StatItem & { delay: number; started: boolean }) {
  const count = useCountUp(value, 1400, started);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.opacity = "0";
    ref.current.style.transform = "translateY(24px)";
    setTimeout(() => {
      if (!ref.current) return;
      ref.current.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      ref.current.style.opacity = "1";
      ref.current.style.transform = "translateY(0)";
    }, delay);
  }, [delay, started]);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-brand-600 tabular-nums">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="mt-2 text-sm text-neutral-500 font-medium">{label}</div>
    </div>
  );
}

export default function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [started, setStarted]   = useState(false);
  const [stats, setStats]       = useState<StatItem[]>([
    { value: 0, suffix: "+", label: "등록 데이터셋" },
    { value: 0, suffix: "+", label: "총 신청 건수" },
    { value: 0, suffix: "+", label: "총 다운로드" },
    { value: 4, suffix: "개", label: "데이터 카테고리" },
  ]);

  // Supabase에서 실시간 수치 조회
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ count: datasets }, { count: applications }, { count: downloads }] = await Promise.all([
        supabase.from("datasets").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("applications").select("*", { count: "exact", head: true }),
        supabase.from("download_logs").select("*", { count: "exact", head: true }),
      ]);
      setStats([
        { value: datasets  ?? 0, suffix: "+", label: "등록 데이터셋" },
        { value: applications ?? 0, suffix: "+", label: "총 신청 건수" },
        { value: downloads ?? 0, suffix: "+", label: "총 다운로드" },
        { value: 4, suffix: "개", label: "데이터 카테고리" },
      ]);
    })();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 bg-white border-b border-neutral-100">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {stats.map((s, i) => (
            <StatCard key={s.label} {...s} delay={i * 100} started={started} />
          ))}
        </div>
      </div>
    </section>
  );
}
