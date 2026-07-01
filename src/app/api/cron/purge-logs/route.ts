import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── 서비스 이용 기록 1년 자동 파기 (개인정보보호법 제21조) ──────────────
// vercel.json: { "crons": [{ "path": "/api/cron/purge-logs", "schedule": "0 3 * * *" }] }
// 매일 새벽 3시 실행. CRON_SECRET 환경변수로 외부 호출 차단.
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

  const [downloadResult, analysisResult] = await Promise.all([
    admin.from("download_logs").delete().lt("downloaded_at", cutoff),
    admin.from("analysis_logs").delete().lt("created_at", cutoff),
  ]);

  const errors: string[] = [];
  if (downloadResult.error) errors.push(`download_logs: ${downloadResult.error.message}`);
  if (analysisResult.error) errors.push(`analysis_logs: ${analysisResult.error.message}`);

  return NextResponse.json({ success: errors.length === 0, errors });
}
