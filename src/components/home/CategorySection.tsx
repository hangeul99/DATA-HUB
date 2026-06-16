"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { BarChart2, BookOpen, TrendingUp, MapPin, ArrowRight } from "lucide-react";

const categories = [
  {
    icon: BarChart2,
    title: "?µê³„/ê³µê³µ ?°ì´??,
    desc: "?•ë? ?µê³„, ê³µê³µê¸°ê? ?°ì´?? ?‰ì • ?•ë³´ ??ê³µì‹ ???ˆëŠ” ?°ì´??,
    count: 412,
    color: "bg-blue-50 text-blue-600",
    href: "/datasets?category=?µê³„/ê³µê³µ+?°ì´??,
  },
  {
    icon: BookOpen,
    title: "?°êµ¬/?™ìˆ  ?°ì´??,
    desc: "?¼ë¬¸, ?¤í—˜, ?™ìˆ  ?°êµ¬ ê²°ê³¼ë¬¼ì„ ê¸°ë°˜?¼ë¡œ ??ê³ í’ˆì§??°ì´??,
    count: 318,
    color: "bg-brand-50 text-brand-600",
    href: "/datasets?category=?°êµ¬/?™ìˆ +?°ì´??,
  },
  {
    icon: TrendingUp,
    title: "ê¸ˆìœµ/ê²½ì œ ?°ì´??,
    desc: "ì£¼ê?, ê²½ì œì§€?? ê¸°ì—… ?¬ë¬´ ?•ë³´ ??ê¸ˆìœµ ë¶„ì•¼ ?µì‹¬ ?°ì´??,
    count: 276,
    color: "bg-emerald-50 text-emerald-600",
    href: "/datasets?category=ê¸ˆìœµ/ê²½ì œ+?°ì´??,
  },
  {
    icon: MapPin,
    title: "ì§€???…ì²´ ?°ì´??,
    desc: "ì§€??³„ ?„í™©, ?…ì²´ ?•ë³´, ?ê¶Œ ë¶„ì„???œìš© ê°€?¥í•œ ?°ì´??,
    count: 234,
    color: "bg-orange-50 text-orange-600",
    href: "/datasets?category=ì§€???…ì²´+?°ì´??,
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
}: (typeof categories)[0] & { index: number }) {
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
          {count.toLocaleString()}ê°?        </span>
        <ArrowRight size={14} className="text-neutral-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-all duration-200" />
      </div>
    </a>
  );
}

export default function CategorySection() {
  const headerRef = useRef<HTMLDivElement>(null);
  useScrollReveal(headerRef as React.RefObject<HTMLElement>, 0);

  return (
    <section className="py-24 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div ref={headerRef} className="text-center mb-14">
          <p className="text-brand-600 font-semibold text-sm uppercase tracking-widest mb-3">Categories</p>
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900">
            ?¤ì–‘??ë¶„ì•¼???°ì´?°ë? ?ìƒ‰?˜ì„¸??          </h2>
          <p className="mt-4 text-neutral-500 text-base max-w-xl mx-auto">
            4ê°?ì¹´í…Œê³ ë¦¬, 1,200ê°??´ìƒ??ê²€ì¦ëœ ?°ì´?°ì…‹??ì¤€ë¹„ë˜???ˆìŠµ?ˆë‹¤.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat, i) => (
            <CategoryCard key={cat.title} {...cat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
