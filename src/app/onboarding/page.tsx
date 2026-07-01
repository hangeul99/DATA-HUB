"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Database } from "lucide-react";

/**
 * 온보딩 페이지
 * - 소셜 로그인 직후 organization 미입력 사용자에게 표시
 * - proxy.ts에서 ?redirect= 파라미터로 원래 목적지를 전달
 * - 소속기관 입력 후 profiles 테이블 업데이트 → redirect 경로로 이동
 */
function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [organization, setOrganization] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // 이미 온보딩 완료한 사용자는 목적지(또는 홈)로 이동
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization")
        .eq("id", user.id)
        .single();
      if (profile?.organization) router.replace(redirectTo);
    });
  }, [router, redirectTo]);

  // 소속기관을 profiles 테이블에 저장 후 목적지로 이동
  const handleSubmit = async () => {
    if (!organization.trim()) { setError("소속기관을 입력해주세요."); return; }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ organization: organization.trim() })
      .eq("id", user.id);

    if (updateErr) {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
      setSubmitting(false);
      return;
    }

    router.replace(redirectTo);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 sm:p-8 w-full max-w-md">

        {/* 로고 */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Database size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 leading-none mb-0.5">인제대학교</p>
            <p className="text-sm font-bold text-neutral-900 leading-none">데이터거버넌스센터</p>
          </div>
        </div>

        <h1 className="text-xl font-bold text-neutral-900 mb-1">소속기관 입력</h1>
        <p className="text-sm text-neutral-500 mb-7">서비스 이용을 위해 소속기관을 입력해주세요.</p>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            소속기관 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={organization}
            onChange={(e) => { setOrganization(e.target.value); setError(null); }}
            placeholder="예: 인제대학교, 김해시청, (주)인제소프트"
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
            submitting
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

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}
