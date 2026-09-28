"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Search, FileText, CheckCircle, Download, Upload } from "lucide-react";

const steps = [
  { icon: Search,      title: "데이터 탐색",   desc: "분야 필터와 검색으로 원하는 데이터셋을 찾습니다." },
  { icon: FileText,    title: "이용 신청",     desc: "이용 목적과 소속 기관을 입력해 신청서를 제출합니다." },
  { icon: CheckCircle, title: "관리자 승인",   desc: "검토 후 승인되면 이메일로 알려 드립니다." },
  { icon: Download,    title: "다운로드",      desc: "승인된 데이터를 마이페이지에서 바로 내려받습니다." },
  { icon: Upload,      title: "결과물 제출",   desc: "논문, 보고서, 앱 등 활용 결과를 공유합니다." },
];

const ease = [0.16, 1, 0.3, 1] as const;

export default function HowItWorksSection() {
  const reduce = useReducedMotion() ?? false;

  return (
    <section className="py-20 md:py-24 bg-neutral-50 border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">

        {/* 왼쪽: 제목 (데스크톱에서 고정) */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900">
              신청부터 활용까지,<br />다섯 단계
            </h2>
            <p className="mt-4 text-base text-neutral-600 leading-relaxed max-w-[40ch]">
              회원가입 후 신청하면 보통 며칠 안에 승인됩니다. 승인된 데이터는 마이페이지에서 언제든 다시 받을 수 있습니다.
            </p>
          </div>
        </div>

        {/* 오른쪽: 단계 목록 (행 사이 border-t만) */}
        <ol className="lg:col-span-8">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.li
                key={s.title}
                className="grid grid-cols-[2.5rem_1fr] gap-5 py-7 border-t border-neutral-200 first:border-t-0 lg:first:border-t"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.45, delay: i * 0.05, ease }}
              >
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-neutral-900">{s.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600 leading-relaxed max-w-[50ch]">{s.desc}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
