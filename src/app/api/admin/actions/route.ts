import { NextResponse } from "next/server";
import { createAdminClient, requireAdmin } from "@/lib/supabase/admin";

// ── 관리자 전용 민감 작업 처리 라우트 ──────────────────────────────
// 신청 승인·반려, 접근권한 승인·거절(local_data_approved 부여),
// 데이터셋 비활성화처럼 "권한이 걸린 쓰기"는 브라우저에서 직접 DB를
// 고치면 RLS 설정에만 안전이 의존한다(규칙 1-2). 그래서 서버에서
// role=admin을 먼저 검증한 뒤 service_role로 처리해, 일반 사용자가
// 개발자도구로 자기 신청을 스스로 승인하는 우회를 원천 차단한다.
export async function POST(request: Request) {
  // 1. 요청자가 관리자인지 서버에서 검증
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  // 2. 요청 본문 파싱
  let body: { action?: string; id?: string; userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { action, id, userId } = body;

  const db = createAdminClient();

  // 3. 액션별 처리
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
      const status = action === "approve-access" ? "approved" : "rejected";
      const { error } = await db.from("access_requests").update({ status }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // 승인 시에만 해당 사용자에게 지역/업체 데이터 접근 권한 부여
      if (action === "approve-access" && userId) {
        const { error: pErr } = await db.from("profiles").update({ local_data_approved: true }).eq("id", userId);
        if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
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
