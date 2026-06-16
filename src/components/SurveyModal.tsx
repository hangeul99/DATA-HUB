"use client";

import { useState } from "react";
import Image from "next/image";
import { X, QrCode } from "lucide-react";

// 만족??조사 QR 목록 ??추�? ???�기?�만 ??�� 추�?
const SURVEYS = [
  { title: "교육 만족??조사", image: "/qr/교육 만족??조사.png" },
  // { title: "?�체 만족??조사", image: "/qr/?�체.png" },
  // { title: "기�? 만족??조사", image: "/qr/기�?.png" },
];

export default function SurveyModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<(typeof SURVEYS)[0] | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-100 p-6 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}>

        {/* ?�더 */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-brand-600" />
            <h2 className="text-base font-bold text-neutral-900">만족??조사</h2>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {selected ? (
          /* QR ?��? 보기 */
          <div className="text-center">
            <button onClick={() => setSelected(null)}
              className="text-xs text-neutral-400 hover:text-neutral-600 mb-4 transition-colors">
              ??목록?�로
            </button>
            <p className="text-sm font-semibold text-neutral-800 mb-4">{selected.title}</p>
            <div className="relative w-64 h-64 mx-auto">
              <Image src={selected.image} alt={selected.title} fill
                style={{ objectFit: "contain" }} sizes="256px" />
            </div>
            <p className="text-xs text-neutral-400 mt-4">QR코드�??�캔??참여?�주?�요</p>
          </div>
        ) : (
          /* QR 목록 */
          <div className="grid grid-cols-2 gap-3">
            {SURVEYS.map((s) => (
              <button key={s.title} onClick={() => setSelected(s)}
                className="flex flex-col items-center gap-3 p-4 rounded-xl border border-neutral-200 hover:border-brand-400 hover:bg-brand-50 transition-colors group">
                <div className="relative w-28 h-28">
                  <Image src={s.image} alt={s.title} fill
                    style={{ objectFit: "contain" }} sizes="112px" />
                </div>
                <span className="text-xs font-semibold text-neutral-700 group-hover:text-brand-700 text-center leading-tight">
                  {s.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
