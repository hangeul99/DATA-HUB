"use client";

/* ============================================================
   ShowcaseSection — 실제 데이터허브 화면 소개

   그림이 아니라 실제 사이트 화면 캡처를 보여줍니다.
   (public/images/home/screen-explore.png, screen-detail.png — 화면이 바뀌면 다시 캡처해 교체)
============================================================ */

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useReveal } from "./motion";

const SHOTS = [
  {
    src: "/images/home/screen-explore.png",
    alt: "데이터 탐색 화면: 분야·형식·연도 필터와 데이터 목록",
    kicker: "찾기",
    title: "분야와 검색어로 바로 찾고",
    desc: "분야, 파일 형식, 기준 연도로 거르고 제목·내용·태그로 검색합니다.",
  },
  {
    src: "/images/home/screen-detail.png",
    alt: "데이터 상세 화면: 들어 있는 항목, 활용 예시, 파일 정보와 신청 버튼",
    kicker: "확인하고 신청",
    title: "내용을 확인하고 신청까지",
    desc: "어떤 항목이 들어 있는지, 어디에 쓸 수 있는지 보고 한 번에 신청합니다.",
  },
];

/** 브라우저 창 모양 틀 (실제 화면 캡처를 담음) */
function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_40px_80px_-40px_rgba(7,13,24,.45),0_0_0_1px_rgba(20,26,34,.08)]">
      <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-4 py-2.5" aria-hidden="true">
        <i className="h-2.5 w-2.5 rounded-full bg-neutral-300" /><i className="h-2.5 w-2.5 rounded-full bg-neutral-300" /><i className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
      </div>
      <Image src={src} alt={alt} width={2560} height={1440} sizes="(max-width: 1024px) 100vw, 640px" className="block h-auto w-full" />
    </div>
  );
}

export default function ShowcaseSection() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  return (
    <section ref={ref} aria-labelledby="show-title" className="bg-[#F5F7F9] py-28 md:py-36">
      <div className="mx-auto max-w-[1160px] px-6">
        <div className="reveal mx-auto mb-14 max-w-2xl text-center">
          <h2 id="show-title" className="t-h2">찾고, 확인하고, 신청까지<br />한 곳에서</h2>
          <p className="t-body mt-4 text-neutral-600">회원가입 한 번이면 필요한 데이터를 신청하고 승인되면 바로 내려받을 수 있습니다.</p>
        </div>

        <div className="grid gap-12 md:grid-cols-2 md:gap-8">
          {SHOTS.map((s, i) => (
            <figure key={s.src} className="reveal m-0" style={{ "--i": i } as React.CSSProperties}>
              <BrowserFrame src={s.src} alt={s.alt} />
              <figcaption className="mt-6 px-1">
                <p className="text-sm font-bold text-brand-600">{s.kicker}</p>
                <p className="mt-1 text-xl font-extrabold tracking-[-.02em] text-neutral-900">{s.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{s.desc}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="reveal mt-12 text-center">
          <Link href="/datasets" className="press inline-flex h-12 items-center gap-2 rounded-full bg-neutral-900 px-6 font-bold text-white hover:bg-neutral-800">
            데이터 둘러보기 <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
