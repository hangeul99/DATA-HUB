import { NextResponse } from "next/server";
import { createAdminClient, requireAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: { action?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { action, id } = body;

  const db = createAdminClient();

  switch (action) {
    case "approve-application":
    case "reject-application": {
      if (!id) return NextResponse.json({ error: "id 누락" }, { status: 400 });
      const status = action === "approve-application" ? "approved" : "rejected";
      const { error } = await db.from("applications").update({ status }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, status });
    }

    case "approve-access":
    case "reject-access": {
      if (!id) return NextResponse.json({ error: "id 누락" }, { status: 400 });

      // 클라이언트 제공 userId 대신 서버에서 직접 user_id 조회 (권한 남용 차단)
      const { data: req } = await db
        .from("access_requests")
        .select("user_id")
        .eq("id", id)
        .maybeSingle();
      if (!req) return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });

      const status = action === "approve-access" ? "approved" : "rejected";
      const { error } = await db.from("access_requests").update({ status }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      if (action === "approve-access") {
        const { error: pErr } = await db
          .from("profiles")
          .update({ local_data_approved: true })
          .eq("id", req.user_id);
        if (pErr) {
          // 프로필 업데이트 실패 시 access_requests 상태 롤백
          await db.from("access_requests").update({ status: "pending" }).eq("id", id);
          return NextResponse.json({ error: `권한 부여 실패 (롤백됨): ${pErr.message}` }, { status: 500 });
        }
      }
      return NextResponse.json({ success: true, status });
    }

    case "deactivate-dataset": {
      if (!id) return NextResponse.json({ error: "id 누락" }, { status: 400 });
      const { error } = await db.from("datasets").update({ is_active: false }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "알 수 없는 작업입니다." }, { status: 400 });
  }
}
