"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Database } from "lucide-react";

export default function CtaSection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(32px)";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transition = "opacity 0.7s ease, transform 0.7s ease";
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div
          ref={ref}
          className="relative bg-gradient-to-br from-navy-800 via-brand-700 to-brand-600 rounded-3xl px-8 py-16 md:py-20 overflow-hidden"
        >
          {/* Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-navy-600/30 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
              <Database size={28} className="text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              회원가입 후 원하는 데이터를 신청하면
              <br />빠른 승인으로 연구와 프로젝트에 바로 활용할 수 있습니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-8 py-4 rounded-2xl hover:bg-brand-50 transition-colors duration-200 active:scale-95"
              >
                회원가입 하기
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/datasets"
                className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors duration-200 active:scale-95"
              >
                데이터 먼저 보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
