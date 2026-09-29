"use client";

/* ============================================================
   BulkImportModal — 데이터허브 폴더 일괄 등록 (관리자 전용)

   사용법
   1) 관리자 페이지 > 데이터 관리 > "폴더 일괄 등록"
   2) PC의 "데이터허브" 폴더를 통째로 선택
   3) 00_관리/사이트등록_목록.json 을 읽어 등록할 목록을 보여줌
      - 이미 같은 제목으로 등록된 데이터는 자동으로 체크 해제
      - 파일이 없거나 50MB를 넘으면 등록 불가로 표시
   4) "선택한 N건 등록" → 한 건씩 파일 업로드 + 목록 등록

   ★ 권한: 관리자 로그인 세션으로 올림 (DB·저장소 규칙이 관리자만 허용)
   ★ 파일은 브라우저에서 바로 Supabase로 전송되며, 선택한 폴더의 다른 파일은 읽지 않음
============================================================ */

import { useEffect, useRef, useState } from "react";
import { CheckCircle, FolderOpen, Loader2, X, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MANIFEST_PATH = "00_관리/사이트등록_목록.json";
const MAX_MB = 50; // 데이터 파일 1개 용량 상한 (관리자 단건 등록과 동일)

interface ManifestItem {
  no: string;
  file: string;          // 데이터허브 폴더 기준 상대 경로
  title: string;
  category: string;
  year: string;
  tags: string[];
  description: string;
}

type RowStatus = "ready" | "exists" | "missing" | "too-big" | "uploading" | "done" | "error";

interface Row {
  item: ManifestItem;
  file: File | null;
  checked: boolean;
  status: RowStatus;
  message?: string;
}

const STATUS_LABEL: Record<RowStatus, string> = {
  ready: "등록 대기",
  exists: "이미 등록됨",
  missing: "파일 없음",
  "too-big": `${MAX_MB}MB 초과`,
  uploading: "올리는 중",
  done: "등록 완료",
  error: "실패",
};

const STATUS_STYLE: Record<RowStatus, string> = {
  ready: "bg-neutral-100 text-neutral-600",
  exists: "bg-amber-50 text-amber-700",
  missing: "bg-red-50 text-red-600",
  "too-big": "bg-red-50 text-red-600",
  uploading: "bg-brand-50 text-brand-700",
  done: "bg-brand-600 text-white",
  error: "bg-red-600 text-white",
};

function fmtSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function BulkImportModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  // 폴더 선택 창을 열 수 있도록 비표준 속성 부여 (React가 타입을 모르는 속성)
  useEffect(() => {
    inputRef.current?.setAttribute("webkitdirectory", "");
    inputRef.current?.setAttribute("directory", "");
  }, []);

  // ── 폴더를 고르면: 목록 파일 읽기 → 실제 파일 찾기 → 이미 등록된 제목 확인 ──
  const onPickFolder = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null); setRows([]); setFinished(false); setReading(true);
    try {
      const all = Array.from(files);
      const manifestFile = all.find((f) => f.webkitRelativePath.endsWith(MANIFEST_PATH));
      if (!manifestFile) {
        setError(`선택한 폴더에서 ${MANIFEST_PATH} 파일을 찾지 못했습니다. "데이터허브" 폴더 자체를 선택해 주세요.`);
        return;
      }
      // 선택한 폴더 이름(예: "데이터허브/") → 목록의 상대 경로 앞에 붙여서 파일을 찾음
      const root = manifestFile.webkitRelativePath.slice(0, -MANIFEST_PATH.length);
      const byPath = new Map(all.map((f) => [f.webkitRelativePath, f]));

      const manifest = JSON.parse(await manifestFile.text()) as { items: ManifestItem[] };
      if (!Array.isArray(manifest.items)) throw new Error("목록 파일 형식이 올바르지 않습니다 (items 없음).");

      // 이미 등록된 제목 (중복 등록 방지)
      const { data: existing } = await createClient().from("datasets").select("title");
      const existingTitles = new Set((existing ?? []).map((d) => d.title));

      setRows(manifest.items.map((item) => {
        const file = byPath.get(root + item.file) ?? null;
        let status: RowStatus = "ready";
        if (!file) status = "missing";
        else if (file.size > MAX_MB * 1024 * 1024) status = "too-big";
        else if (existingTitles.has(item.title)) status = "exists";
        return { item, file, status, checked: status === "ready" };
      }));
    } catch (e) {
      setError(`목록을 읽는 중 오류가 났습니다: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setReading(false);
    }
  };

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // ── 선택한 항목을 한 건씩 등록 (하나가 실패해도 나머지는 계속) ──
  const runImport = async () => {
    setRunning(true);
    const supabase = createClient();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.checked || !row.file) continue;
      updateRow(i, { status: "uploading", message: undefined });

      // 저장소 경로는 영문·숫자만 (한글 파일명은 저장소에서 문제를 일으킬 수 있음)
      const ext = row.file.name.split(".").pop()?.toLowerCase() ?? "dat";
      const path = `uploads/${Date.now()}_hub${row.item.no}.${ext}`;

      const { error: upErr } = await supabase.storage.from("datasets").upload(path, row.file, { upsert: false });
      if (upErr) { updateRow(i, { status: "error", message: `파일 업로드 실패: ${upErr.message}` }); continue; }

      const { error: dbErr } = await supabase.from("datasets").insert({
        title: row.item.title,
        category: row.item.category,
        year: row.item.year,
        description: row.item.description,
        tags: row.item.tags,
        file_path: path,
        file_size: row.file.size,
        is_active: true,
      });
      if (dbErr) {
        // 목록 등록이 실패하면 방금 올린 파일도 지워서 저장소에 찌꺼기가 남지 않게 함
        await supabase.storage.from("datasets").remove([path]);
        updateRow(i, { status: "error", message: `목록 등록 실패: ${dbErr.message}` });
        continue;
      }
      updateRow(i, { status: "done", checked: false });
    }

    setRunning(false);
    setFinished(true);
    onUploaded();
  };

  const selectable = rows.filter((r) => r.status === "ready" || r.status === "exists" || r.status === "error");
  const checkedCount = rows.filter((r) => r.checked).length;
  const doneCount = rows.filter((r) => r.status === "done").length;
  const errorCount = rows.filter((r) => r.status === "error").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white">
        {/* 머리글 */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">폴더 일괄 등록</h3>
            <p className="mt-0.5 text-sm text-neutral-500">데이터허브 폴더를 선택하면 사이트등록_목록.json 기준으로 한 번에 등록합니다.</p>
          </div>
          <button onClick={onClose} disabled={running} className="rounded-lg p-1.5 hover:bg-neutral-100 disabled:opacity-40" aria-label="닫기"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* 폴더 선택 */}
          <label htmlFor="bulk-folder"
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 py-6 text-sm font-semibold text-neutral-600 hover:border-brand-300 hover:bg-brand-50/40 ${running ? "pointer-events-none opacity-50" : ""}`}>
            {reading ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} />}
            {reading ? "목록을 읽는 중…" : rows.length ? "다른 폴더 선택" : "데이터허브 폴더 선택"}
          </label>
          <input id="bulk-folder" ref={inputRef} type="file" multiple className="sr-only"
            onChange={(e) => onPickFolder(e.target.files)} />

          {error && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={16} className="mt-0.5 flex-none" /> {error}
            </p>
          )}

          {/* 등록 목록 */}
          {rows.length > 0 && (
            <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-100">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
                  <tr>
                    <th className="w-10 px-3 py-2.5">
                      <input type="checkbox" aria-label="전체 선택" disabled={running}
                        checked={selectable.length > 0 && selectable.every((r) => r.checked)}
                        onChange={(e) => setRows((prev) => prev.map((r) =>
                          (r.status === "ready" || r.status === "exists" || r.status === "error") ? { ...r, checked: e.target.checked } : r))} />
                    </th>
                    <th className="px-3 py-2.5">번호</th>
                    <th className="px-3 py-2.5">제목</th>
                    <th className="px-3 py-2.5">카테고리</th>
                    <th className="px-3 py-2.5 text-right">크기</th>
                    <th className="px-3 py-2.5">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((r, i) => {
                    const canCheck = r.status === "ready" || r.status === "exists" || r.status === "error";
                    return (
                      <tr key={r.item.no} className={r.status === "done" ? "bg-brand-50/40" : ""}>
                        <td className="px-3 py-2.5">
                          <input type="checkbox" aria-label={`${r.item.title} 선택`} disabled={!canCheck || running}
                            checked={r.checked} onChange={(e) => updateRow(i, { checked: e.target.checked })} />
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-neutral-500">{r.item.no}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-neutral-900">{r.item.title}</p>
                          {r.message && <p className="mt-0.5 text-xs text-red-600">{r.message}</p>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-neutral-600">{r.item.category}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-neutral-600">{r.file ? fmtSize(r.file.size) : "-"}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>
                            {r.status === "uploading" && <Loader2 size={11} className="animate-spin" />}
                            {STATUS_LABEL[r.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {rows.some((r) => r.status === "exists") && !finished && (
            <p className="mt-3 text-xs text-amber-700">「이미 등록됨」은 같은 제목이 있어 체크를 해제했습니다. 다시 올리려면 직접 체크하세요.</p>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-6 py-4">
          <p className="text-sm text-neutral-500">
            {finished
              ? <span className="inline-flex items-center gap-1.5 font-semibold text-brand-700"><CheckCircle size={15} /> {doneCount}건 등록 완료{errorCount ? `, ${errorCount}건 실패` : ""}</span>
              : rows.length ? `${rows.length}건 중 ${checkedCount}건 선택` : "폴더를 선택하세요"}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={running}
              className="rounded-xl bg-neutral-100 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-40">
              {finished ? "닫기" : "취소"}
            </button>
            <button onClick={runImport} disabled={running || checkedCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40">
              {running && <Loader2 size={15} className="animate-spin" />}
              {running ? "등록 중…" : `선택한 ${checkedCount}건 등록`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
