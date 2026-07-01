import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

// "로그인 상태 유지"를 끈 경우(dh_keep=0)에는 인증 쿠키를 '세션 쿠키'로 만들어
// 브라우저를 닫으면 자동으로 로그아웃되게 한다. (공용 PC 대비)
// dh_keep 쿠키가 없거나 "1"이면 기존과 동일하게 만료(약 400일)를 유지한다.
function isSessionOnly(): boolean {
  if (typeof document === "undefined") return false;
  return parse(document.cookie)["dh_keep"] === "0";
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // @supabase/ssr 브라우저 기본 구현(document.cookie 사용)을 그대로 복제하되,
      // 세션 전용 모드일 때만 maxAge/expires를 제거한다.
      cookies: {
        getAll() {
          if (typeof document === "undefined") return [];
          const parsed = parse(document.cookie);
          return Object.keys(parsed).map((name) => ({ name, value: parsed[name] ?? "" }));
        },
        setAll(cookiesToSet) {
          if (typeof document === "undefined") return;
          const sessionOnly = isSessionOnly();
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = { ...options };
            if (sessionOnly) {
              // 만료 정보를 없애면 브라우저 종료 시 삭제되는 세션 쿠키가 된다.
              delete opts.maxAge;
              delete opts.expires;
            }
            document.cookie = serialize(name, value, opts);
          });
        },
      },
    }
  );
}
