import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Supabase 무료 플랜 7일 자동 일시정지 방지 핑 ──────────────────────────
// vercel.json: { "path": "/api/cron/ping-db", "schedule": "0 12 */5 * *" }
// 5일마다 실행해 DB가 잠들지 않게 유지. CRON_SECRET으로 외부 호출 차단.
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").select("id").limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
}
