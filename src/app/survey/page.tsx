"use client";

import { useState } from "react";
import Image from "next/image";
import { X, QrCode } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SURVEYS = [
  { title: "교육 만족??조사", desc: "교육 ?�로그램 참여??만족??조사?�니??", image: "/qr/교육 만족??조사.png" },
  // { title: "?�체 만족??조사", desc: "참여 ?�체 만족??조사?�니??", image: "/qr/?�체.png" },
  // { title: "기�? 만족??조사", desc: "참여 기�? 만족??조사?�니??", image: "/qr/기�?.png" },
];

export default function SurveyPage() {
  const [selected, setSelected] = useState<(typeof SURVEYS)[0] | null>(null);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-20">

        {/* ?�더 */}
        <div className="bg-white border-b border-neutral-100">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <p className="text-brand-600 font-semibold text-sm uppercase tracking-widest mb-3">Survey</p>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">만족??조사</h1>
            <p className="text-neutral-500 text-sm">조사�??�택?�면 QR코드�??�인?????�습?�다.</p>
          </div>
        </div>

        {/* 카드 목록 */}
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <p className="text-xs text-brand-500 font-medium mt-4 group-hover:text-brand-600 transition-colors">QR코드 보기 ??/p>
              </button>
            ))}
          </div>
        </div>
      </main>
      <Footer />

      {/* QR ?�업 */}
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
            <p className="text-sm text-neutral-400">QR코드�??�캔??참여?�주?�요</p>
          </div>
        </div>
      )}
    </>
  );
}
