import Link from "next/link";
import { ArrowRight } from "lucide-react";

// 페이지에서 유일하게 허용된 색 밴드 (DESIGN.md 테마 잠금). 그라디언트·블롭 없음.
export default function CtaSection() {
  return (
    <section className="bg-brand-600 text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8 max-w-[60ch]">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              지금 계정을 만들고 데이터를 신청하세요
            </h2>
            <p className="mt-4 text-base text-white/80 leading-relaxed">
              가입은 1분이면 끝납니다. 신청한 데이터는 승인 후 마이페이지에서 바로 받을 수 있습니다.
            </p>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <Link href="/signup"
              className="inline-flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-medium px-5 py-3 rounded-xl transition-[background-color,transform] duration-150 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-600">
              시작하기 <ArrowRight size={16} strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
