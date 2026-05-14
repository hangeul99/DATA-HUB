"use client";

import { useEffect, useRef } from "react";
import { Search, FileText, CheckCircle, Download, Upload } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Search,
    title: "데이터 탐색",
    desc: "카테고리별 필터와 검색으로 원하는 데이터를 빠르게 찾으세요.",
  },
  {
    step: "02",
    icon: FileText,
    title: "이용 신청",
    desc: "이용 목적, 소속 기관 등을 입력하여 신청서를 제출합니다.",
  },
  {
    step: "03",
    icon: CheckCircle,
    title: "관리자 승인",
    desc: "검토 후 승인이 완료되면 이메일로 알림을 드립니다.",
  },
  {
    step: "04",
    icon: Download,
    title: "데이터 다운로드",
    desc: "승인된 데이터를 마이페이지에서 바로 다운로드 하세요.",
  },
  {
    step: "05",
    icon: Upload,
    title: "결과물 제출",
    desc: "활용 결과물(논문, 캡처, 앱 등)을 제출하여 기여를 공유하세요.",
  },
];

export default function HowItWorksSection() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    refs.current.forEach((el, i) => {
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(28px)";
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              if (!el) return;
              el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
            }, i * 120);
            observer.disconnect();
          }
        },
        { threshold: 0.15 }
      );
      observer.observe(el);
    });
  }, []);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-brand-600 font-semibold text-sm uppercase tracking-widest mb-3">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900">5단계로 완성되는 데이터 활용</h2>
        </div>

        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  ref={(el) => { refs.current[i] = el; }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative mb-5">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-navy-600 flex items-center justify-center shadow-brand">
                      <Icon size={28} className="text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-neutral-900 text-base mb-2">{s.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
