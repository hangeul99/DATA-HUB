"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie_accepted")) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_accepted", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 text-white px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-neutral-300 leading-relaxed">
          이 사이트는 서비스 운영에 필요한 필수 쿠키만 사용합니다. (로그인 세션 유지 목적)
          추적·광고 쿠키는 사용하지 않습니다.{" "}
          <Link href="/privacy" className="text-brand-400 hover:underline">
            개인정보처리방침
          </Link>
        </p>
        <button
          onClick={accept}
          className="flex-shrink-0 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors">
          확인
        </button>
      </div>
    </div>
  );
}
