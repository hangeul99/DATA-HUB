"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie_accepted")) setVisible(true);
  }, []);

  const accept = () => {
    if (!agreed) return;
    localStorage.setItem("cookie_accepted", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 text-white px-6 py-5 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 space-y-2">
          <p className="text-sm text-neutral-200 leading-relaxed">
            이 사이트는 로그인 세션 유지를 위한 <span className="font-semibold text-white">필수 쿠키</span>만 사용합니다.
            추적·광고 쿠키는 사용하지 않습니다.{" "}
            <Link href="/privacy" className="text-brand-400 hover:underline text-xs">
              개인정보처리방침
            </Link>
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-500 text-brand-600 focus:ring-brand-400 cursor-pointer flex-shrink-0"
            />
            <span className="text-xs text-neutral-300">쿠키 사용에 동의합니다</span>
          </label>
        </div>
        <button
          onClick={accept}
          disabled={!agreed}
          className={`flex-shrink-0 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            agreed
              ? "bg-brand-600 hover:bg-brand-700 text-white"
              : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
          }`}>
          동의하고 계속
        </button>
      </div>
    </div>
  );
}
