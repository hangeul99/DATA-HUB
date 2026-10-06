"use client";

/* ============================================================
   HowItWorksSection — 이용 절차 5단계 (시안 v7)

   화면에 들어오면 진행선이 채워지고, 번호가 1→5 순서로 켜집니다.
   (PC: 가로 선 / 모바일: 세로 선)
   ★ 단계 문구 수정: STEPS 배열
============================================================ */

import { useRef } from "react";
import { useInViewOnce, useReveal } from "./motion";

const STEPS = [
  { title: "데이터 탐색", desc: "분야와 검색어로 원하는 데이터를 찾아요." },
  { title: "이용 신청", desc: "이용 목적과 소속을 적어 신청해요." },
  { title: "관리자 승인", desc: "센터가 검토하고 결과는 신청 내역에 표시돼요." },
  { title: "다운로드", desc: "승인되면 데이터 페이지에서 바로 내려받아요." },
  { title: "결과물 제출", desc: "논문, 앱 등 활용 결과를 공유해요." },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const go = useInViewOnce(trackRef, 0.4);
  useReveal(sectionRef);

  return (
    <section ref={sectionRef} className="bg-[#F3F5F7] py-28 md:py-36">
      <div className="mx-auto max-w-[1120px] px-6">
        <h2 className="reveal text-center text-[32px] sm:text-[44px] lg:text-[52px] font-extrabold leading-[1.2] tracking-[-.035em] text-neutral-900">
          신청부터 활용까지<br />다섯 단계면 충분해요
        </h2>

        {/* 바깥 div = 진행선 기준 위치, ol = 단계 목록 (ol 안에는 li만 둘 수 있어 선은 밖으로 분리) */}
        <div ref={trackRef} className={`group relative mx-auto mt-16 max-w-[460px] md:mt-[72px] min-[860px]:max-w-none ${go ? "go" : ""}`}>
          {/* 진행선 — 모바일은 세로, PC는 가로 */}
          <div aria-hidden="true"
            className="absolute left-[29px] top-[30px] bottom-[30px] w-0.5 overflow-hidden rounded bg-neutral-300 min-[860px]:left-[10%] min-[860px]:right-[10%] min-[860px]:top-[29px] min-[860px]:bottom-auto min-[860px]:h-0.5 min-[860px]:w-auto">
            <i className="step-fill block h-full w-full bg-brand-500" />
          </div>

          <ol className="relative grid grid-cols-1 gap-7 min-[860px]:grid-cols-5 min-[860px]:gap-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex items-start gap-4 min-[860px]:flex-col min-[860px]:items-center min-[860px]:text-center">
              <span className="step-num flex h-[60px] w-[60px] flex-none items-center justify-center rounded-full bg-white text-[21px] font-extrabold text-neutral-500 shadow-[inset_0_0_0_2px_#CDD3DA] group-[.go]:bg-brand-500 group-[.go]:text-white group-[.go]:shadow-[0_10px_24px_-10px_rgba(46,74,110,.7)] group-[.go]:scale-[1.04]"
                style={{ "--i": i } as React.CSSProperties}>
                {i + 1}
              </span>
              <div>
                <h3 className="text-[19px] font-extrabold text-neutral-900">{s.title}</h3>
                <p className="mt-1.5 text-base leading-relaxed text-neutral-600 min-[860px]:mx-auto min-[860px]:max-w-[12em]">{s.desc}</p>
              </div>
            </li>
          ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
