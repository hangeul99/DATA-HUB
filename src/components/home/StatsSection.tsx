"use client";

/* ============================================================
   StatsSection — 히어로 아래에 걸쳐 올라오는 유리 카드 (시안 v3)

   - 수치는 Supabase에서 실시간 조회 (개수만 세는 head 쿼리 → 가볍고 빠름)
   - "이번 달 +N"은 최근 30일 안에 생긴 행 개수
   - 화면에 들어오면 숫자가 0부터 카운트업
============================================================ */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prefersReducedMotion, useInViewOnce } from "./motion";

interface StatItem {
  value: number;
  suffix: string;
  label: string;
  recent?: number;   // 최근 30일 증가분 (없으면 표시 안 함)
  note?: string;     // 증가분 대신 보여줄 보조 문구
  live?: boolean;    // LIVE 뱃지 표시 여부
}

// ── 숫자 카운트업 (requestAnimationFrame → 화면 주사율에 맞춰 부드럽게) ──
function useCountUp(target: number, started: boolean, duration = 1400) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    // 움직임 줄이기 설정이면 0ms → 첫 프레임에 바로 최종 숫자 표시
    const dur = prefersReducedMotion() ? 0 : duration;

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = dur === 0 ? 1 : Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // 끝에서 천천히 멈춤
      setCount(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf); // 언마운트·값 변경 시 정리
  }, [target, started, duration]);

  return count;
}

function Stat({ item, started, index }: { item: StatItem; started: boolean; index: number }) {
  const count = useCountUp(item.value, started);
  return (
    // 칸 사이 세로 구분선: 첫 칸은 없음, 3번째 칸은 모바일 2열에서 줄 시작이라 PC(4열)에서만 표시
    <div className={`relative flex flex-col gap-1.5 px-5 py-5 sm:px-7 sm:py-7 ${
      index === 0 ? "" : "before:absolute before:left-0 before:top-6 before:bottom-6 before:w-px before:bg-neutral-200"
    } ${index === 2 ? "before:hidden lg:before:block" : ""}`}>
      <div className="flex items-center gap-2 text-xs sm:text-[13px] font-medium text-neutral-500">
        {item.label}
        {item.live && (
          <span className="font-mono text-[10px] tracking-[.06em] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">LIVE</span>
        )}
      </div>
      <div className="text-[32px] sm:text-[40px] font-black text-brand-700 tabular-nums tracking-[-.03em] leading-none">
        {count.toLocaleString()}
        <small className="ml-0.5 text-lg sm:text-xl font-bold text-brand-500">{item.suffix}</small>
      </div>
      <div className="font-mono text-[11px] text-brand-600 min-h-4">
        {item.recent !== undefined && item.recent > 0
          ? `▲ 최근 30일 +${item.recent.toLocaleString()}`
          : item.note ?? ""}
      </div>
    </div>
  );
}

export default function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const started = useInViewOnce(sectionRef, 0.4);

  const [stats, setStats] = useState<StatItem[]>([
    { value: 0, suffix: "+", label: "등록 데이터셋", live: true },
    { value: 0, suffix: "+", label: "총 신청 건수" },
    { value: 0, suffix: "+", label: "총 다운로드" },
    { value: 4, suffix: "개", label: "데이터 카테고리", note: "통계 · 연구 · 금융 · 지역" },
  ]);

  // ── Supabase 실시간 수치 조회 (전체 개수 + 최근 30일 개수를 한 번에 병렬로) ──
  useEffect(() => {
    let cancelled = false; // 응답 전에 페이지를 떠나면 setState 하지 않음
    const supabase = createClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    (async () => {
      const [ds, dsRecent, apps, appsRecent, dls, dlsRecent] = await Promise.all([
        supabase.from("datasets").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("datasets").select("*", { count: "exact", head: true }).eq("is_active", true).gte("created_at", since),
        supabase.from("applications").select("*", { count: "exact", head: true }),
        supabase.from("applications").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("download_logs").select("*", { count: "exact", head: true }),
        supabase.from("download_logs").select("*", { count: "exact", head: true }).gte("created_at", since),
      ]);
      if (cancelled) return;
      setStats([
        { value: ds.count ?? 0, suffix: "+", label: "등록 데이터셋", live: true, recent: dsRecent.count ?? 0 },
        { value: apps.count ?? 0, suffix: "+", label: "총 신청 건수", recent: appsRecent.count ?? 0 },
        { value: dls.count ?? 0, suffix: "+", label: "총 다운로드", recent: dlsRecent.count ?? 0 },
        { value: 4, suffix: "개", label: "데이터 카테고리", note: "통계 · 연구 · 금융 · 지역" },
      ]);
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    // 음수 margin으로 히어로 하단에 걸치게 배치
    <div ref={sectionRef} className="relative z-10 -mt-20 md:-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-[22px] border border-white/70 bg-white/[.92] backdrop-blur-xl shadow-[0_30px_70px_-30px_rgba(7,18,32,.55),inset_0_1px_0_rgba(255,255,255,.8)]">
          {stats.map((s, i) => (
            <Stat key={s.label} item={s} started={started} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
