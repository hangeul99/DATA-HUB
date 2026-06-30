import { NextResponse } from "next/server";
import { createAdminClient, getRequestUser } from "@/lib/supabase/admin";

export async function DELETE() {
  // 현재 로그인 유저 확인 (서버에서 토큰 검증)
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // 서비스 롤 클라이언트 (RLS 우회 — 유저 삭제 + 관련 데이터 정리 권한)
  const admin = createAdminClient();

  // ── 1. 사용자 관련 개인정보를 명시적으로 모두 삭제 ──────────────
  // FK가 ON DELETE CASCADE로 설정돼 있지 않더라도 연락처·소속 등
  // 개인정보가 DB에 남지 않도록 직접 지운다(개인정보보호법 — 규칙 2-4).
  // 자식 테이블(신청·로그·결과물·댓글·게시글·접근신청)을 먼저 지우고
  // 마지막에 profiles → auth 유저 순으로 삭제한다.
  const uid = user.id;
  await Promise.all([
    admin.from("applications").delete().eq("user_id", uid),
    admin.from("download_logs").delete().eq("user_id", uid),
    admin.from("results").delete().eq("user_id", uid),
    admin.from("access_requests").delete().eq("user_id", uid),
    admin.from("comments").delete().eq("user_id", uid),
    admin.from("posts").delete().eq("user_id", uid),
  ]);
  // 프로필 행 삭제 (위 자식 행 정리 후)
  await admin.from("profiles").delete().eq("id", uid);

  // ── 2. 인증 계정(Auth) 삭제 ────────────────────────────────────
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) {
    return NextResponse.json({ error: "탈퇴 처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
