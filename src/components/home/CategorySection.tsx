"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart2, BookOpen, TrendingUp, MapPin, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// 벤토 4셀: 넓은 셀 2개는 틴트로 시각 변화 (DESIGN.md 7장)
const categories = [
  {
    icon: BarChart2, title: "통계/공공 데이터",
    desc: "정부 통계, 공공기관 데이터, 행정 정보. 공신력 있는 출처만 모았습니다.",
    href: "/datasets?category=통계/공공+데이터",
    span: "md:col-span-2", tone: "brand" as const,
  },
  {
    icon: BookOpen, title: "연구/학술 데이터",
    desc: "논문과 실험, 학술 연구 결과물 기반의 데이터.",
    href: "/datasets?category=연구/학술+데이터",
    span: "md:col-span-1", tone: "plain" as const,
  },
  {
    icon: TrendingUp, title: "금융/경제 데이터",
    desc: "주가, 경제지표, 기업 재무 정보.",
    href: "/datasets?category=금융/경제+데이터",
    span: "md:col-span-1", tone: "plain" as const,
  },
  {
    icon: MapPin, title: "지역/업체 데이터",
    desc: "김해와 경남의 지역 현황, 업체 정보, 상권 분석 데이터. 접근 권한 신청 후 이용합니다.",
    href: "/datasets?category=지역/업체+데이터",
    span: "md:col-span-2", tone: "tint" as const,
  },
];

const toneClass = {
  brand: "bg-brand-600 text-white border-brand-600",
  tint:  "bg-brand-50 text-neutral-900 border-brand-100",
  plain: "bg-white text-neutral-900 border-neutral-200",
};

const ease = [0.16, 1, 0.3, 1] as const;

export default function CategorySection() {
  const reduce = useReducedMotion() ?? false;
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    createClient()
      .from("datasets").select("category").eq("is_active", true)
      .then(({ data }) => {
        if (!data) return;
        const c: Record<string, number> = {};
        data.forEach((d) => { c[d.category] = (c[d.category] ?? 0) + 1; });
        setCounts(c);
      });
  }, []);

  return (
    <section className="py-20 md:py-24 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-[60ch]">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900">
            분야별로 찾아보세요
          </h2>
          <p className="mt-4 text-base text-neutral-600 leading-relaxed">
            네 가지 분야의 검증된 데이터셋. 필요한 분야를 고르면 바로 목록으로 이동합니다.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            const count = counts[cat.title] ?? 0;
            const isBrand = cat.tone === "brand";
            return (
              <motion.div
                key={cat.title}
                className={cat.span}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.06, ease }}
              >
                <Link
                  href={cat.href}
                  className={`group flex flex-col h-full min-h-[220px] rounded-xl border p-6 outline-none transition-[background-color,border-color,transform] duration-150 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ${toneClass[cat.tone]} ${
                    cat.tone === "plain" ? "hover:border-neutral-300" : cat.tone === "tint" ? "hover:border-brand-200" : "hover:bg-brand-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isBrand ? "bg-white/15 text-white" : "bg-brand-50 text-brand-600"
                    }`}>
                      <Icon size={20} strokeWidth={1.75} />
                    </div>
                    <ArrowUpRight size={18} strokeWidth={1.75}
                      className={`transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                        isBrand ? "text-white/70" : "text-neutral-400"
                      }`} />
                  </div>

                  <div className="mt-auto pt-8">
                    <h3 className="text-lg font-medium">{cat.title}</h3>
                    <p className={`mt-1.5 text-sm leading-relaxed ${isBrand ? "text-white/75" : "text-neutral-600"}`}>
                      {cat.desc}
                    </p>
                    <p className={`mt-4 text-sm tabular-nums ${isBrand ? "text-white/80" : "text-neutral-500"}`}>
                      {count > 0 ? `${count.toLocaleString()}개 데이터셋` : "준비 중"}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
