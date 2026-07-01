import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── 30일 유예기간 만료 계정 실제 삭제 (Vercel Cron / 관리자 수동 호출) ──
// vercel.json: { "crons": [{ "path": "/api/cron/purge-deleted", "schedule": "0 2 * * *" }] }
// 매일 새벽 2시 실행. CRON_SECRET 환경변수로 외부 호출 차단.
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // deletion_scheduled=true 이고 신청일로부터 30일 초과한 Auth 유저 목록 조회
  const GRACE_DAYS = 30;
  const cutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const targets = (users ?? []).filter(
    (u) =>
      u.user_metadata?.deletion_scheduled === true &&
      u.user_metadata?.deletion_scheduled_at &&
      u.user_metadata.deletion_scheduled_at < cutoff
  );

  let deleted = 0;
  const errors: string[] = [];

  for (const u of targets) {
    const uid = u.id;
    try {
      // 1. 게시글 첨부파일 경로 수집
      const { data: posts } = await admin
        .from("posts").select("attachment_path").eq("user_id", uid).not("attachment_path", "is", null);

      // 2. 자식 테이블 삭제
      await Promise.all([
        admin.from("applications").delete().eq("user_id", uid),
        admin.from("download_logs").delete().eq("user_id", uid),
        admin.from("analysis_logs").delete().eq("user_id", uid),
        admin.from("results").delete().eq("user_id", uid),
        admin.from("access_requests").delete().eq("user_id", uid),
        admin.from("comments").delete().eq("user_id", uid),
        admin.from("posts").delete().eq("user_id", uid),
      ]);

      // 3. 첨부파일 Storage 삭제
      if (posts && posts.length > 0) {
        const paths = posts.map((p) => p.attachment_path as string);
        await admin.storage.from("post-attachments").remove(paths);
      }

      // 4. Auth 삭제 → profiles 삭제
      const { error: authErr } = await admin.auth.admin.deleteUser(uid);
      if (authErr) { errors.push(`${uid}: ${authErr.message}`); continue; }
      await admin.from("profiles").delete().eq("id", uid);

      deleted++;
    } catch (e) {
      errors.push(`${uid}: ${String(e)}`);
    }
  }

  return NextResponse.json({ success: true, deleted, errors, total: targets.length });
}
