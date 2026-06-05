"use client";

import { useState } from "react";
import Image from "next/image";
import { X, QrCode, ClipboardList } from "lucide-react";

const SURVEYS = [
  { title: "교육 만족도 조사", desc: "교육 프로그램 참여자 만족도 조사입니다.", image: "/qr/교육 만족도 조사.png" },
  // { title: "업체 만족도 조사", desc: "참여 업체 만족도 조사입니다.", image: "/qr/업체.png" },
  // { title: "기관 만족도 조사", desc: "참여 기관 만족도 조사입니다.", image: "/qr/기관.png" },
];

export default function SurveyPage() {
  const [selected, setSelected] = useState<(typeof SURVEYS)[0] | null>(null);

  return (
    <main className="min-h-screen bg-neutral-50 pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">

        {/* 헤더 */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4">
            <ClipboardList size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">만족도 조사</h1>
          <p className="text-sm text-neutral-500">아래 조사를 선택하면 QR코드를 확인할 수 있습니다.</p>
        </div>

        {/* 카드 목록 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SURVEYS.map((s) => (
            <button
              key={s.title}
              onClick={() => setSelected(s)}
              className="bg-white rounded-2xl border border-neutral-200 hover:border-brand-400 hover:shadow-md p-6 text-left group transition-all duration-200 active:scale-95"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition-colors">
                  <QrCode size={20} className="text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900 text-sm mb-1 group-hover:text-brand-700 transition-colors">{s.title}</p>
                  <p className="text-xs text-neutral-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
              <p className="text-xs text-brand-500 font-medium mt-4 group-hover:text-brand-600 transition-colors">QR코드 보기 →</p>
            </button>
          ))}
        </div>
      </div>

      {/* QR 팝업 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold text-neutral-900">{selected.title}</h2>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="relative w-72 h-72 mx-auto mb-5">
              <Image
                src={selected.image}
                alt={selected.title}
                fill
                style={{ objectFit: "contain" }}
                sizes="288px"
              />
            </div>
            <p className="text-sm text-neutral-400">QR코드를 스캔해 참여해주세요</p>
          </div>
        </div>
      )}
    </main>
  );
}
