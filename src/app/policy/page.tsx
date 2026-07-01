import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileText } from "lucide-react";

// 정책 목록 — 추후 내용 채울 것
const POLICIES = [
  { id: 1, title: "데이터 이용 정책",       description: "데이터거버넌스센터 데이터 이용에 관한 기본 정책입니다." },
  { id: 2, title: "개인정보 처리방침",       description: "수집하는 개인정보의 항목 및 처리 목적을 안내합니다." },
  { id: 3, title: "데이터 보안 정책",        description: "데이터 보호 및 보안 관리에 관한 정책입니다." },
  { id: 4, title: "결과물 제출 지침",        description: "데이터 활용 결과물 제출 기준 및 절차를 안내합니다." },
  { id: 5, title: "저작권 및 라이선스 정책", description: "제공 데이터의 저작권 및 이용 허락 범위를 규정합니다." },
];

export default function PolicyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-20">

        {/* 헤더 */}
        <div className="bg-white border-b border-neutral-100">
          {/* 모바일 여백/제목 크기 축소 */}
          <div className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-12">
            <p className="text-brand-600 font-semibold text-sm uppercase tracking-widest mb-3">Policy</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">정책</h1>
            <p className="text-neutral-500 text-sm">인제대학교 데이터거버넌스센터 운영 정책을 안내합니다.</p>
          </div>
        </div>

        {/* 정책 목록 */}
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col gap-4">
            {POLICIES.map((policy) => (
              <div key={policy.id}
                className="bg-white rounded-2xl border border-neutral-100 hover:border-brand-200 hover:shadow-sm transition-all duration-200 px-5 sm:px-6 py-5 flex items-start gap-3 sm:gap-4 cursor-default">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText size={18} className="text-brand-600" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-neutral-900 mb-1">{policy.title}</h2>
                  <p className="text-sm text-neutral-500 leading-relaxed">{policy.description}</p>
                  <p className="text-xs text-neutral-300 mt-3">내용 준비 중입니다.</p>
                </div>
              </div>
            ))}
          </div>


        </div>

        <div className="pb-16" />
      </main>
      <Footer />
    </>
  );
}
