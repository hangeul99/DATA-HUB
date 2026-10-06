"use client";

/* ============================================================
   useHubStats — 홈 히어로에 보여 줄 공개 통계 4개

   누구에게나 똑같이 보이는 숫자만 씁니다.
   (이용 신청·다운로드 합계는 비로그인 방문자에게 보안 규칙상 0으로 보여서 제외)
   - datasets: 공개 중인 데이터 수 (+ recent: 최근 30일 신규)
   - orgs: 설명의 "출처: 기관명," 에서 서로 다른 기관 수 (topOrg: 가장 많은 기관)
   - latest: 설명의 "기준일 YYYY-MM-DD" 중 가장 최근 날짜
   ※ 설명 전문을 받아 집계하는 방식이라 데이터가 수백 건을 넘기면
      서버 쪽 집계(뷰/RPC)로 바꾸는 것이 좋습니다. 지금은 LIMIT로 상한만 둡니다.
============================================================ */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface HubStats { datasets: number; recent: number; orgs: number; topOrg: string | null; latest: string | null; loaded: boolean }

const EMPTY: HubStats = { datasets: 0, recent: 0, orgs: 0, topOrg: null, latest: null, loaded: false };

export function useHubStats(): HubStats {
  const [s, setS] = useState<HubStats>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    createClient().from("datasets").select("description, created_at").eq("is_active", true).limit(500)
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
          orgs: orgCount.size, topOrg, latest, loaded: true,
        });
      });
    return () => { cancelled = true; };
  }, []);

  return s;
}
