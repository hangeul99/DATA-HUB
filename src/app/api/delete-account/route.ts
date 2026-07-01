import { NextResponse } from "next/server";
import { createAdminClient, getRequestUser } from "@/lib/supabase/admin";

export async function DELETE() {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const admin = createAdminClient();
  const uid = user.id;

  // ── 1. 게시글 첨부파일 경로 수집 (Storage 삭제를 위해 먼저 조회) ──
  const { data: userPosts } = await admin
    .from("posts")
    .select("attachment_path")
    .eq("user_id", uid)
    .not("attachment_path", "is", null);

  // ── 2. 자식 테이블 개인정보 삭제 (오류 발생 시 중단 — 데이터 잔류 방지) ──
  const delResults = await Promise.all([
    admin.from("applications").delete().eq("user_id", uid),
    admin.from("download_logs").delete().eq("user_id", uid),
    admin.from("results").delete().eq("user_id", uid),
    admin.from("access_requests").delete().eq("user_id", uid),
    admin.from("comments").delete().eq("user_id", uid),
    admin.from("posts").delete().eq("user_id", uid),
  ]);
  const childErr = delResults.find((r) => r.error);
  if (childErr) {
    return NextResponse.json({ error: "데이터 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }

  // ── 3. 게시글 첨부파일 Storage 삭제 (잊힐 권리 — 개인정보보호법) ──
  if (userPosts && userPosts.length > 0) {
    const paths = userPosts.map((p) => p.attachment_path as string);
    await admin.storage.from("post-attachments").remove(paths);
  }

  // ── 4. Auth 계정 먼저 삭제 — 실패 시 profiles를 그대로 보존 ──────
  // (profiles 먼저 지우면 deleteUser 실패 시 로그인 가능한 고아 계정 발생)
  const { error: authErr } = await admin.auth.admin.deleteUser(uid);
  if (authErr) {
    return NextResponse.json({ error: "탈퇴 처리 중 오류가 발생했습니다." }, { status: 500 });
  }

  // ── 5. profiles 삭제 (Auth 삭제 확인 후) ─────────────────────────
  await admin.from("profiles").delete().eq("id", uid);

  return NextResponse.json({ success: true });
}
