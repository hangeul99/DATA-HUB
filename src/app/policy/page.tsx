/* ============================================================
   정책 페이지 (/policy)

   구성: 머리글 → 운영 가이드라인 PDF 카드 → [왼쪽 목차 | 오른쪽 정책 5종 전문]
   ★ 정책 문구는 이 파일이 아니라 ./policies.ts 에서 고칩니다.
   ★ 가이드라인 PDF 교체: public/docs/ 의 파일을 바꾸고 policies.ts 의 GUIDELINE_PDF 수정
   서버 컴포넌트 — 자바스크립트 없이 바로 그려져 가볍고, 검색엔진이 본문을 읽을 수 있음
============================================================ */

import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight, Download, ExternalLink, FileText } from "lucide-react";
import { EFFECTIVE_DATE, GUIDELINE_PDF, POLICIES } from "./policies";

export const metadata: Metadata = {
  title: "정책 | 인제대학교 데이터거버넌스센터",
  description: "데이터 이용 정책, 개인정보 처리방침, 데이터 보안 정책, 결과물 제출 지침, 저작권 및 라이선스 정책과 운영 가이드라인을 안내합니다.",
};

/** 본문 문자열 → 문단·목록으로 변환 ("• "로 시작하는 줄은 목록, 빈 줄은 문단 구분) */
function ArticleBody({ body }: { body: string }) {
  const blocks = body.split("\n\n");
  return (
    <div className="space-y-3">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const bullets = lines.filter((l) => l.startsWith("• "));
        const text = lines.filter((l) => !l.startsWith("• "));
        return (
          <div key={bi} className="space-y-2">
            {text.map((t, ti) => (
              <p key={ti} className="text-[15px] leading-[1.8] text-neutral-700">{t}</p>
            ))}
            {bullets.length > 0 && (
              <ul className="space-y-1.5">
                {bullets.map((b, i) => (
                  <li key={i} className="relative pl-4 text-[15px] leading-[1.75] text-neutral-700 before:absolute before:left-0 before:top-[.72em] before:h-1 before:w-1 before:rounded-full before:bg-brand-500">
                    {b.slice(2)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PolicyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-x-clip bg-neutral-50 pt-16 md:pt-20 break-keep">

        {/* ── 머리글 ── */}
        <header className="border-b border-neutral-200/70 bg-white">
          <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-6 sm:py-16">
            <h1 className="text-3xl font-extrabold tracking-[-.03em] text-neutral-900 sm:text-[40px]">정책</h1>
            <p className="mt-3 max-w-[40em] text-base leading-relaxed text-neutral-600 sm:text-[17px]">
              데이터거버넌스센터는 데이터를 안전하게 공개하고 공정하게 활용하도록 아래 정책에 따라 데이터허브를 운영합니다.
            </p>
            <p className="mt-4 text-sm text-neutral-500">시행일 {EFFECTIVE_DATE}</p>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] px-5 py-10 sm:px-6 sm:py-14">

          {/* ── 운영 가이드라인 PDF ── */}
          <section aria-labelledby="guideline-title"
            className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#0E253C,#15283F_60%,#1F3755)] p-7 text-white sm:p-10">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,.25)_1px,transparent_1.2px)] [background-size:22px_22px] [mask-image:linear-gradient(90deg,transparent,#000)]" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-white/[.12] ring-1 ring-white/20">
                  <FileText size={26} aria-hidden="true" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="guideline-title" className="text-xl font-extrabold tracking-[-.02em] sm:text-2xl">{GUIDELINE_PDF.title}</h2>
                    <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-bold">{GUIDELINE_PDF.status}</span>
                  </div>
                  <p className="mt-2 max-w-[36em] text-[15px] leading-relaxed text-white/80">
                    센터의 조직과 역할, 데이터 생애주기별 관리 원칙, 개인정보 보호, 보안 등급, 사고 대응 절차를 담은 기본 문서입니다. 아래 정책들은 이 가이드라인을 데이터허브 이용자에게 맞게 옮긴 것입니다.
                  </p>
                  <p className="mt-2 text-sm text-white/60">PDF · {GUIDELINE_PDF.pages}쪽 · {GUIDELINE_PDF.note}</p>
                </div>
              </div>
              <div className="flex flex-none flex-wrap gap-2">
                <a href={GUIDELINE_PDF.href} target="_blank" rel="noopener noreferrer"
                  className="press inline-flex h-12 items-center gap-2 rounded-full bg-[#E4B84E] px-5 font-bold text-[#0A1626] hover:bg-[#F0CF7A]">
                  <ExternalLink size={16} aria-hidden="true" /> PDF 보기
                </a>
                <a href={GUIDELINE_PDF.href} download="데이터거버넌스센터_운영가이드라인(안)_2026.pdf"
                  className="press inline-flex h-12 items-center gap-2 rounded-full px-5 font-bold text-white shadow-[inset_0_0_0_1.5px_rgba(255,255,255,.4)] hover:bg-white/10">
                  <Download size={16} aria-hidden="true" /> 내려받기
                </a>
              </div>
            </div>
          </section>

          <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">

            {/* ── 목차 (PC에서 스크롤해도 따라옴) ── */}
            <nav aria-label="정책 목차" className="lg:sticky lg:top-28 lg:self-start">
              <p className="mb-3 text-sm font-bold text-neutral-500">목차</p>
              <ol className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                {POLICIES.map((p, i) => (
                  <li key={p.id}>
                    <a href={`#${p.id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-neutral-700 ring-1 ring-neutral-200 hover:text-brand-700 hover:ring-brand-200 lg:w-full lg:rounded-xl lg:bg-transparent lg:px-3 lg:ring-0 lg:hover:bg-white">
                      <span className="text-xs tabular-nums text-neutral-400">{i + 1}</span>
                      {p.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* ── 정책 전문 ── */}
            <div className="space-y-8">
              {POLICIES.map((p, i) => (
                <article key={p.id} id={p.id} aria-labelledby={`${p.id}-title`}
                  className="scroll-mt-28 rounded-3xl bg-white p-6 ring-1 ring-neutral-200/80 sm:p-9">
                  <p className="text-sm font-bold text-brand-600">정책 {i + 1}</p>
                  <h2 id={`${p.id}-title`} className="mt-1 text-2xl font-extrabold tracking-[-.025em] text-neutral-900 sm:text-[28px]">{p.title}</h2>
                  <p className="mt-2 text-base leading-relaxed text-neutral-600">{p.summary}</p>

                  <div className="mt-7 space-y-7 border-t border-neutral-100 pt-7">
                    {p.articles.map((a) => (
                      <section key={a.title}>
                        <h3 className="mb-2.5 text-[17px] font-bold text-neutral-900">{a.title}</h3>
                        <ArticleBody body={a.body} />
                      </section>
                    ))}
                  </div>

                  {p.link && (
                    <Link href={p.link.href}
                      className="press mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-brand-500 px-5 text-[15px] font-bold text-white hover:bg-brand-600">
                      {p.link.label} <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  )}

                  <p className="mt-7 border-t border-neutral-100 pt-4 text-sm text-neutral-500">
                    개정 이력: {p.history.join(" / ")}
                  </p>
                </article>
              ))}

              <p className="px-1 text-sm leading-relaxed text-neutral-500">
                정책에 관한 문의는 <a href="mailto:han9449@inje.ac.kr" className="font-semibold text-brand-700 underline underline-offset-2">han9449@inje.ac.kr</a> 으로 보내 주세요.
                정책이 바뀌면 시행 7일 전에 공지사항으로 알려 드립니다.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
