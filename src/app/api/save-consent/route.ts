import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getRequestUser } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const marketingOptIn = body?.marketing === true;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      consented_at: new Date().toISOString(),
      marketing_opted_in: marketingOptIn,
    },
  });

  if (error) return NextResponse.json({ error: "동의 기록 저장 중 오류가 발생했습니다." }, { status: 500 });
  return NextResponse.json({ success: true });
}
