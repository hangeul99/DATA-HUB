"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart2, BookOpen, TrendingUp, MapPin, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const categories = [
  {
    icon: BarChart2,
    title: "통계/공공 데이터",
    desc: "정부 통계, 공공기관 데이터, 행정 정보 등 공신력 있는 데이터",
    color: "bg-blue-50 text-blue-600",
    href: "/datasets?category=통계/공공+데이터",
  },
  {
    icon: BookOpen,
    title: "연구/학술 데이터",
    desc: "논문, 실험, 학술 연구 결과물을 기반으로 한 고품질 데이터",
    color: "bg-brand-50 text-brand-600",
    href: "/datasets?category=연구/학술+데이터",
  },
  {
    icon: TrendingUp,
    title: "금융/경제 데이터",
    desc: "주가, 경제지표, 기업 재무 정보 등 금융 분야 핵심 데이터",
    color: "bg-emerald-50 text-emerald-600",
    href: "/datasets?category=금융/경제+데이터",
  },
  {
    icon: MapPin,
    title: "지역/업체 데이터",
    desc: "지역별 현황, 업체 정보, 상권 분석에 활용 가능한 데이터",
    color: "bg-orange-50 text-orange-600",
    href: "/datasets?category=지역/업체+데이터",
  },
];

function useScrollReveal(ref: React.RefObject<HTMLElement | null>, delay = 0) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(32px)";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.transition = "opacity 0.65s ease, transform 0.65s ease";
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, delay);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);
}

function CategoryCard({
  icon: Icon, title, desc, count, color, href, index,
}: (typeof categories)[0] & { count: number; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useScrollReveal(ref as React.RefObject<HTMLElement>, index * 100);

  return (
    <a
      ref={ref}
      href={href}
      className="group block bg-white rounded-2xl p-6 border border-neutral-100 hover:border-brand-200 hover:shadow-brand transition-all duration-300"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} mb-4`}>
        <Icon size={22} />
      </div>
      <h3 className="font-semibold text-neutral-900 text-base mb-2 group-hover:text-brand-700 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-neutral-500 leading-relaxed mb-4">{desc}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
          {count > 0 ? `${count.toLocaleString()}개` : "준비 중"}
        </span>
        <ArrowRight size={14} className="text-neutral-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-all duration-200" />
      </div>
    </a>
  );
}

export default function CategorySection() {
  const headerRef = useRef<HTMLDivElement>(null);
  useScrollReveal(headerRef as React.RefObject<HTMLElement>, 0);

  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    createClient()
      .from("datasets")
      .select("category")
      .eq("is_active", true)
      .then(({ data }) => {
        if (!data) return;
        const c: Record<string, number> = {};
        data.forEach((d) => {
          c[d.category] = (c[d.category] ?? 0) + 1;
        });
        setCounts(c);
      });
  }, []);

  const total = Object.values(counts).reduce((s, c) => s + c, 0);

  return (
    <section className="py-24 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div ref={headerRef} className="text-center mb-14">
          <p className="text-brand-600 font-semibold text-sm uppercase tracking-widest mb-3">Categories</p>
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900">
            다양한 분야의 데이터를 탐색하세요
          </h2>
          <p className="mt-4 text-neutral-500 text-base max-w-xl mx-auto">
            {total > 0
              ? `4개 카테고리, ${total.toLocaleString()}개의 검증된 데이터셋이 준비되어 있습니다.`
              : "4개 카테고리의 검증된 데이터셋이 준비되어 있습니다."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat, i) => (
            <CategoryCard key={cat.title} {...cat} count={counts[cat.title] ?? 0} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
