import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// ── 서비스 롤(관리자 권한) 클라이언트 ──────────────────────────────
// service_role 키는 RLS를 우회하는 강력한 키이므로 절대 브라우저로
// 노출하면 안 되고(서버 라우트에서만 사용), 권한 검증을 통과한 뒤에만
// 이 클라이언트로 DB/스토리지를 조작한다.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ── 현재 요청자가 로그인 사용자인지 확인 ───────────────────────────
// 반환: 로그인 유저 또는 null
export async function getRequestUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ── 현재 요청자가 관리자(role=admin)인지 서버에서 검증 ─────────────
// 화면이 아니라 서버에서 role을 직접 확인하므로, 개발자도구로 우회 불가.
// 반환: 관리자면 user, 아니면 null
export async function requireAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}
