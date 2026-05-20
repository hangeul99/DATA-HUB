import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// 로그인이 필요한 경로 목록
const PROTECTED  = ["/mypage", "/datasets/apply", "/analysis"];
// 관리자 전용 경로 목록 (비관리자 접근 시 404로 위장)
const ADMIN_PATHS = ["/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Supabase 세션 쿠키를 읽어 응답에 갱신 (SSR 세션 유지)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser()는 Supabase 서버에서 토큰을 검증 — getSession()보다 신뢰성 높음
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  // 환경변수에서 관리자 이메일 목록 로드 (쉼표 구분)
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "lhg9449@gmail.com")
    .split(",").map((e) => e.trim());
  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email ?? "");

  // ── 1. 관리자 전용 경로 — 비관리자는 /not-found 로 리라이트 ──
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (!isAdmin) {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }
  }

  // ── 2. 로그인 필요 정적 경로 ──────────────────────────────────
  if (PROTECTED.some((p) => pathname.startsWith(p))) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── 3. datasets/[id]/apply 동적 경로 ─────────────────────────
  if (pathname.match(/^\/datasets\/[^/]+\/apply/)) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── 보안 헤더 설정 ────────────────────────────────────────────
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  supabaseResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  supabaseResponse.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "font-src 'self' https://cdn.jsdelivr.net",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    ].join("; ")
  );

  return supabaseResponse;
}

// 정적 파일 및 이미지 경로는 미들웨어 제외
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
