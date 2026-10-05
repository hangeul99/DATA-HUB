"use client";

/* ============================================================
   FeatureAnalysisSection — 자동 데이터 분석 기능 소개 (시안 v7)

   오른쪽 데모가 실제 사용 순서대로 진행됩니다.
   파일 → "분석 중"이 "분석 완료"로 바뀜 → 열 종류 표시 → 차트가 채워짐
   (화면에 들어올 때 한 번만, CSS 전환으로 처리)
============================================================ */

import { useRef } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { DotMap } from "./CategorySection";
import { useInViewOnce, useReveal } from "./motion";

const POINTS = ["숫자, 날짜, 주소 열 자동 인식", "주소가 있으면 지도로 표시", "파일은 내 브라우저 안에서만 처리"];
const COLUMNS = [["업종", "범주"], ["개업일", "날짜"], ["매출", "숫자"], ["주소", "위치"], ["종업원 수", "숫자"]];
const BARS = [["음식점", 170, "#0D7377"], ["소매", 128, "#2A9898"], ["서비스", 98, "#4FAFAF"], ["교육", 62, "#89C9C9"], ["의료", 44, "#89C9C9"]] as const;
const MINIMAP_HOT: [number, number][] = [[70, 62], [96, 44]];

export default function FeatureAnalysisSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const run = useInViewOnce(demoRef, 0.45);
  useReveal(sectionRef);

  return (
    <section ref={sectionRef} className="py-28 md:py-36">
      <div className="mx-auto grid max-w-[1120px] grid-cols-[minmax(0,1fr)] items-center gap-12 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-[72px]">
        <div className="reveal">
          <p className="mb-3.5 text-base font-bold text-brand-600">자동 데이터 분석</p>
          <h2 className="text-[32px] sm:text-[44px] lg:text-[52px] font-extrabold leading-[1.2] tracking-[-.035em] text-neutral-900">
            파일만 올리면<br />분석은 알아서
          </h2>
          <p className="mt-5 max-w-[28em] text-[17px] sm:text-lg leading-[1.75] text-neutral-600">
            CSV나 엑셀 파일을 올리면 열의 종류를 스스로 알아보고, 알맞은 차트와 지도를 바로 그려 드려요.
          </p>
          <ul className="mt-7 flex flex-col gap-3.5">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[17px] font-semibold text-neutral-900">
                <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Check size={14} strokeWidth={3} aria-hidden="true" />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <Link href="/analysis" className="press mt-9 inline-flex h-[52px] items-center rounded-full bg-brand-500 px-7 font-bold text-white hover:bg-brand-600">
            분석 시작하기
          </Link>
        </div>

        {/* ── 데모 (장식) ── */}
        <div ref={demoRef} aria-hidden="true" style={{ "--i": 1 } as React.CSSProperties}
          className={`reveal flex flex-col gap-4 rounded-3xl bg-[#F3F5F7] p-5 sm:p-7 ${run ? "run" : ""}`}>
          <div className="flex items-center gap-3.5 rounded-2xl bg-white px-[18px] py-4">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-50 text-[11px] font-extrabold text-brand-600">XLSX</span>
            <div className="min-w-0">
              <b className="block truncate text-[15px] text-neutral-900">김해시_상권_2025.xlsx</b>
              <small className="text-[13px] text-neutral-500">1,284행, 9개 열</small>
            </div>
            <div className="relative ml-auto h-7 min-w-[84px]">
              <span className="demo-a absolute right-0 top-0 flex h-7 items-center rounded-full bg-white px-3 text-[13px] font-bold text-neutral-500 ring-1 ring-neutral-200">분석 중</span>
              <span className="demo-b absolute right-0 top-0 flex h-7 items-center rounded-full bg-brand-50 px-3 text-[13px] font-bold text-brand-600">분석 완료</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {COLUMNS.map(([name, type], i) => (
              <span key={name} className="demo-chip rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900" style={{ "--i": i } as React.CSSProperties}>
                {name}<em className="ml-1.5 font-medium not-italic text-neutral-500">{type}</em>
              </span>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1.25fr_1fr]">
            <div className="rounded-2xl bg-white p-4">
              <h4 className="mb-2.5 text-sm font-bold text-neutral-900">업종별 점포 수</h4>
              <svg viewBox="0 0 220 132" fill="none" className="block h-auto w-full overflow-visible">
                {BARS.map(([label, w, color], i) => (
                  <g key={label}>
                    <text x="0" y={15 + i * 26} fontSize="11" fill="#5B6573">{label}</text>
                    <rect className="demo-hbar" style={{ "--i": i } as React.CSSProperties} x="46" y={5 + i * 26} width={w} height="14" rx="5" fill={color} />
                  </g>
                ))}
              </svg>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <h4 className="mb-2.5 text-sm font-bold text-neutral-900">위치 분포</h4>
              <DotMap w={140} h={120} step={8} hot={MINIMAP_HOT} base="#D5DBE1" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
