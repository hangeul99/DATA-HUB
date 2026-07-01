import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 분당 IP별 최대 요청 수 (서버리스 인스턴스 내 제한 — 완벽하지 않으나 기본 방어)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_MIN = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= MAX_PER_MIN) return true;
  entry.count++;
  return false;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  // IP 기반 요청 제한
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ available: false }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";

  // 이메일 형식 검증 — 잘못된 형식이면 조회 없이 즉시 반환
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ available: false });
  }

  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  return NextResponse.json({ available: !data });
}
