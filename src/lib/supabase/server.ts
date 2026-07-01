import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  // "로그인 상태 유지"를 끈 경우(dh_keep=0) 서버가 쓰는 인증 쿠키도 세션 쿠키로 만든다.
  // (구글 OAuth 콜백 등 서버에서 쿠키를 쓰는 경로까지 정책을 일관되게 적용)
  const sessionOnly = cookieStore.get("dh_keep")?.value === "0";

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = { ...options };
              if (sessionOnly) {
                delete opts.maxAge;
                delete opts.expires;
              }
              cookieStore.set(name, value, opts);
            });
          } catch {
            // 서버 컴포넌트에서는 쿠키 쓰기 무시
          }
        },
      },
    }
  );
}
