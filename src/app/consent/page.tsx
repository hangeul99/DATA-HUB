"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, CheckCircle, Database } from "lucide-react";

const CONSENT_ITEMS = [
  { id: "privacy", required: true, title: "[필수] 개인정보 수집 및 이용 동의", content: "성명, 이메일, 소속기관, 연락처를 수집하며, 데이터 이용 신청 및 서비스 운영 목적으로 사용합니다. 보유기간은 회원 탈퇴 시까지입니다." },
  { id: "terms", required: true, title: "[필수] 서비스 이용약관 동의", content: "인제대학교 데이터거버넌스센터 서비스를 이용하는 조건 및 규정에 동의합니다. 데이터 무단 재배포, 상업적 재판매 등 금지 행위를 위반할 시 이용이 제한됩니다." },
  { id: "thirdparty", required: false, title: "[선택] 마케팅 정보 수신 동의", content: "신규 데이터셋 업데이트, 공지사항 등의 정보를 이메일로 수신합니다. 미동의 시에도 서비스 이용이 가능합니다." },
];

export default function ConsentPage() {
  const router = useRouter();
  const [checks, setChecks] = useState<Record<string, boolean>>({ privacy: false, terms: false, thirdparty: false });
  const [allChecked, setAllChecked] = useState(false);

  const toggle = (id: string) => {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    setAllChecked(Object.values(next).every(Boolean));
  };

  const toggleAll = (v: boolean) => {
    const next = Object.fromEntries(CONSENT_ITEMS.map(i => [i.id, v]));
    setChecks(next);
    setAllChecked(v);
  };

  const canProceed = checks.privacy && checks.terms;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <Database size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl text-neutral-900">인제대학교 데이터거버넌스센터</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900">서비스 이용 동의</h1>
          <p className="text-sm text-neutral-500 mt-1">인제대학교 데이터거버넌스센터 이용을 위해 아래 항목에 동의해주세요.</p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 space-y-4">
          {/* 전체 동의 */}
          <label className="flex items-center gap-3 p-4 bg-brand-50 rounded-xl cursor-pointer">
            <input type="checkbox" checked={allChecked} onChange={e => toggleAll(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-600" />
            <span className="font-bold text-neutral-900 text-sm">전체 동의 (선택 포함)</span>
          </label>

          <div className="border-t border-neutral-100 pt-4 space-y-4">
            {CONSENT_ITEMS.map(item => (
              <div key={item.id} className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={checks[item.id]} onChange={() => toggle(item.id)}
                    className="mt-0.5 w-4 h-4 rounded accent-brand-600" />
                  <span className={`text-sm font-semibold ${item.required ? "text-neutral-900" : "text-neutral-600"}`}>
                    {item.title}
                  </span>
                </label>
                <div className="ml-7 text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3 leading-relaxed">
                  {item.content}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => canProceed && router.push("/")}
            disabled={!canProceed}
            className={`w-full font-semibold py-4 rounded-xl transition-all active:scale-95 mt-2 ${canProceed ? "bg-brand-600 hover:bg-brand-700 text-white shadow-brand" : "bg-neutral-200 text-neutral-400 cursor-not-allowed"}`}
          >
            {canProceed ? "동의하고 시작하기" : "필수 항목에 동의해주세요"}
          </button>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-4">
          인제대학교 데이터거버넌스센터는 개인정보보호법에 따라 회원의 개인정보를 보호합니다.
        </p>
      </div>
    </div>
  );
}
