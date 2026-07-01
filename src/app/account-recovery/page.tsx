"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Trash2, RotateCcw, AlertTriangle } from "lucide-react";

export default function AccountRecoveryPage() {
  const router = useRouter();
  const [deletionDate, setDeletionDate] = useState<Date | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      if (!user.user_metadata?.deletion_scheduled) { router.replace("/"); return; }

      const scheduledAt = user.user_metadata?.deletion_scheduled_at;
      if (scheduledAt) {
        const delDate = new Date(new Date(scheduledAt).getTime() + 30 * 24 * 60 * 60 * 1000);
        setDeletionDate(delDate);
        const msLeft = delDate.getTime() - Date.now();
        setDaysLeft(Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000))));
      }
      setLoading(false);
    });
  }, [router]);

  const handleRecover = async () => {
    setRecovering(true);
    const res = await fetch("/api/recover-account", { method: "POST" });
    if (res.ok) {
      // 복구 후 세션 갱신 (JWT 메타데이터 재로드)
      await createClient().auth.refreshSession();
      router.push("/");
      router.refresh();
    } else {
      alert("복구 중 오류가 발생했습니다. 다시 시도해주세요.");
      setRecovering(false);
    }
  };

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 sm:p-8 w-full max-w-md text-center">
        {/* 아이콘 */}
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={28} className="text-amber-500" />
        </div>

        <h1 className="text-xl font-bold text-neutral-900 mb-2">탈퇴 신청 완료</h1>
        <p className="text-sm text-neutral-500 leading-relaxed mb-6">
          회원탈퇴 신청이 접수됐습니다.<br />
          {deletionDate && (
            <>
              <span className="font-semibold text-red-500">
                {deletionDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </span>
              {" "}(약 <span className="font-semibold text-red-500">{daysLeft}일 후</span>)에
            </>
          )}
          {" "}계정과 모든 데이터가 영구 삭제됩니다.
        </p>

        {/* D-day 배지 */}
        {daysLeft !== null && (
          <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm font-semibold px-4 py-2 rounded-full mb-8">
            <Trash2 size={14} />
            삭제까지 D-{daysLeft}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* 계정 복구 */}
          <button
            onClick={handleRecover}
            disabled={recovering}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors active:scale-95"
          >
            {recovering ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RotateCcw size={16} />
            )}
            {recovering ? "복구 중..." : "계정 복구하기"}
          </button>

          {/* 로그아웃 (탈퇴 유지) */}
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-500 hover:bg-neutral-50 transition-colors"
          >
            탈퇴 유지하고 로그아웃
          </button>
        </div>

        <p className="mt-6 text-xs text-neutral-400 leading-relaxed">
          유예기간 동안은 서비스 이용이 제한됩니다.<br />
          계정 복구를 원하시면 위 버튼을 눌러주세요.
        </p>
      </div>
    </div>
  );
}
