import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!email) return NextResponse.json({ available: false });

  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  return NextResponse.json({ available: !data });
}
