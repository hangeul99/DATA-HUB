"use client";

/* ============================================================
   CtaSection — 페이지 하단 가입 유도 박스 (시안 v3)

   네이비→틸 그라디언트 + 가운데로 모이는 도트 무늬 + 빛번짐 2개
============================================================ */

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Database } from "lucide-react";
import { useReveal } from "./motion";

export default function CtaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useReveal(sectionRef);

  return (
    <section ref={sectionRef} className="py-24 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="reveal relative overflow-hidden rounded-[28px] px-6 py-16 md:px-8 md:py-20 text-center text-white bg-gradient-to-br from-navy-800 via-brand-700 to-brand-600">
          {/* 장식 레이어 */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,.22)_1px,transparent_1.2px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,#000,transparent)]" />
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 w-80 h-80 rounded-full bg-brand-400/40 blur-[60px]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-16 w-80 h-80 rounded-full bg-navy-600/55 blur-[60px]" />

          <div className="relative">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-white/[.12] border border-white/[.18] flex items-center justify-center">
              <Database size={26} aria-hidden="true" />
            </div>
            <h2 className="text-[28px] md:text-[40px] font-black tracking-[-.03em]">지금 바로 시작하세요</h2>
            <p className="mt-3.5 mb-8 max-w-[520px] mx-auto text-white/75 leading-relaxed">
              회원가입 후 원하는 데이터를 신청하면 빠른 승인으로 연구와 프로젝트에 바로 활용할 수 있습니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-bold text-sm px-7 py-[15px] rounded-[14px] [transition:background-color_150ms,transform_150ms] active:scale-[.97]">
                회원가입 하기 <ArrowRight size={15} />
              </Link>
              <Link href="/datasets"
                className="inline-flex items-center justify-center bg-white/10 hover:bg-white/[.18] border border-white/[.22] text-white font-bold text-sm px-7 py-[15px] rounded-[14px] [transition:background-color_150ms,transform_150ms] active:scale-[.97]">
                데이터 먼저 보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
