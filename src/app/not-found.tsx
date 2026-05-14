import Link from "next/link";
import { Database, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-6 mx-auto">
        <Database size={28} className="text-brand-400" />
      </div>
      <h1 className="text-6xl font-bold text-neutral-200 mb-4">404</h1>
      <h2 className="text-xl font-bold text-neutral-800 mb-2">페이지를 찾을 수 없습니다</h2>
      <p className="text-sm text-neutral-500 mb-8 max-w-sm">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors active:scale-95"
      >
        <Home size={16} />
        홈으로 돌아가기
      </Link>
    </div>
  );
}
