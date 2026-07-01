import { NextResponse } from "next/server";
import { createAdminClient, getRequestUser } from "@/lib/supabase/admin";

// ── 회원탈퇴 취소 (30일 유예기간 내 계정 복구) ─────────────────────
export async function POST() {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (!user.user_metadata?.deletion_scheduled) {
    return NextResponse.json({ error: "탈퇴 예정 계정이 아닙니다." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      deletion_scheduled: false,
      deletion_scheduled_at: null,
    },
  });

  if (error) {
    return NextResponse.json({ error: "복구 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
