"use client";

/* ============================================================
   만족도 조사 페이지 (/survey) — 시안 v9

   카드 안에 QR코드가 바로 보이고, "QR 크게 보기"를 누르면 큰 팝업이 열립니다.
   아직 열리지 않은 조사는 "준비 중" 카드로 자리를 잡아 둡니다.
   ★ 조사 추가·열기: SURVEYS 배열에서 open: true 로 바꾸고 public/qr/ 에 QR 이미지를 넣으세요.
============================================================ */

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Maximize2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Survey { title: string; desc: string; image: string; open: boolean }
const SURVEYS: Survey[] = [
  { title: "교육 만족도 조사", desc: "교육 프로그램 참여자 만족도 조사입니다. 교육 내용, 강사, 운영에 대한 의견을 묻습니다.", image: "/qr/교육 만족도 조사.png", open: true },
  { title: "업체 만족도 조사", desc: "참여 업체 만족도 조사입니다. 조사가 열리면 여기에 QR코드가 나옵니다.", image: "/qr/업체.png", open: false },
  { title: "기관 만족도 조사", desc: "참여 기관 만족도 조사입니다. 조사가 열리면 여기에 QR코드가 나옵니다.", image: "/qr/기관.png", open: false },
];

export default function SurveyPage() {
  const [selected, setSelected] = useState<Survey | null>(null);

  // Esc 로 팝업 닫기
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-16 md:pt-20 break-keep">
        {/* 머리: 제목 + 설명 (왼쪽 정렬) */}
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-[1400px] px-4 pb-8 pt-9 sm:px-6 sm:pt-10">
            <h1 className="t-h1">만족도 조사</h1>
            <p className="mt-2 max-w-[60ch] text-base text-neutral-600">센터가 운영한 교육과 데이터 서비스에 대한 의견을 모읍니다. 휴대폰으로 QR코드를 찍으면 설문으로 바로 연결됩니다. 3분이면 끝납니다.</p>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-7 sm:px-6">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {SURVEYS.map((s) => (
              <article key={s.title}
                className={`rounded-[20px] border border-neutral-200 bg-white p-[22px] ${s.open ? "grid grid-cols-[minmax(0,1fr)_132px] items-center gap-[18px]" : "opacity-75"}`}>
                <div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${s.open ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                    {s.open && <i aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}{s.open ? "진행 중" : "준비 중"}
                  </span>
                  <h2 className="mb-1 mt-2.5 text-[19px] font-extrabold tracking-[-.01em] text-neutral-900">{s.title}</h2>
                  <p className="mb-3 text-[14.5px] leading-relaxed text-neutral-500">{s.desc}</p>
                  {s.open && (
                    <button type="button" onClick={() => setSelected(s)}
                      className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 text-[13px] font-bold text-neutral-900 hover:bg-neutral-50">
                      <Maximize2 size={14} aria-hidden="true" /> QR 크게 보기
                    </button>
                  )}
                </div>
                {s.open && (
                  <button type="button" onClick={() => setSelected(s)} aria-label={`${s.title} QR코드 크게 보기`}
                    className="press relative h-[132px] w-[132px] rounded-[14px] border border-neutral-200 bg-white p-2">
                    <Image src={s.image} alt={`${s.title} QR코드`} fill sizes="132px" style={{ objectFit: "contain", padding: 8 }} />
                  </button>
                )}
              </article>
            ))}
          </div>
          <p className="mt-6 max-w-[72ch] rounded-r-xl border-l-4 border-accent-400 bg-accent-50 px-4 py-3 text-[14.5px] text-neutral-800">
            응답은 익명으로 외부 설문 도구에 모이며, 이 사이트에는 저장되지 않습니다. 결과는 센터 운영 개선에만 씁니다.
          </p>
        </div>
      </main>
      <Footer />

      {/* QR 큰 팝업 */}
      {selected && (
        <div role="dialog" aria-modal="true" aria-label={`${selected.title} QR코드`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl sm:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900">{selected.title}</h2>
              <button type="button" onClick={() => setSelected(null)} aria-label="닫기" className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"><X size={18} /></button>
            </div>
            <div className="relative mx-auto mb-5 h-72 w-72">
              <Image src={selected.image} alt={`${selected.title} QR코드`} fill style={{ objectFit: "contain" }} sizes="288px" />
            </div>
            <p className="text-sm text-neutral-500">휴대폰 카메라로 QR코드를 찍어 참여해 주세요</p>
          </div>
        </div>
      )}
    </>
  );
}
