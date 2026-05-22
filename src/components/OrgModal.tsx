"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Database } from "lucide-react";


/**
 * 구글 등 소셜 로그인 후 소속기관이 미입력된 경우 홈 화면에 표시되는 모달
 * 한 번 입력하면 profiles 테이블에 저장되고 이후에는 나타나지 않음
 */
export default function OrgModal() {
  const [show, setShow]             = useState(false);
  const [name, setName]             = useState("");
  const [organization, setOrg]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [agreed, setAgreed]         = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization, name")
        .eq("id", user.id)
        .single();
      if (profile && !profile.organization) {
        setName(profile.name ?? user.user_metadata?.full_name ?? "");
        setShow(true);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!agreed) { setError("개인정보처리방침에 동의해주세요."); return; }
    if (!name.trim()) { setError("이름을 입력해주세요."); return; }
    if (!organization.trim()) { setError("소속기관을 입력해주세요."); return; }
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ name: name.trim(), organization: organization.trim() })
      .eq("id", user.id);

    if (updateErr) {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
      setSubmitting(false);
    } else {
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    // 반투명 오버레이
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-100 p-8 w-full max-w-md">

        {/* 로고 */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Database size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 leading-none mb-0.5">인제대학교</p>
            <p className="text-sm font-bold text-neutral-900 leading-none">데이터거버넌스센터</p>
          </div>
        </div>

        <h2 className="text-lg font-bold text-neutral-900 mb-1">추가 정보를 입력해주세요</h2>
        <p className="text-sm text-neutral-500 mb-6">서비스 이용을 위해 한 번만 입력하면 됩니다.</p>

        <div className="mb-3">
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            placeholder="홍길동"
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            autoFocus
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            소속기관 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={organization}
            onChange={(e) => { setOrg(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="예: 인제대학교, 김해시청, (주)인제소프트"
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => { setAgreed(e.target.checked); setError(null); }}
            className="w-4 h-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-400 cursor-pointer flex-shrink-0"
          />
          <span className="text-xs text-neutral-500 whitespace-nowrap">
            <Link href="/privacy" target="_blank" className="text-brand-600 hover:underline font-semibold">개인정보처리방침</Link>
            {" "}동의 <span className="text-red-400">(필수)</span>
          </span>
        </label>

        <button
          onClick={handleSubmit}
          disabled={submitting || !agreed}
          className={`w-full py-3 rounded-xl font-semibold text-sm active:scale-95 ${
            submitting || !agreed
              ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              : "bg-brand-600 hover:bg-brand-700 text-white"
          }`}
        >
          {submitting ? "저장 중..." : "시작하기"}
        </button>
      </div>
    </div>
  );
}
