"use client";

/* ============================================================
   CategorySection — 데이터 카테고리 4종 카드 (시안 v3)

   - 카드에 마우스를 올리면 커서를 따라 테두리에 빛이 생김 (스포트라이트)
   - 카드 하단 막대 = 전체 데이터셋 중 해당 카테고리 비중 (실시간 계산)
   ★ 카테고리 추가/수정: categories 배열만 고치면 됩니다.
============================================================ */

import { useEffect, useRef, useState } from "react";
import { BarChart2, BookOpen, TrendingUp, MapPin, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { handleSpotlightMove, useInViewOnce, useReveal } from "./motion";

const categories = [
  { icon: BarChart2, title: "통계/공공 데이터", desc: "정부 통계, 공공기관 데이터, 행정 정보 등 공신력 있는 데이터", color: "bg-blue-50 text-blue-600" },
  { icon: BookOpen, title: "연구/학술 데이터", desc: "논문, 실험, 학술 연구 결과물을 기반으로 한 고품질 데이터", color: "bg-brand-50 text-brand-600" },
  { icon: TrendingUp, title: "금융/경제 데이터", desc: "주가, 경제지표, 기업 재무 정보 등 금융 분야 핵심 데이터", color: "bg-emerald-50 text-emerald-600" },
  { icon: MapPin, title: "지역/업체 데이터", desc: "지역별 현황, 업체 정보, 상권 분석에 활용 가능한 데이터", color: "bg-orange-50 text-orange-600" },
];

export default function CategorySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const barsOn = useInViewOnce(gridRef, 0.3); // 화면에 들어오면 비중 막대가 채워짐
  const [counts, setCounts] = useState<Record<string, number>>({});

  useReveal(sectionRef);

  // ── 카테고리별 데이터셋 개수 (category 컬럼만 가져와 집계) ──
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("datasets")
      .select("category")
      .eq("is_active", true)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const c: Record<string, number> = {};
        for (const d of data) c[d.category] = (c[d.category] ?? 0) + 1;
        setCounts(c);
      });
    return () => { cancelled = true; };
  }, []);

  const total = Object.values(counts).reduce((s, c) => s + c, 0);

  return (
    <section ref={sectionRef} className="pt-24 pb-24 md:pt-28 md:pb-28 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="reveal text-center mb-12">
          <p className="font-mono text-xs font-medium tracking-[.16em] uppercase text-brand-600 mb-3.5">Categories</p>
          <h2 className="text-[28px] md:text-[42px] font-extrabold text-neutral-900 tracking-tight leading-tight text-balance">
            다양한 분야의 데이터를 탐색하세요
          </h2>
          <p className="mt-3.5 text-neutral-500 text-base max-w-xl mx-auto">
            {total > 0
              ? `4개 카테고리, ${total.toLocaleString()}개의 검증된 데이터셋이 준비되어 있습니다.`
              : "4개 카테고리의 검증된 데이터셋이 준비되어 있습니다."}
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-[18px]">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            const count = counts[cat.title] ?? 0;
            const share = total > 0 ? count / total : 0; // 0~1 비중
            return (
              // 바깥 div = 스크롤 진입 모션, 안쪽 a = hover 모션 (서로 간섭하지 않게 분리)
              <div key={cat.title} className="reveal" style={{ "--d": `${i * 0.08}s` } as React.CSSProperties}>
              <a
                href={`/datasets?category=${encodeURIComponent(cat.title)}`}
                onMouseMove={handleSpotlightMove}
                className="spotlight group h-full flex flex-col min-h-[236px] bg-white rounded-[18px] p-6 md:p-[26px] border border-neutral-200 [transition:translate_250ms_var(--ease-out-expo),box-shadow_250ms] hover:-translate-y-1 hover:shadow-[0_20px_48px_-20px_rgba(11,96,99,.35)]"
              >
                <div className={`w-[46px] h-[46px] rounded-xl flex items-center justify-center mb-[18px] ${cat.color} transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105`}>
                  <Icon size={22} />
                </div>
                <h3 className="font-bold text-neutral-900 text-[17px] tracking-tight">{cat.title}</h3>
                <p className="mt-2 flex-1 text-sm text-neutral-500 leading-relaxed">{cat.desc}</p>
                <div className="mt-[18px] flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                    {count > 0 ? `${count.toLocaleString()}개` : "준비 중"}
                  </span>
                  <ArrowRight size={14} className="text-neutral-400 group-hover:text-brand-500 group-hover:translate-x-1 [transition:transform_200ms,color_200ms]" />
                </div>
                {/* 비중 막대 — 전체 대비 이 카테고리 비율 */}
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-neutral-100">
                  <div
                    className="h-full origin-left bg-gradient-to-r from-brand-500 to-brand-300 transition-transform duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)] delay-200"
                    style={{ width: `${Math.max(share * 100, share > 0 ? 4 : 0)}%`, transform: `scaleX(${barsOn ? 1 : 0})` }}
                  />
                </div>
              </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
