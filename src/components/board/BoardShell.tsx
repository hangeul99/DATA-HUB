"use client";

/* ============================================================
   BoardShell — 게시판 공통 틀 (시안 v9)

   머리(제목·설명) + [왼쪽 게시판 메뉴 | 오른쪽 내용] 구조.
   목록 페이지와 글 보기 페이지가 같이 씁니다.
   휴대폰에서는 왼쪽 메뉴가 위쪽 가로 줄로 바뀝니다.
   ★ 게시판 추가: BOARDS 배열 (type 은 주소, label 은 이름)
============================================================ */

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const BOARDS = [
  { type: "free",      label: "자유게시판" },
  { type: "feedback",  label: "요구 및 개선사항" },
  { type: "resources", label: "자료 게시판" },
] as const;
export type BoardType = (typeof BOARDS)[number]["type"];

export const BOARD_LABELS: Record<string, string> = Object.fromEntries(BOARDS.map((b) => [b.type, b.label]));

/** 작성자 이름 가리기: 관리자는 그대로, 나머지는 첫 글자만 (홍**) */
export const maskName = (name: string | null | undefined) =>
  name === "관리자" ? "관리자" : name ? name[0] + "**" : "-";

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, "-").replace(/\.$/, "");

export function AdminBadge() {
  return <span className="inline-flex items-center rounded-md bg-accent-400 px-1.5 py-0.5 text-[11.5px] font-extrabold leading-none text-navy-900">관리자</span>;
}

export default function BoardShell({ type, counts, children }: { type: string; counts?: Record<string, number>; children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-16 md:pt-20 break-keep">
        {/* 머리 */}
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-[1400px] px-4 pb-8 pt-9 sm:px-6 sm:pt-10">
            <h1 className="t-h1">게시판</h1>
            <p className="mt-2 max-w-[60ch] text-base text-neutral-600">이용 중 궁금한 점, 필요한 데이터 요청, 나누고 싶은 자료를 올리는 곳입니다. 읽기는 누구나, 글과 댓글은 회원만 쓸 수 있습니다.</p>
          </div>
        </header>

        <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] items-start gap-4 px-4 pb-20 pt-6 sm:px-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-7">
          {/* 왼쪽 메뉴 (휴대폰에서는 가로 줄) */}
          <aside className="md:sticky md:top-24">
            <p className="mb-2 ml-2.5 hidden text-xs font-bold tracking-[.08em] text-neutral-500 md:block">게시판</p>
            <nav aria-label="게시판 종류" className="flex gap-1 overflow-x-auto md:grid md:gap-0.5">
              {BOARDS.map((b) => {
                const on = b.type === type;
                return (
                  <Link key={b.type} href={`/board/${b.type}`} aria-current={on ? "page" : undefined}
                    className={`flex items-center justify-between gap-2.5 whitespace-nowrap rounded-[10px] px-3 py-2.5 text-[15px] transition-colors ${
                      on ? "bg-navy-900 font-bold text-white" : "font-semibold text-neutral-700 hover:bg-neutral-100"}`}>
                    {b.label}
                    {counts && counts[b.type] !== undefined && (
                      <span className={`text-[12.5px] tabular-nums ${on ? "text-accent-300" : "text-neutral-500"}`}>{counts[b.type]}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 hidden rounded-[14px] border border-neutral-200 bg-white p-3.5 text-[13.5px] text-neutral-600 md:block">
              <b className="mb-1 block text-[13px] text-neutral-900">이용 안내</b>
              읽기는 누구나, 글과 댓글은 로그인한 회원만 쓸 수 있습니다. 자료 게시판은 파일 1개(20MB)를 첨부할 수 있습니다.
            </div>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
