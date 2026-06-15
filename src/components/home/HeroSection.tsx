"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search, ChevronDown } from "lucide-react";

export default function HeroSection() {
  const logoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = [logoRef.current, titleRef.current, subRef.current, ctaRef.current];
    els.forEach((el, i) => {
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(28px)";
      setTimeout(() => {
        if (!el) return;
        el.style.transition = "opacity 0.75s ease, transform 0.75s ease";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, 100 + i * 160);
    });
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">

      {/* 배경 그라디언트 */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-brand-800 to-brand-600" />

      {/* 배경 그리드 패턴 */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* 빛번짐 */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* 콘텐츠 */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">

        {/* 로고 + 센터명 영역 */}
        <div ref={logoRef} className="flex flex-col items-center mb-12">
          {/* 글로컬 로고 */}
          <div className="relative mb-6">
            <div className="relative w-48 h-48 md:w-56 md:h-56 drop-shadow-2xl">
              <Image src="/logo.png" alt="인제대학교 글로컬대학 로고" fill sizes="224px"
                style={{ objectFit: "contain" }} priority draggable={false} />
            </div>
          </div>
          <h2 className="text-white text-3xl md:text-4xl font-extrabold tracking-tight">
            데이터거버넌스센터
          </h2>
        </div>

        {/* 구분선 */}
        <div className="w-16 h-px bg-white/20 mx-auto mb-10" />

        {/* 메인 타이틀 */}
        <h1
          ref={titleRef}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight"
        >
          데이터로 여는
          <br />
          <span className="text-brand-300">지역 혁신의 시대</span>
        </h1>

        {/* 서브 문구 */}
        <p
          ref={subRef}
          className="mt-6 text-base md:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed"
        >
          연구자·기업·지자체·일반인 모두를 위한 인제대학교 데이터 플랫폼.
          <br className="hidden md:block" />
          통계·공공·연구·금융 데이터를 한 곳에서 탐색하고 신청하세요.
        </p>

        {/* 검색바 */}
        <div ref={ctaRef} className="mt-10 flex flex-col sm:flex-row items-center gap-3 max-w-2xl mx-auto">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
            <input
              type="text"
              placeholder="데이터 검색 (예: 인구통계, 주가, 논문...)"
              className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/95 text-neutral-800 text-sm outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400 shadow-lg"
            />
          </div>
          <Link
            href="/datasets"
            className="flex-shrink-0 flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-semibold px-7 py-4 rounded-2xl transition-colors duration-200 active:scale-95 shadow-brand-lg"
          >
            탐색하기
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* 카테고리 태그 */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {["통계/공공 데이터", "연구/학술", "금융/경제", "지역/업체"].map((tag) => (
            <Link
              key={tag}
              href={`/datasets?category=${tag}`}
              className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white border border-white/10 transition-all duration-200"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>

      {/* 스크롤 인디케이터 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/30 animate-bounce">
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        <ChevronDown size={14} />
      </div>
    </section>
  );
}
