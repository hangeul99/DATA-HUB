import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 이메일 회원가입 시 metadata에 저장된 organization을 profiles에 반영
      const { data: { user } } = await supabase.auth.getUser();
      const org = user?.user_metadata?.organization as string | undefined;
      if (user && org) {
        await supabase
          .from("profiles")
          .update({ organization: org })
          .eq("id", user.id)
          .is("organization", null); // 이미 설정된 경우 덮어쓰지 않음
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
