"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Download, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PreviewRow { id: string; title: string; category: string; downloads: number; }

const ease = [0.16, 1, 0.3, 1] as const;

export default function HeroSection() {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const [query, setQuery] = useState("");
  const [rows, setRows]   = useState<PreviewRow[] | null>(null); // null = 로딩 중

  // 히어로 우측 패널: 실데이터(다운로드 상위 5) — 가짜 스크린샷 대신 실제 컴포넌트
  useEffect(() => {
    createClient()
      .from("datasets")
      .select("id, title, category, downloads")
      .eq("is_active", true)
      .order("downloads", { ascending: false })
      .limit(5)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/datasets?q=${encodeURIComponent(q)}` : "/datasets");
  };

  // 위→아래 순서로 60ms 간격 진입 (감속 모션이면 즉시 표시)
  const enter = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: 0.05 + i * 0.06, ease },
  });

  return (
    <section className="pt-24 md:pt-28 pb-16 md:pb-20 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

        {/* 왼쪽: 메시지 + 검색 */}
        <div className="lg:col-span-6">
          <motion.h1 {...enter(0)}
            className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold tracking-tight leading-[1.1] text-neutral-900">
            데이터로 여는<br />
            <span className="text-brand-600">지역 혁신의 시대</span>
          </motion.h1>

          <motion.p {...enter(1)} className="mt-6 text-base md:text-lg text-neutral-600 leading-relaxed max-w-[44ch]">
            인제대학교 데이터거버넌스센터가 검증한 통계·공공·연구·금융 데이터를 한 곳에서 찾고 신청하세요.
          </motion.p>

          <motion.form {...enter(2)} onSubmit={submit} role="search"
            className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl">
            <label htmlFor="hero-search" className="sr-only">데이터 검색</label>
            <div className="relative flex-1">
              <Search size={16} strokeWidth={1.75}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                id="hero-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 인구통계, 김해시, 심장 질환"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40 transition-[border-color,box-shadow] duration-150"
              />
            </div>
            <button type="submit"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-3 rounded-xl whitespace-nowrap transition-[background-color,transform] duration-150 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2">
              데이터 탐색하기 <ArrowRight size={16} strokeWidth={1.75} />
            </button>
          </motion.form>
        </div>

        {/* 오른쪽: 실데이터 패널 */}
        <motion.div
          className="lg:col-span-6"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
        >
          <div className="rounded-xl border border-neutral-200 bg-white shadow-tinted overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
              <p className="text-sm font-medium text-neutral-900">많이 찾는 데이터셋</p>
              <p className="text-xs text-neutral-500">다운로드 기준</p>
            </div>

            <ul>
              {rows === null ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-4 px-5 py-4 border-t border-neutral-100 first:border-t-0" aria-hidden>
                    <div className="w-5 h-3 rounded bg-neutral-200/70" />
                    <div className="flex-1">
                      <div className="h-3.5 w-2/3 rounded bg-neutral-200/70" />
                      <div className="mt-2 h-3 w-1/4 rounded bg-neutral-200/50" />
                    </div>
                    <div className="w-10 h-3 rounded bg-neutral-200/50" />
                  </li>
                ))
              ) : rows.length === 0 ? (
                <li className="px-5 py-10 text-sm text-neutral-500 text-center">
                  아직 등록된 데이터셋이 없습니다.
                </li>
              ) : (
                rows.map((r, i) => (
                  <li key={r.id} className="border-t border-neutral-100 first:border-t-0">
                    <Link href={`/datasets/${r.id}`}
                      className="group flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors duration-150 outline-none focus-visible:bg-neutral-50">
                      <span className="w-5 text-sm tabular-nums text-neutral-400">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-brand-600 transition-colors duration-150">
                          {r.title}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500">{r.category}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-500 tabular-nums">
                        <Download size={12} strokeWidth={1.75} /> {r.downloads.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
