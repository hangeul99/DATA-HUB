"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Dataset {
  id: string;
  title: string;
  category: string;
  description: string;
  downloads: number;
  created_at: string;
}

const ease = [0.16, 1, 0.3, 1] as const;

export default function FeaturedDatasets() {
  const reduce = useReducedMotion() ?? false;
  const [datasets, setDatasets] = useState<Dataset[] | null>(null); // null = 로딩 중

  useEffect(() => {
    createClient()
      .from("datasets")
      .select("id, title, category, description, downloads, created_at")
      .eq("is_active", true)
      .order("downloads", { ascending: false })
      .limit(6)
      .then(({ data }) => setDatasets(data ?? []));
  }, []);

  // 최신 2개 = 신규, 다운로드 1위 = 인기
  const newest = new Set(
    [...(datasets ?? [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2).map((d) => d.id)
  );
  const topId = datasets?.[0]?.id;
  const badge = (d: Dataset) => (newest.has(d.id) ? "신규" : d.id === topId ? "인기" : null);

  return (
    <section className="py-20 md:py-24 bg-neutral-50 border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="max-w-[60ch]">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900">
              많이 찾는 데이터셋
            </h2>
            <p className="mt-4 text-base text-neutral-600 leading-relaxed">
              다운로드 기준 상위 여섯 개입니다.
            </p>
          </div>
          <Link href="/datasets"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 hover:text-brand-600 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-xl">
            데이터 탐색하기 <ArrowRight size={14} strokeWidth={1.75} />
          </Link>
        </div>

        {/* 원장(ledger) 목록: 2열, 행 사이 border-t만 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-12">
          {datasets === null ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="py-5 border-t border-neutral-200" aria-hidden>
                <div className="h-3 w-24 rounded bg-neutral-200/70" />
                <div className="mt-3 h-4 w-3/4 rounded bg-neutral-200/70" />
                <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200/50" />
              </div>
            ))
          ) : datasets.length === 0 ? (
            <p className="col-span-full py-10 border-t border-neutral-200 text-sm text-neutral-500">
              아직 등록된 데이터셋이 없습니다. 관리자 페이지에서 첫 데이터셋을 등록하세요.
            </p>
          ) : (
            datasets.map((d, i) => {
              const b = badge(d);
              return (
                <motion.div
                  key={d.id}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.45, delay: (i % 2) * 0.05 + Math.floor(i / 2) * 0.04, ease }}
                >
                  <Link href={`/datasets/${d.id}`}
                    className="group block py-5 border-t border-neutral-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded-sm">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span>{d.category}</span>
                      {b && (
                        <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-medium ${
                          b === "신규" ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"
                        }`}>{b}</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-start justify-between gap-4">
                      <h3 className="text-base font-medium text-neutral-900 group-hover:text-brand-600 transition-colors duration-150 leading-snug">
                        {d.title}
                      </h3>
                      <ArrowUpRight size={16} strokeWidth={1.75}
                        className="flex-shrink-0 mt-1 text-neutral-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 line-clamp-1">{d.description}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-500 tabular-nums">
                      <Download size={12} strokeWidth={1.75} /> {d.downloads.toLocaleString()}
                    </p>
                  </Link>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
