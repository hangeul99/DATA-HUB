"use client";

/* ============================================================
   CategorySection — 분야별 데이터 (실제 등록된 데이터 목록으로 구성)

   그린 그래프 대신 각 분야의 실제 데이터 제목을 최대 4개씩 보여줍니다.
   데이터가 없는 분야는 "준비 중"으로 솔직하게 표시합니다.
   ★ 분야 제목 수정: TILES 배열
============================================================ */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useReveal } from "./motion";

const TILES = [
  { category: "지역/업체 데이터", short: "지역/업체", title: "김해의 산업과 생활을 한눈에", dark: false },
  { category: "통계/공공 데이터", short: "통계/공공", title: "숫자로 보는 우리 지역", dark: true },
  { category: "연구/학술 데이터", short: "연구/학술", title: "연구와 AI 학습을 위한 원자료", dark: true },
  { category: "금융/경제 데이터", short: "금융/경제", title: "시장의 흐름을 읽는 데이터", dark: false },
];

interface Row { id: string; title: string; category: string; file_path: string | null; file_size: number | null }

const fmt = (r: Row) => {
  const ext = r.file_path?.split(".").pop()?.toLowerCase();
  const f = !ext ? "" : ext === "xlsx" || ext === "xls" ? "Excel" : ext.toUpperCase();
  const s = r.file_size ? (r.file_size < 1048576 ? `${Math.max(1, Math.round(r.file_size / 1024))}KB` : `${(r.file_size / 1048576).toFixed(1)}MB`) : "";
  return [f, s].filter(Boolean).join(" · ");
};

export default function CategorySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null); // null = 불러오는 중
  useReveal(sectionRef, [rows === null]);

  useEffect(() => {
    let cancelled = false;
    createClient().from("datasets").select("id, title, category, file_path, file_size")
      .eq("is_active", true).order("created_at", { ascending: false })
      .then(({ data }) => { if (!cancelled) setRows(data ?? []); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section ref={sectionRef} aria-labelledby="cat-title" className="pb-28 pt-28 md:pb-36 md:pt-36">
      <div className="reveal mx-auto mb-12 max-w-[1120px] px-6 text-center">
        <h2 id="cat-title" className="t-h2">분야별로 찾아보세요</h2>
        <p className="t-body mt-3 text-neutral-600">지금 바로 신청할 수 있는 데이터입니다.</p>
      </div>

      <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-4 px-4 md:grid-cols-2">
        {TILES.map((t, i) => {
          const list = rows?.filter((r) => r.category === t.category) ?? [];
          return (
            <div key={t.category} className="reveal" style={{ "--i": i % 2 } as React.CSSProperties}>
              <div className={`flex h-full flex-col rounded-3xl p-7 sm:p-9 ${t.dark ? "bg-[#0B1420] text-white" : "bg-[#F3F5F7] text-neutral-900"}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`text-sm font-bold ${t.dark ? "text-[#8FD3D3]" : "text-brand-600"}`}>{t.short}</span>
                  <span className={`text-sm tabular-nums ${t.dark ? "text-white/50" : "text-neutral-500"}`}>{rows ? `${list.length}건` : ""}</span>
                </div>
                <h3 className={`mt-2 text-2xl font-extrabold leading-tight tracking-[-.03em] sm:text-[30px] ${t.dark ? "text-white" : "text-neutral-900"}`}>{t.title}</h3>

                <ul className={`mt-6 border-t ${t.dark ? "border-white/10" : "border-neutral-200"}`}>
                  {rows === null ? (
                    // 불러오는 동안 자리표시
                    [0, 1, 2].map((k) => (
                      <li key={k} className={`border-b py-4 ${t.dark ? "border-white/10" : "border-neutral-200"}`}>
                        <div className={`h-4 w-3/4 animate-pulse rounded ${t.dark ? "bg-white/10" : "bg-neutral-200"}`} />
                      </li>
                    ))
                  ) : list.length === 0 ? (
                    <li className={`border-b py-4 text-[15px] ${t.dark ? "border-white/10 text-white/60" : "border-neutral-200 text-neutral-500"}`}>
                      준비 중인 분야입니다. 필요한 데이터가 있으면 게시판에 요청해 주세요.
                    </li>
                  ) : list.slice(0, 4).map((r) => (
                    <li key={r.id}>
                      <Link href={`/datasets/${r.id}`}
                        className={`group flex items-center justify-between gap-4 border-b py-3.5 text-[15px] font-semibold transition-colors ${
                          t.dark ? "border-white/10 text-white/90 hover:text-[#8FD3D3]" : "border-neutral-200 text-neutral-900 hover:text-brand-700"}`}>
                        <span className="min-w-0 truncate">{r.title.replace(/ \(.*\)$/, "")}</span>
                        <span className={`flex-none text-[13px] font-medium ${t.dark ? "text-white/45" : "text-neutral-500"}`}>{fmt(r)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>

                <Link href={`/datasets?category=${encodeURIComponent(t.category)}`}
                  className={`group mt-auto inline-flex items-center gap-1.5 pt-6 text-[15px] font-bold ${t.dark ? "text-[#8FD3D3]" : "text-brand-700"}`}>
                  {t.short} 전체 보기 <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center text-[15px] text-neutral-600">
        처음이신가요? <Link href="/datasets?tab=guide" className="font-bold text-brand-700 underline-offset-2 hover:underline">신청부터 활용까지 5단계 이용 안내</Link>
      </p>
    </section>
  );
}
