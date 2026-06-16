import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { MessageSquare, ClipboardList } from "lucide-react";

const BOARDS = [
  {
    type: "free",
    label: "자유게시판",
    desc: "자유롭게 의견을 나누고 소통하는 공간입니다.",
    icon: MessageSquare,
    color: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
  },
  {
    type: "feedback",
    label: "요구 및 개선사항",
    desc: "서비스 개선을 위한 의견과 요청사항을 남겨주세요.",
    icon: ClipboardList,
    color: "bg-brand-50 text-brand-600 group-hover:bg-brand-100",
  },
];

export default function BoardPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-16">
        <div className="bg-white border-b border-neutral-100">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <p className="text-brand-600 font-semibold text-sm uppercase tracking-widest mb-3">Board</p>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">게시판</h1>
            <p className="text-neutral-500 text-sm">자유롭게 글을 남기고 의견을 공유하세요.</p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BOARDS.map((b) => (
              <Link key={b.type} href={`/board/${b.type}`}
                className="bg-white rounded-2xl border border-neutral-200 hover:border-brand-400 hover:shadow-md p-6 group transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${b.color}`}>
                    <b.icon size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 text-sm mb-1 group-hover:text-brand-700 transition-colors">{b.label}</p>
                    <p className="text-xs text-neutral-400 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
                <p className="text-xs text-brand-500 font-medium mt-4 group-hover:text-brand-600 transition-colors">게시판 보기 →</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
