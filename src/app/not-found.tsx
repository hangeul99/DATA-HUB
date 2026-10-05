/* ============================================================
   404 페이지 — 없는 주소로 들어왔을 때
   길을 잃은 방문자를 데이터 탐색·홈·검색으로 바로 안내합니다.
============================================================ */

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight, Search } from "lucide-react";

export const metadata = { title: "페이지를 찾을 수 없습니다 | 인제대학교 데이터거버넌스센터" };

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-[78vh] flex-1 items-center bg-white pt-20 break-keep">
        <div className="mx-auto w-full max-w-xl px-6 py-20 text-center">
          <p className="text-sm font-bold tracking-[.2em] text-brand-600 tabular-nums">404</p>
          <h1 className="t-h1 mt-3">찾으시는 페이지가 없습니다</h1>
          <p className="t-body mt-4 text-neutral-600">
            주소가 바뀌었거나 삭제된 페이지입니다. 필요한 데이터를 바로 검색해 보세요.
          </p>

          {/* 검색 → 데이터 탐색으로 */}
          <form action="/datasets" role="search"
            className="mx-auto mt-9 flex h-14 max-w-md items-center gap-2 rounded-full bg-white pl-5 pr-1.5 shadow-[0_0_0_1px_#E3E7EC,0_10px_30px_-18px_rgba(20,26,34,.35)] focus-within:shadow-[0_0_0_2px_#4FAFAF]">
            <Search size={18} className="flex-none text-neutral-500" aria-hidden="true" />
            <label htmlFor="nf-q" className="sr-only">데이터 검색</label>
            <input id="nf-q" name="q" type="search" placeholder="예: 김해 인구, 산업단지"
              className="h-full min-w-0 flex-1 bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-500" />
            <button type="submit" className="press h-11 flex-none rounded-full bg-brand-500 px-5 font-bold text-white hover:bg-brand-600">검색</button>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/datasets" className="press inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-5 font-bold text-neutral-900 ring-1 ring-neutral-200 hover:bg-neutral-50">
              데이터 탐색 <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/" className="press inline-flex h-11 items-center rounded-full px-5 font-bold text-neutral-700 hover:bg-neutral-100">홈으로</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
