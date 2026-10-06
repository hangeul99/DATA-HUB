"use client";

/* ============================================================
   CtaSection — 페이지 하단 가입 유도 (시안 v7)

   김해 풍경 사진을 짙은 틸로 덮어 분위기만 살리고 글자 대비는 유지합니다.
   ★ 사진 교체: public/images/home/gimhae-cta.jpg 교체 + CREDIT 문구 수정
============================================================ */

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReveal } from "./motion";

// 위키미디어 공용 사진 — CC BY 4.0 라이선스라 출처 표기 필수
const CREDIT = "사진 xiquinhosilva, CC BY 4.0";

export default function CtaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  useReveal(sectionRef);

  return (
    <section ref={sectionRef} className="px-4 pb-28 md:pb-36">
      <div className="reveal relative mx-auto max-w-[1208px] overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0E253C,#15283F_60%,#1F3755)] px-6 py-24 text-center text-white md:py-[120px]">
        {/* 배경: 사진(흑백 톤으로 섞음) → 틸 그림자 → 도트 무늬 */}
        <Image src="/images/home/gimhae-cta.jpg" alt="" fill sizes="(max-width:1240px) 100vw, 1208px" loading="eager" fetchPriority="low" quality={60}
          className="object-cover opacity-[.34] mix-blend-luminosity" />
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(9,77,80,.35),rgba(7,18,32,.75))]" />
        <div aria-hidden="true" className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,.22)_1px,transparent_1.2px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,#000,transparent)]" />

        <div className="relative">
          <h2 className="text-[34px] sm:text-5xl lg:text-[64px] font-extrabold leading-[1.18] tracking-[-.035em]">
            필요한 데이터,<br />지금 신청하세요
          </h2>
          <p className="mx-auto mt-5 max-w-[26em] text-[17px] sm:text-lg text-white/80">
            회원가입 후 신청하면 검토를 거쳐 연구와 프로젝트에 바로 쓸 수 있어요.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="press inline-flex h-[52px] items-center rounded-full bg-[#E4B84E] px-7 font-bold text-[#0A1626] hover:bg-[#F0CF7A]">
              시작하기
            </Link>
            <Link href="/datasets" className="press inline-flex h-[52px] items-center rounded-full px-7 font-bold text-white shadow-[inset_0_0_0_1.5px_rgba(255,255,255,.4)] hover:bg-white/[.08]">
              데이터 둘러보기
            </Link>
          </div>
        </div>
        <span className="absolute bottom-3 right-5 text-[11px] text-white/50">{CREDIT}</span>
      </div>
    </section>
  );
}
