"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BarChart2, BookOpen, TrendingUp, MapPin, ArrowRight, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ?Ä?Ä Ïπ¥ÌÖåÍ≥†Î¶¨Î≥??ÑÏù¥ÏΩ??§Ï†ï ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
const CATEGORY_STYLE: Record<string, { icon: React.ElementType; iconBg: string }> = {
  "?µÍ≥Ñ/Í≥µÍ≥µ ?∞Ïù¥??: { icon: BarChart2,  iconBg: "bg-blue-50 text-blue-600" },
  "?∞Íµ¨/?ôÏà† ?∞Ïù¥??: { icon: BookOpen,   iconBg: "bg-brand-50 text-brand-600" },
  "Í∏àÏúµ/Í≤ΩÏ†ú ?∞Ïù¥??: { icon: TrendingUp, iconBg: "bg-emerald-50 text-emerald-600" },
  "ÏßÄ???ÖÏ≤¥ ?∞Ïù¥??: { icon: MapPin,     iconBg: "bg-orange-50 text-orange-600" },
};

interface Dataset {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  downloads: number;
  created_at: string;
}

export default function FeaturedDatasets() {
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  // ?Ä?Ä ?§Ïö¥Î°úÎìú ???ÅÏúÑ 6Í∞?fetch ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("datasets")
      .select("id, title, category, description, tags, downloads, created_at")
      .eq("is_active", true)
      .order("downloads", { ascending: false })
      .limit(6)
      .then(({ data }) => setDatasets(data ?? []));
  }, []);

  // ?Ä?Ä ?§ÌÅ¨Î°??òÏù¥?úÏù∏ ?†ÎãàÎ©îÏù¥???Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  useEffect(() => {
    const targets = [headerRef.current, gridRef.current];
    targets.forEach((el, i) => {
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(28px)";
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              if (!el) return;
              el.style.transition = "opacity 0.65s ease, transform 0.65s ease";
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
            }, i * 150);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(el);
    });
  }, []);

  // ?Ä?Ä Î∞∞Ï?: ÏµúÎã§ Ï°∞Ìöå 1Í∞????∏Í∏∞, ÏµúÏã† 2Í∞????†Í∑ú ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  const topDownloadsId = datasets.length > 0 ? datasets[0].id : null;
  const newest2 = new Set(
    [...datasets]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2)
      .map((d) => d.id)
  );

  const getBadge = (ds: Dataset) => {
    if (newest2.has(ds.id)) return "?†Í∑ú";
    if (ds.id === topDownloadsId) return "?∏Í∏∞";
    return null;
  };

  return (
    <section className="py-24 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div ref={headerRef} className="flex items-end justify-between mb-12">
          <div>
            <p className="text-brand-600 font-semibold text-sm uppercase tracking-widest mb-3">Featured</p>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900">Ï£ºÎ™©??ÎßåÌïú ?∞Ïù¥?∞ÏÖã</h2>
          </div>
          <Link
            href="/datasets"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            ?ÑÏ≤¥ Î≥¥Í∏∞
            <ArrowRight size={14} />
          </Link>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {datasets.map((ds) => {
            const style = CATEGORY_STYLE[ds.category] ?? { icon: BarChart2, iconBg: "bg-neutral-100 text-neutral-500" };
            const Icon = style.icon;
            const badge = getBadge(ds);
            return (
              <Link
                key={ds.id}
                href={`/datasets/${ds.id}`}
                className="group bg-white rounded-2xl border border-neutral-100 hover:border-brand-200 hover:shadow-brand transition-all duration-300 flex flex-col"
              >
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.iconBg}`}>
                      <Icon size={18} />
                    </div>
                    {badge && (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        badge === "?†Í∑ú" ? "bg-brand-500 text-white" : "bg-amber-400 text-amber-900"
                      }`}>
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 font-medium mb-1">{ds.category}</p>
                  <h3 className="font-semibold text-neutral-900 text-sm leading-snug mb-2 group-hover:text-brand-700 transition-colors">
                    {ds.title}
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">{ds.description}</p>
                </div>

                <div className="px-5 pb-4 flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {ds.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-md font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-neutral-400">
                    <Download size={11} />
                    {ds.downloads.toLocaleString()}
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <span className="block w-full text-center text-sm font-semibold text-brand-600 bg-brand-50 hover:bg-brand-500 hover:text-white py-2.5 rounded-xl transition-all duration-200 active:scale-95">
                    ?†Ï≤≠?òÍ∏∞
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/datasets"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            ?ÑÏ≤¥ ?∞Ïù¥?∞ÏÖã Î≥¥Í∏∞ <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
