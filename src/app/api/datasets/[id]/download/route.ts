import { NextResponse } from "next/server";
import { createAdminClient, getRequestUser } from "@/lib/supabase/admin";

// ── 데이터셋 다운로드 URL 발급 (서버에서 승인 여부 강제) ───────────
// 다운로드 가능 여부를 화면에서만 막으면, 승인 안 받은 사용자가
// 개발자도구로 직접 서명 URL을 만들어 받을 수 있다(규칙 1-1).
// 그래서 서버에서 "이 사용자가 이 데이터셋을 승인(approved)받았는지"를
// 직접 확인한 뒤에만 서명 URL을 발급한다.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: datasetId } = await params;

  // 1. 로그인 확인
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const db = createAdminClient();

  // 2. 승인된 신청이 있는지 서버에서 확인 (없으면 다운로드 거부)
  const { data: app } = await db
    .from("applications")
    .select("status")
    .eq("user_id", user.id)
    .eq("dataset_id", datasetId)
    .eq("status", "approved")
    .limit(1)
    .maybeSingle();
  if (!app) {
    return NextResponse.json({ error: "다운로드 권한이 없습니다." }, { status: 403 });
  }

  // 3. 데이터셋 파일 경로 조회
  const { data: ds } = await db
    .from("datasets")
    .select("file_path")
    .eq("id", datasetId)
    .maybeSingle();
  if (!ds?.file_path) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 404 });
  }

  // 4. 1시간짜리 서명 URL 발급
  const { data: signed, error } = await db.storage
    .from("datasets")
    .createSignedUrl(ds.file_path, 3600);
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "다운로드 URL 생성 실패" }, { status: 500 });
  }

  // 숫자 prefix 제거한 깔끔한 파일명도 함께 전달
  const rawName = ds.file_path.split("/").pop() ?? "download";
  const cleanName = rawName.replace(/^\d+_/, "");

  // 5. 다운로드 로그 + 카운트 증가 — 서버에서 보장 (클라이언트 의존 제거)
  await Promise.all([
    db.from("download_logs").insert({ user_id: user.id, dataset_id: datasetId }),
    db.rpc("increment_dataset_downloads", { dataset_id: datasetId }),
  ]);

  return NextResponse.json({ url: signed.signedUrl, filename: cleanName });
}
