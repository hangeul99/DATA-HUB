"use client";

/* ============================================================
   StatsSection — 히어로 아래에 걸쳐 올라오는 유리 통계 카드 (시안 v7)

   - 수치는 Supabase에서 실시간 조회 (개수만 세는 head 쿼리 → 가볍고 빠름)
   - "최근 30일 +N" = 최근 30일 안에 생긴 행 개수
   - 화면에 들어오면 숫자가 0부터 카운트업
============================================================ */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prefersReducedMotion, useInViewOnce } from "./motion";

interface StatItem {
  value: number;
  unit: string;       // 숫자 뒤 단위 (개, 건, 회)
  label: string;
  recent?: number;    // 최근 30일 증가분 (0이면 표시 안 함)
  note?: string;      // 증가분 대신 보여줄 보조 문구
}

// ── 숫자 카운트업 (requestAnimationFrame → 화면 주사율에 맞춰 부드럽게) ──
function useCountUp(target: number, started: boolean, duration = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    const dur = prefersReducedMotion() ? 0 : duration; // 움직임 줄이기 → 바로 최종값
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = dur === 0 ? 1 : Math.min((now - t0) / dur, 1);
      setCount(Math.round(target * (1 - Math.pow(1 - p, 4)))); // 끝에서 천천히 멈춤
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf); // 언마운트·값 변경 시 정리
  }, [target, started, duration]);

  return count;
}

/* 한 칸: 예전 홈처럼 "가운데 정렬 · 틸색 큰 숫자 → 아래 라벨" 순서 (숫자가 먼저 눈에 들어옴) */
function Stat({ item, started, index }: { item: StatItem; started: boolean; index: number }) {
  const count = useCountUp(item.value, started);
  return (
    // 칸 사이 구분선: 첫 칸 없음. 모바일 2열에서는 3번째 칸이 줄 시작이라 PC(4열)에서만 표시
    <div className={`relative flex flex-col items-center px-4 py-7 text-center sm:py-9
      ${index === 0 ? "" : "before:absolute before:left-0 before:top-8 before:bottom-8 before:w-px before:bg-neutral-200"}
      ${index === 2 ? "before:hidden lg:before:block" : ""}
      ${index >= 2 ? "border-t border-neutral-200 lg:border-t-0" : ""}`}>
      <p className="text-4xl sm:text-5xl font-bold leading-none tracking-[-.02em] text-brand-600 tabular-nums">
        {count.toLocaleString()}
        <span className="ml-0.5 text-xl sm:text-2xl font-bold text-brand-500">{item.unit}</span>
      </p>
      <p className="mt-3 text-sm sm:text-[15px] font-medium text-neutral-600">{item.label}</p>
      <p className="mt-1 min-h-5 text-xs sm:text-[13px] text-neutral-400">
        {item.recent && item.recent > 0 ? `최근 30일 +${item.recent.toLocaleString()}` : item.note ?? ""}
      </p>
    </div>
  );
}

export default function StatsSection() {
  const cardRef = useRef<HTMLDivElement>(null);
  const started = useInViewOnce(cardRef, 0.5);

  const [stats, setStats] = useState<StatItem[]>([
    { value: 0, unit: "개", label: "등록 데이터셋" },
    { value: 0, unit: "건", label: "이용 신청" },
    { value: 0, unit: "회", label: "다운로드" },
    { value: 4, unit: "개", label: "데이터 분야", note: "통계, 연구, 금융, 지역" },
  ]);

  // ── 전체 개수 + 최근 30일 개수를 한 번에 병렬 조회 ──
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
        { value: ds.count ?? 0, unit: "개", label: "등록 데이터셋", recent: dsRecent.count ?? 0 },
        { value: apps.count ?? 0, unit: "건", label: "이용 신청", recent: appsRecent.count ?? 0 },
        { value: dls.count ?? 0, unit: "회", label: "다운로드", recent: dlsRecent.count ?? 0 },
        { value: 4, unit: "개", label: "데이터 분야", note: "통계, 연구, 금융, 지역" },
      ]);
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    // 음수 margin으로 히어로 하단(지평선 위)에 걸치게 배치
    <div className="relative z-10 -mt-20 md:-mt-[84px]">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
        <div ref={cardRef}
          className="grid grid-cols-2 lg:grid-cols-4 rounded-3xl bg-white shadow-[0_30px_70px_-30px_rgba(7,18,32,.5),inset_0_0_0_1px_rgba(255,255,255,.7),0_0_0_1px_rgba(20,26,34,.04)]">
          {stats.map((s, i) => <Stat key={s.label} item={s} started={started} index={i} />)}
        </div>
      </div>
    </div>
  );
}
