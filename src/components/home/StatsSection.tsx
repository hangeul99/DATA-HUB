"use client";

/* ============================================================
   StatsSection — 히어로 아래 통계 카드

   누구에게나 정확하게 보이는 숫자만 씁니다.
   (이용 신청·다운로드 합계는 비로그인 방문자에게 보안 규칙상 0으로 보여서 제외)
   - 공개 데이터셋: 공개 중인 데이터 수 (+ 최근 30일 신규)
   - 제공 기관: 데이터 설명의 "출처: 기관명," 에서 서로 다른 기관 수
   - 데이터 분야: 고정 4개
   - 최신 기준일: 설명의 "기준일 YYYY-MM-DD" 중 가장 최근 날짜
============================================================ */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { prefersReducedMotion, useInViewOnce } from "./motion";

interface Summary { datasets: number; recent: number; orgs: number; topOrg: string | null; latest: string | null }

// ── 숫자 카운트업 (끝에서 천천히 멈춤, 움직임 줄이기면 즉시) ──
function useCountUp(target: number, started: boolean, duration = 1400) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    const dur = prefersReducedMotion() ? 0 : duration;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = dur === 0 ? 1 : Math.min((now - t0) / dur, 1);
      setCount(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, started, duration]);
  return count;
}

function Stat({ value, unit, label, sub, started, index, raw }: {
  value: number; unit: string; label: string; sub: string; started: boolean; index: number; raw?: string;
}) {
  const count = useCountUp(value, started);
  return (
    // 칸 사이 구분선: 첫 칸 없음, 모바일 2열에서 3번째 칸은 줄 시작이라 PC에서만
    <div className={`relative flex flex-col items-center px-4 py-7 text-center sm:py-9
      ${index === 0 ? "" : "before:absolute before:left-0 before:top-8 before:bottom-8 before:w-px before:bg-neutral-200"}
      ${index === 2 ? "before:hidden lg:before:block" : ""}
      ${index >= 2 ? "border-t border-neutral-200 lg:border-t-0" : ""}`}>
      <p className="text-4xl font-bold leading-none tracking-[-.02em] text-brand-600 tabular-nums sm:text-5xl">
        {raw ?? count.toLocaleString()}
        {!raw && <span className="ml-0.5 text-xl font-bold text-brand-500 sm:text-2xl">{unit}</span>}
      </p>
      <p className="mt-3 text-sm font-semibold text-neutral-700 sm:text-[15px]">{label}</p>
      <p className="mt-1 min-h-5 text-xs text-neutral-500 sm:text-[13px]">{sub}</p>
    </div>
  );
}

export default function StatsSection() {
  const cardRef = useRef<HTMLDivElement>(null);
  const started = useInViewOnce(cardRef, 0.5);
  const [s, setS] = useState<Summary>({ datasets: 0, recent: 0, orgs: 0, topOrg: null, latest: null });

  // ── 공개 데이터의 설명·등록일만 받아 집계 (공개 정보라 비로그인도 동일) ──
  useEffect(() => {
    let cancelled = false;
    createClient().from("datasets").select("description, created_at").eq("is_active", true)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const orgCount = new Map<string, number>();
        let latest: string | null = null;
        for (const d of data) {
          const org = d.description?.match(/출처: ([^,\n]+),/)?.[1];
          if (org) orgCount.set(org, (orgCount.get(org) ?? 0) + 1);
          for (const m of d.description?.matchAll(/기준일 (\d{4}-\d{2}-\d{2})/g) ?? []) if (!latest || m[1] > latest) latest = m[1];
        }
        const topOrg = [...orgCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        setS({
          datasets: data.length,
          recent: data.filter((d) => new Date(d.created_at).getTime() > since).length,
          orgs: orgCount.size, topOrg, latest,
        });
      });
    return () => { cancelled = true; };
  }, []);

  const latestText = s.latest ? `${Number(s.latest.slice(5, 7))}.${Number(s.latest.slice(8, 10))}` : "-";

  return (
    <div className="relative z-10 -mt-20 md:-mt-[84px]">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
        <div ref={cardRef}
          className="grid grid-cols-2 rounded-3xl bg-white shadow-[0_30px_70px_-30px_rgba(7,13,24,.45),0_0_0_1px_rgba(20,26,34,.05)] lg:grid-cols-4">
          <Stat index={0} started={started} value={s.datasets} unit="건" label="공개 데이터셋" sub={s.recent > 0 ? `최근 30일 신규 ${s.recent}건` : ""} />
          <Stat index={1} started={started} value={s.orgs} unit="곳" label="데이터 제공 기관" sub={s.topOrg ? (s.orgs > 1 ? `${s.topOrg} 외 ${s.orgs - 1}곳` : s.topOrg) : ""} />
          <Stat index={2} started={started} value={4} unit="개" label="데이터 분야" sub="통계, 연구, 금융, 지역" />
          <Stat index={3} started={started} value={0} unit="" raw={latestText} label="최신 기준일" sub={s.latest ? `${s.latest.slice(0, 4)}년` : ""} />
        </div>
      </div>
    </div>
  );
}
