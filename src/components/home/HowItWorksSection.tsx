"use client";

/* ============================================================
   HowItWorksSection — 이용 절차 5단계 (시안 v3)

   화면에 들어오면 진행선이 왼쪽→오른쪽으로 채워지고,
   단계 타일이 순서대로 점등(회색 → 틸 그라디언트)됩니다.
   ★ 단계 문구 수정: steps 배열
============================================================ */

import { useEffect, useRef, useState } from "react";
import { Search, FileText, CheckCircle, Download, Upload } from "lucide-react";
import { prefersReducedMotion, useInViewOnce, useReveal } from "./motion";

const steps = [
  { step: "01", icon: Search, title: "데이터 탐색", desc: "카테고리별 필터와 검색으로 원하는 데이터를 찾으세요." },
  { step: "02", icon: FileText, title: "이용 신청", desc: "이용 목적, 소속 기관을 입력해 신청서를 제출합니다." },
  { step: "03", icon: CheckCircle, title: "관리자 승인", desc: "검토 후 승인이 완료되면 이메일로 알려 드립니다." },
  { step: "04", icon: Download, title: "데이터 다운로드", desc: "승인된 데이터를 마이페이지에서 바로 내려받으세요." },
  { step: "05", icon: Upload, title: "결과물 제출", desc: "논문, 캡처, 앱 등 활용 결과를 제출해 기여를 공유하세요." },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const started = useInViewOnce(stepsRef, 0.35);
  const [litCount, setLitCount] = useState(0); // 점등된 단계 수

  useReveal(sectionRef);

  // ── 단계 순차 점등 (타이머는 언마운트 시 모두 정리) ──
  useEffect(() => {
    if (!started) return;
    const reduce = prefersReducedMotion(); // 움직임 줄이기 → 지연 없이 한 번에 점등
    const timers = steps.map((_, i) => setTimeout(() => setLitCount(i + 1), reduce ? 0 : 200 + i * 260));
    return () => timers.forEach(clearTimeout);
  }, [started]);

  return (
    <section ref={sectionRef} className="py-24 md:py-28 bg-neutral-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="reveal text-center">
          <p className="font-mono text-xs font-medium tracking-[.16em] uppercase text-brand-600 mb-3.5">How It Works</p>
          <h2 className="text-[28px] md:text-[42px] font-extrabold text-neutral-900 tracking-tight leading-tight">5단계로 완성되는 데이터 활용</h2>
          <p className="mt-3.5 text-neutral-500 text-base max-w-xl mx-auto">탐색부터 결과물 제출까지, 신청 한 번으로 이어지는 흐름입니다.</p>
        </div>

        <div ref={stepsRef} className="relative mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-7">
          {/* 진행선 (PC에서만) */}
          <div aria-hidden="true" className="hidden lg:block absolute top-9 left-[10%] right-[10%] h-0.5 rounded bg-neutral-200 overflow-hidden">
            <div
              className="h-full origin-left bg-gradient-to-r from-brand-500 to-brand-300 transition-transform duration-[1600ms] ease-[cubic-bezier(.16,1,.3,1)]"
              style={{ transform: `scaleX(${started ? 1 : 0})` }}
            />
          </div>

          {steps.map((s, i) => {
            const Icon = s.icon;
            const lit = i < litCount;
            return (
              <div key={s.step} className="reveal relative text-center" style={{ "--d": `${i * 0.1}s` } as React.CSSProperties}>
                <div className={`relative w-[72px] h-[72px] mx-auto mb-[18px] rounded-[18px] flex items-center justify-center border [transition:background-color_500ms,color_500ms,box-shadow_500ms,border-color_500ms,translate_500ms_var(--ease-out-expo)] ${
                  lit
                    ? "bg-gradient-to-br from-brand-500 to-navy-700 text-white border-transparent shadow-[0_14px_34px_-12px_rgba(13,115,119,.6)] -translate-y-1"
                    : "bg-white text-neutral-400 border-neutral-200"
                }`}>
                  <Icon size={26} aria-hidden="true" />
                  <b className={`absolute -top-2 -right-2 w-[26px] h-[26px] rounded-full flex items-center justify-center font-mono text-[11px] font-medium border [transition:background-color_500ms,color_500ms,border-color_500ms] ${
                    lit ? "bg-brand-100 text-brand-700 border-transparent" : "bg-white text-neutral-500 border-neutral-200"
                  }`}>
                    {s.step}
                  </b>
                </div>
                <h3 className="font-bold text-neutral-900 text-base">{s.title}</h3>
                <p className="mt-1.5 text-[13px] text-neutral-500 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
