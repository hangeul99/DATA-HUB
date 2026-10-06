"use client";

/* ============================================================
   AccessRequestModal — 지역/업체 데이터 접근 권한 신청 팝업

   데이터 탐색 목록과 데이터 상세 페이지에서 같이 씁니다.
   onSubmit: 사유를 받아 access_requests 에 저장하는 함수 (부모가 넘김)
============================================================ */

import { useState } from "react";
import { Lock, Unlock, X, Loader2 } from "lucide-react";

export default function AccessRequestModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    await onSubmit(reason.trim());
    setDone(true);
    setSubmitting(false);
  };

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <Unlock size={24} className="text-emerald-600" />
        </div>
        <h3 className="mb-2 text-lg font-bold">신청 완료</h3>
        <p className="mb-6 text-sm text-neutral-500">센터가 검토한 뒤 승인되면 지역/업체 데이터를 신청할 수 있습니다.</p>
        <button onClick={onClose} className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition-colors hover:bg-brand-700">확인</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-accent-600" />
            <h3 className="text-lg font-bold text-neutral-900">지역/업체 데이터 접근 신청</h3>
          </div>
          <button onClick={onClose} aria-label="닫기" className="rounded-lg p-1.5 transition-colors hover:bg-neutral-100"><X size={16} /></button>
        </div>
        <p className="mb-5 text-sm leading-relaxed text-neutral-500">
          지역/업체 데이터는 센터 승인 후 이용할 수 있습니다.<br />
          아래에 접근이 필요한 이유를 작성해 주세요.
        </p>
        <label htmlFor="access-reason" className="sr-only">접근이 필요한 이유</label>
        <textarea
          id="access-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예) 지역 소상공인 분석 연구에 활용하고자 합니다."
          rows={4}
          className="w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-brand-400"
        />
        <button
          onClick={handleSubmit}
          disabled={!reason.trim() || submitting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 font-semibold text-white transition-colors hover:bg-brand-700 active:scale-95 disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? "신청 중..." : "접근 권한 신청"}
        </button>
      </div>
    </div>
  );
}
