"use client";

/* ============================================================
   FeaturedDatasets — 주목할 만한 데이터셋 (시안 v3)

   - 다운로드 수 상위 6개를 불러와 카드로 표시
   - 카테고리 탭으로 즉시 필터 (추가 DB 요청 없이 받아온 6개 안에서 거름)
   - 배지: 최다 다운로드 1개 = 인기, 가장 최근 등록 2개 = 신규
============================================================ */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useReveal } from "./motion";

// ── 카테고리별 색 점 (카드 좌상단) ──
const CATEGORY_DOT: Record<string, string> = {
  "통계/공공 데이터": "bg-[#2D5F8F]",
  "연구/학술 데이터": "bg-brand-500",
  "금융/경제 데이터": "bg-[#1F8A5B]",
  "지역/업체 데이터": "bg-[#C2621B]",
};

// 탭에 표시할 짧은 이름
const SHORT_NAME: Record<string, string> = {
  "통계/공공 데이터": "통계/공공",
  "연구/학술 데이터": "연구/학술",
  "금융/경제 데이터": "금융/경제",
  "지역/업체 데이터": "지역/업체",
};

interface Dataset {
  id: string;
  title: string;
  category: string;
  year: string | null;
  description: string | null;
  downloads: number;
  file_path: string | null;
  created_at: string;
}

/** 파일 경로에서 확장자 추출 → "CSV", "XLSX" 등. 없으면 null */
function fileFormat(path: string | null): string | null {
  const ext = path?.split(".").pop();
  return ext && ext.length <= 5 && ext !== path ? ext.toUpperCase() : null;
}

export default function FeaturedDatasets() {
  const sectionRef = useRef<HTMLElement>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");

  // ── 다운로드 수 상위 6개 ──
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("datasets")
      .select("id, title, category, year, description, downloads, file_path, created_at")
      .eq("is_active", true)
      .order("downloads", { ascending: false })
      .limit(6)
      .then(({ data }) => { if (!cancelled) setDatasets(data ?? []); });
    return () => { cancelled = true; };
  }, []);

  // 데이터가 도착해 카드가 생기면 스크롤 모션 다시 등록
  useReveal(sectionRef, [datasets.length]);

  // ── 배지 계산 (datasets가 바뀔 때만 다시 계산) ──
  const badges = useMemo(() => {
    const map = new Map<string, "신규" | "인기">();
    if (datasets.length === 0) return map;
    map.set(datasets[0].id, "인기");
    [...datasets]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2)
      .forEach((d) => map.set(d.id, "신규")); // 신규가 인기보다 우선
    return map;
  }, [datasets]);

  // ── 탭 목록: 받아온 데이터에 실제로 있는 카테고리만 ──
  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of datasets) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
    return [
      { key: "all", label: "전체", count: datasets.length },
      ...Array.from(counts, ([cat, count]) => ({ key: cat, label: SHORT_NAME[cat] ?? cat, count })),
    ];
  }, [datasets]);

  const visible = activeTab === "all" ? datasets : datasets.filter((d) => d.category === activeTab);

  return (
    <section ref={sectionRef} className="py-24 md:py-28 bg-white border-y border-neutral-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="reveal flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-xs font-medium tracking-[.16em] uppercase text-brand-600 mb-3.5">Featured</p>
            <h2 className="text-[28px] md:text-[42px] font-extrabold text-neutral-900 tracking-tight leading-tight">주목할 만한 데이터셋</h2>
          </div>
          <Link href="/datasets" className="group inline-flex items-center gap-1.5 py-2 text-sm font-bold text-brand-600 hover:text-brand-700">
            전체 보기 <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* 카테고리 탭 */}
        {datasets.length > 0 && (
          <div role="tablist" aria-label="카테고리 필터" className="reveal mt-7 flex flex-wrap gap-1.5">
            {tabs.map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-[13px] font-semibold [transition:background-color_150ms,color_150ms,border-color_150ms] ${
                    selected
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-brand-200 hover:text-brand-700"
                  }`}
                >
                  {tab.label}
                  <em className={`not-italic font-mono text-[11px] ${selected ? "text-brand-200" : "text-neutral-400"}`}>{tab.count}</em>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-[18px]">
          {visible.map((ds, i) => {
            const badge = badges.get(ds.id);
            const fmt = fileFormat(ds.file_path);
            return (
              <div key={ds.id} className="reveal" style={{ "--d": `${i * 0.06}s` } as React.CSSProperties}>
                <Link
                  href={`/datasets/${ds.id}`}
                  className="group h-full flex flex-col bg-white rounded-[18px] border border-neutral-200 p-[22px] [transition:translate_250ms_var(--ease-out-expo),border-color_250ms,box-shadow_250ms] hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_20px_48px_-20px_rgba(11,96,99,.35)]"
                >
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
                      <i className={`w-2 h-2 rounded-[2px] ${CATEGORY_DOT[ds.category] ?? "bg-neutral-400"}`} />
                      {ds.category}
                    </span>
                    {badge && (
                      <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${
                        badge === "신규" ? "bg-brand-500 text-white" : "bg-amber-400 text-amber-950"
                      }`}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-neutral-900 text-base leading-snug group-hover:text-brand-700 transition-colors">{ds.title}</h3>
                  <p className="mt-2 mb-4 flex-1 text-[13px] text-neutral-500 leading-relaxed line-clamp-2">{ds.description}</p>

                  {/* 메타: 파일 형식 · 기준 연도 · 다운로드 수 */}
                  <div className="flex items-center justify-between pt-3.5 border-t border-dashed border-neutral-200 font-mono text-xs text-neutral-500">
                    <span className="inline-flex gap-1.5">
                      {fmt && <code className="text-[11px] font-medium bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">{fmt}</code>}
                      {ds.year && <code className="text-[11px] font-medium bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">{ds.year}</code>}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Download size={12} aria-hidden="true" />
                      <span className="sr-only">다운로드</span>
                      {ds.downloads.toLocaleString()}
                    </span>
                  </div>

                  <span className="mt-3.5 block text-center text-[13px] font-bold text-brand-600 bg-brand-50 group-hover:bg-brand-500 group-hover:text-white py-[11px] rounded-xl [transition:background-color_150ms,color_150ms]">
                    신청하기
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
