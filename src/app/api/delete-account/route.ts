import { NextResponse } from "next/server";
import { createAdminClient, getRequestUser } from "@/lib/supabase/admin";

// ── 회원탈퇴 요청 — 30일 유예기간 소프트 딜리트 ────────────────────
// 즉시 삭제하지 않고 auth 메타데이터에 삭제 예정 플래그만 기록한다.
// - 30일 이내에 /account-recovery 에서 복구 가능
// - 30일 경과 후 /api/cron/purge-deleted 가 실제 삭제 수행
// - proxy.ts 가 deletion_scheduled=true 사용자를 복구 페이지로 강제 이동
export async function DELETE() {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const admin = createAdminClient();

  // 이미 탈퇴 예정 상태면 중복 처리 방지
  if (user.user_metadata?.deletion_scheduled === true) {
    return NextResponse.json({ error: "이미 탈퇴 신청된 계정입니다." }, { status: 409 });
  }

  const scheduledAt = new Date().toISOString();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      deletion_scheduled: true,
      deletion_scheduled_at: scheduledAt,
    },
  });

  if (error) {
    return NextResponse.json({ error: "탈퇴 처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  const deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return NextResponse.json({ success: true, deletion_date: deletionDate });
}
