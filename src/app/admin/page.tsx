"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Database, BarChart2, FileText, Download, Upload,
  Trash2, CheckCircle, TrendingUp, Plus, X, Loader2, AlertTriangle, Lock,
} from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

// ── 탭 목록 — "다운로드 로그"는 "이용 현황"에 통합 ──────────────
const ADMIN_TABS = ["실적 현황", "신청서 목록", "결과물 검토", "데이터 관리", "회원 관리", "이용 현황", "접근 권한 관리"];

// ── 카테고리 목록 ─────────────────────────────────────────────
const CATS = ["통계/공공 데이터", "연구/학술 데이터", "금융/경제 데이터", "지역/업체 데이터"];

// ── 타입 정의 ─────────────────────────────────────────────────
interface UtilRow {
  id: string; title: string; category: string;
  applications: number; downloads: number; submissions: number;
}
interface AppRow {
  id: string; created_at: string; institution: string; field: string;
  profiles: { name: string; email: string } | null;
  datasets: { title: string } | null;
}
interface ResultRow {
  id: string; created_at: string; summary: string;
  file_name: string | null; file_path: string | null;
  profiles: { name: string } | null;
  datasets: { title: string } | null;
}
interface DatasetRow {
  id: string; title: string; category: string; year: string;
  file_size: number | null; is_active: boolean; created_at: string;
}
interface MemberRow {
  id: string; name: string; email: string; role: string; created_at: string;
  applicationCount?: number;
}
interface ActivityRow {
  no: number; datetime: string; organization: string; email: string; feature: string; fileName?: string;
}
interface AccessRequestRow {
  id: string; created_at: string; status: string; reason: string; user_id: string;
  profiles: { name: string; email: string; organization: string | null } | null;
}
interface Summary {
  datasets: number; applications: number; downloads: number; submissions: number;
}

// ── 데이터셋 업로드 모달 ────────────────────────────────────────
function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [form, setForm] = useState({ title: "", category: "", year: new Date().getFullYear().toString(), desc: "", tags: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleUpload = async () => {
    if (!form.title || !form.category) { setError("제목과 카테고리는 필수입니다."); return; }
    setUploading(true);
    setError(null);

    const supabase = createClient();
    let filePath: string | null = null;
    let fileSize: number | null = null;

    // 파일이 있으면 Storage에 업로드
    if (file) {
      const ext = file.name.split(".").pop();
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const uploadPath = `uploads/${safeName}`;

      const { error: uploadErr } = await supabase
        .storage.from("datasets").upload(uploadPath, file, { upsert: false });

      if (uploadErr) {
        setError(`파일 업로드 실패: ${uploadErr.message}`);
        setUploading(false);
        return;
      }
      filePath = uploadPath;
      fileSize = file.size;
    }

    // datasets 테이블에 메타데이터 INSERT
    const tags = form.tags
      ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const { error: dbErr } = await supabase.from("datasets").insert({
      title: form.title,
      category: form.category,
      year: form.year || new Date().getFullYear().toString(),
      description: form.desc || null,
      tags,
      file_path: filePath,
      file_size: fileSize,
      is_active: true,
    });

    if (dbErr) {
      setError(`데이터베이스 저장 실패: ${dbErr.message}`);
      setUploading(false);
      return;
    }

    setDone(true);
    onUploaded();
  };

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <CheckCircle size={40} className="text-brand-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">데이터셋 등록 완료</h3>
        <p className="text-sm text-neutral-500 mb-6">데이터셋이 성공적으로 등록되었습니다.</p>
        <button onClick={onClose} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors">확인</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-7 max-w-lg w-full shadow-xl my-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-neutral-900">새 데이터셋 등록</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg"><X size={16} /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
            <AlertTriangle size={14} className="flex-shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">데이터셋 제목 <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="예: 2025 전국 교육통계 데이터"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">카테고리 <span className="text-red-500">*</span></label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="">선택</option>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">기준 연도</label>
              <input type="text" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                placeholder="2025"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">데이터 설명</label>
            <textarea value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))}
              rows={3} placeholder="데이터 내용, 포함 항목, 활용 가능 분야 등을 설명해주세요."
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">파일 태그 (쉼표 구분)</label>
            <input type="text" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="예: CSV, Excel, JSON"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">데이터 파일 업로드 <span className="text-neutral-400 font-normal">(선택)</span></label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-neutral-200 rounded-xl cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
              <Upload size={20} className="text-neutral-400 mb-2" />
              <span className="text-sm text-neutral-500">{file ? file.name : "파일 클릭 또는 드래그 업로드"}</span>
              <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-3 rounded-xl transition-colors">취소</button>
          <button
            onClick={handleUpload}
            disabled={!form.title || !form.category || uploading}
            className={`flex-1 font-semibold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2
              ${form.title && form.category && !uploading ? "bg-brand-600 hover:bg-brand-700 text-white" : "bg-neutral-200 text-neutral-400 cursor-not-allowed"}`}
          >
            {uploading && <Loader2 size={14} className="animate-spin" />}
            {uploading ? "업로드 중..." : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 관리자 페이지 본체 ────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  // ── 요약 카운트 ───────────────────────────────────────────────
  const [summary, setSummary] = useState<Summary>({ datasets: 0, applications: 0, downloads: 0, submissions: 0 });

  // ── 탭별 데이터 ───────────────────────────────────────────────
  const [utilRows, setUtilRows] = useState<UtilRow[]>([]);
  const [appRows, setAppRows] = useState<AppRow[]>([]);
  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [datasetRows, setDatasetRows] = useState<DatasetRow[]>([]);
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PER_PAGE = 100;
  const [accessRows, setAccessRows] = useState<AccessRequestRow[]>([]);

  const [loading, setLoading] = useState(false);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  // 이용 현황 엑셀 내보내기
  const exportActivityExcel = () => {
    const rows = activityRows.map(r => ({
      "번호": r.no,
      "일시": fmtDate(r.datetime),
      "소속": r.organization,
      "아이디(이메일)": r.email,
      "이용기능": r.feature,
      "파일명": r.fileName ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "이용현황");
    XLSX.writeFile(wb, `이용현황_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const fmtBytes = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  };

  // ── 요약 카운트 조회 ─────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    const supabase = createClient();
    const [
      { count: d },
      { count: a },
      { count: dl },
      { count: r },
    ] = await Promise.all([
      supabase.from("datasets").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("applications").select("*", { count: "exact", head: true }),
      supabase.from("download_logs").select("*", { count: "exact", head: true }),
      supabase.from("results").select("*", { count: "exact", head: true }),
    ]);
    setSummary({ datasets: d ?? 0, applications: a ?? 0, downloads: dl ?? 0, submissions: r ?? 0 });
  }, []);

  // ── 탭별 데이터 조회 ─────────────────────────────────────────
  const fetchTab = useCallback(async (t: number) => {
    setLoading(true);
    const supabase = createClient();

    if (t === 0) {
      // 데이터셋별 신청/다운로드/결과물 수
      const { data: ds } = await supabase
        .from("datasets")
        .select("id, title, category")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (ds) {
        const rows = await Promise.all(ds.map(async (d) => {
          const [{ count: apps }, { count: dls }, { count: subs }] = await Promise.all([
            supabase.from("applications").select("*", { count: "exact", head: true }).eq("dataset_id", d.id),
            supabase.from("download_logs").select("*", { count: "exact", head: true }).eq("dataset_id", d.id),
            supabase.from("results").select("*", { count: "exact", head: true }).eq("dataset_id", d.id),
          ]);
          return { id: d.id, title: d.title, category: d.category, applications: apps ?? 0, downloads: dls ?? 0, submissions: subs ?? 0 };
        }));
        setUtilRows(rows);
      }
    }

    if (t === 1) {
      const { data } = await supabase
        .from("applications")
        .select("id, created_at, institution, field, profiles(name, email), datasets(title)")
        .order("created_at", { ascending: false });
      setAppRows((data as unknown as AppRow[]) ?? []);
    }

    if (t === 2) {
      const { data } = await supabase
        .from("results")
        .select("id, created_at, summary, file_name, file_path, profiles(name), datasets(title)")
        .order("created_at", { ascending: false });
      setResultRows((data as unknown as ResultRow[]) ?? []);
    }

    if (t === 3) {
      const { data } = await supabase
        .from("datasets")
        .select("id, title, category, year, file_size, is_active, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setDatasetRows((data as DatasetRow[]) ?? []);
    }

    if (t === 4) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, role, created_at")
        .order("created_at", { ascending: false });

      if (profiles) {
        // 각 사용자의 신청 건수 조회
        const members = await Promise.all(profiles.map(async (p) => {
          const { count } = await supabase
            .from("applications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", p.id);
          return { ...p, applicationCount: count ?? 0 };
        }));
        setMemberRows(members);
      }
    }

    if (t === 5) {
      // 이용 현황: 데이터 분석 + 데이터 신청 + 다운로드 로그 통합
      // 이름 대신 이메일(아이디) 표시, 앞 3자만 공개하고 나머지 마스킹
      const maskEmail = (email: string | null | undefined): string => {
        if (!email) return "-";
        const [local, domain] = email.split("@");
        if (!domain || local.length <= 4) return email;
        return `${local.slice(0, local.length - 4)}****@${domain}`;
      };

      const [{ data: logs }, { data: apps }, { data: dls }] = await Promise.all([
        supabase
          .from("analysis_logs")
          .select("id, created_at, organization, user_email, file_name")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("applications")
          .select("id, created_at, institution, profiles(email), datasets(title)")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("download_logs")
          .select("id, downloaded_at, profiles(email, organization), datasets(title)")
          .order("downloaded_at", { ascending: false })
          .limit(500),
      ]);

      type LogRaw = { id: string; created_at: string; organization: string | null; user_email: string | null; file_name: string | null };
      type AppRaw = { id: string; created_at: string; institution: string; profiles: { email: string } | { email: string }[] | null; datasets: { title: string } | null };
      type DlRaw  = { id: string; downloaded_at: string; profiles: { email: string; organization: string | null } | null; datasets: { title: string } | null };

      const getEmail = (p: AppRaw["profiles"]): string | undefined => {
        if (!p) return undefined;
        if (Array.isArray(p)) return p[0]?.email;
        return p.email;
      };

      const combined = [
        ...((logs ?? []) as unknown as LogRaw[]).map((l) => ({
          datetime: l.created_at,
          organization: l.organization ?? "-",
          email: maskEmail(l.user_email),
          feature: "데이터 분석",
          fileName: l.file_name ?? undefined,
        })),
        ...((apps ?? []) as unknown as AppRaw[]).map((a) => ({
          datetime: a.created_at,
          organization: a.institution ?? "-",
          email: maskEmail(getEmail(a.profiles)),
          feature: "데이터 신청",
          fileName: a.datasets?.title ?? undefined,
        })),
        ...((dls ?? []) as unknown as DlRaw[]).map((d) => ({
          datetime: d.downloaded_at,
          organization: (d.profiles as { email: string; organization: string | null } | null)?.organization ?? "-",
          email: maskEmail((d.profiles as { email: string; organization: string | null } | null)?.email),
          feature: `다운로드 · ${d.datasets?.title ?? "-"}`,
        })),
      ].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

      setActivityRows(combined.map((row, i) => ({ no: i + 1, ...row })));
    }

    if (t === 6) {
      const { data } = await supabase
        .from("access_requests")
        .select("id, created_at, status, reason, user_id, profiles(name, email, organization)")
        .order("created_at", { ascending: false });
      setAccessRows((data as unknown as AccessRequestRow[]) ?? []);
    }

    setLoading(false);
  }, []);

  // ── 관리자 권한 체크 (비관리자는 홈으로 리다이렉트) ─────────────
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.replace("/"); return; }
      setAuthorized(true);
      fetchSummary();
      fetchTab(0);
    })();
  }, [router, fetchSummary, fetchTab]);

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center text-neutral-400 text-sm">
      확인 중...
    </div>
  );

  // ── 탭 전환 시 데이터 로드 ────────────────────────────────────
  const handleTabChange = (t: number) => {
    setTab(t);
    fetchTab(t);
  };

  // ── 데이터셋 비활성화 (소프트 삭제) ─────────────────────────
  const deactivateDataset = async (id: string) => {
    const supabase = createClient();
    await supabase.from("datasets").update({ is_active: false }).eq("id", id);
    setDatasetRows((prev) => prev.filter((d) => d.id !== id));
    fetchSummary();
  };

  // ── 지역/업체 접근 권한 승인/거절 ───────────────────────────
  const handleAccessRequest = async (requestId: string, userId: string, approve: boolean) => {
    const supabase = createClient();
    const newStatus = approve ? "approved" : "rejected";
    await supabase.from("access_requests").update({ status: newStatus }).eq("id", requestId);
    if (approve) {
      await supabase.from("profiles").update({ local_data_approved: true }).eq("id", userId);
    }
    setAccessRows(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
  };

  // ── 결과물 다운로드 서명 URL ─────────────────────────────────
  const downloadResult = async (filePath: string) => {
    const supabase = createClient();
    const { data } = await supabase.storage.from("results").createSignedUrl(filePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* 관리자 헤더 */}
      <header className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Database size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-base">데이터거버넌스센터</span>
            <span className="ml-2 text-xs bg-brand-600 px-2 py-0.5 rounded-full">관리자</span>
          </div>
        </div>
        <Link href="/" className="text-xs text-neutral-400 hover:text-white transition-colors">← 사이트로 돌아가기</Link>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "전체 데이터셋",  value: summary.datasets,     icon: Database,   color: "text-brand-600 bg-brand-50" },
            { label: "총 신청 건수",   value: summary.applications, icon: FileText,   color: "text-blue-600 bg-blue-50" },
            { label: "총 다운로드",    value: summary.downloads,    icon: Download,   color: "text-emerald-600 bg-emerald-50" },
            { label: "결과물 제출",    value: summary.submissions,  icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-neutral-100 p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-neutral-900">{value.toLocaleString()}</p>
              <p className="text-xs text-neutral-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-6 overflow-x-auto">
          {ADMIN_TABS.map((t, i) => (
            <button key={t} onClick={() => handleTabChange(i)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                ${tab === i ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        )}

        {/* ── Tab 0: 실적 현황 ─────────────────────────────────── */}
        {!loading && tab === 0 && (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900">데이터셋별 활용 실적</h3>
            </div>
            {utilRows.length === 0 ? <EmptyState icon={BarChart2} text="데이터가 없습니다." /> : (
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-100">
                  <tr>
                    {["데이터셋", "카테고리", "신청", "다운로드", "결과물 제출"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {utilRows.map(u => (
                    <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-neutral-900">{u.title}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{u.category}</td>
                      <td className="px-5 py-4 text-sm text-neutral-700">{u.applications}</td>
                      <td className="px-5 py-4 text-sm text-neutral-700">{u.downloads}</td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-brand-600">{u.submissions}</span>
                        <span className="text-xs text-neutral-400 ml-1">건</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Tab 1: 신청서 목록 ─────────────────────────────────── */}
        {!loading && tab === 1 && (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900">전체 신청서 목록</h3>
            </div>
            {appRows.length === 0 ? <EmptyState icon={FileText} text="신청 내역이 없습니다." /> : (
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-100">
                  <tr>
                    {["신청자", "이메일", "소속", "데이터셋", "활용분야", "신청일", "상태"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {appRows.map(a => (
                    <tr key={a.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-neutral-900">{a.profiles?.name ?? "-"}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{a.profiles?.email ?? "-"}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{a.institution}</td>
                      <td className="px-5 py-4 text-sm text-neutral-700 max-w-[180px] truncate">{a.datasets?.title ?? "-"}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{a.field}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{fmtDate(a.created_at)}</td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1 text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full w-fit">
                          <CheckCircle size={10} /> 승인
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Tab 2: 결과물 검토 ─────────────────────────────────── */}
        {!loading && tab === 2 && (
          <div className="space-y-4">
            {resultRows.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
                <EmptyState icon={Upload} text="제출된 결과물이 없습니다." />
              </div>
            ) : resultRows.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-neutral-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-neutral-400">{r.id.slice(0, 8)}...</span>
                      <span className="text-xs text-neutral-500">{fmtDate(r.created_at)}</span>
                    </div>
                    <p className="font-semibold text-neutral-900 text-sm">
                      {r.profiles?.name ?? "-"} — {r.datasets?.title ?? "-"}
                    </p>
                    <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{r.summary}</p>
                    {r.file_path && (
                      <div className="mt-3 flex items-center gap-2">
                        <FileText size={13} className="text-brand-500" />
                        <span className="text-xs text-brand-600 font-medium">{r.file_name ?? r.file_path}</span>
                        <button
                          onClick={() => r.file_path && downloadResult(r.file_path)}
                          className="text-xs text-neutral-400 hover:text-neutral-600 underline"
                        >
                          다운로드
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold flex-shrink-0">
                    <CheckCircle size={11} /> 접수됨
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab 3: 데이터 관리 ─────────────────────────────────── */}
        {!loading && tab === 3 && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors active:scale-95"
              >
                <Plus size={16} /> 데이터셋 등록
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
              {datasetRows.length === 0 ? <EmptyState icon={Database} text="등록된 데이터셋이 없습니다." /> : (
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b border-neutral-100">
                    <tr>
                      {["데이터셋", "카테고리", "연도", "파일 크기", "등록일", "관리"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {datasetRows.map(d => (
                      <tr key={d.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-neutral-900">{d.title}</td>
                        <td className="px-5 py-4 text-xs text-neutral-500">{d.category}</td>
                        <td className="px-5 py-4 text-xs text-neutral-500">{d.year}</td>
                        <td className="px-5 py-4 text-xs text-neutral-500">{fmtBytes(d.file_size)}</td>
                        <td className="px-5 py-4 text-xs text-neutral-500">
                          {new Date(d.created_at).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => deactivateDataset(d.id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 size={12} /> 삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 4: 회원 관리 ───────────────────────────────────── */}
        {!loading && tab === 4 && (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900">가입 회원 목록 ({memberRows.length}명)</h3>
            </div>
            {memberRows.length === 0 ? <EmptyState icon={FileText} text="가입 회원이 없습니다." /> : (
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-100">
                  <tr>
                    {["이름", "이메일", "권한", "가입일", "신청 건수"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {memberRows.map(m => (
                    <tr key={m.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-neutral-900">{m.name}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{m.email}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${m.role === "admin" ? "bg-red-50 text-red-700" : "bg-neutral-100 text-neutral-500"}`}>
                          {m.role === "admin" ? "관리자" : "일반"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-neutral-500">
                        {new Date(m.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-700">{m.applicationCount}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {/* ── Tab 5: 이용 현황 (분석 + 신청 + 다운로드 통합) ──────── */}
        {!loading && tab === 5 && (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900 text-sm">이용 현황 로그 ({activityRows.length}건)</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">데이터 분석 · 데이터 신청 · 다운로드 통합</span>
                <button onClick={exportActivityExcel} disabled={activityRows.length === 0}
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                  <Download size={12} /> 엑셀 내보내기
                </button>
              </div>
            </div>
            {activityRows.length === 0 ? <EmptyState icon={BarChart2} text="이용 기록이 없습니다." /> : (() => {
              const totalPages = Math.ceil(activityRows.length / ACTIVITY_PER_PAGE);
              const pageRows = activityRows.slice((activityPage - 1) * ACTIVITY_PER_PAGE, activityPage * ACTIVITY_PER_PAGE);
              return (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                          {["번호", "일시", "소속", "아이디(이메일)", "이용기능", "파일명"].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-neutral-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {pageRows.map(row => (
                          <tr key={row.no} className="hover:bg-neutral-50">
                            <td className="px-3 py-1.5 text-neutral-400 tabular-nums w-10">{row.no}</td>
                            <td className="px-3 py-1.5 text-neutral-600 whitespace-nowrap">
                              {new Date(row.datetime).toLocaleString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-3 py-1.5 text-neutral-700 max-w-[120px] truncate">{row.organization}</td>
                            <td className="px-3 py-1.5 font-medium text-neutral-700 font-mono">{row.email}</td>
                            <td className="px-3 py-1.5">
                              <span className={`px-2 py-0.5 rounded-full font-medium ${
                                row.feature === "데이터 분석"
                                  ? "bg-brand-50 text-brand-700"
                                  : row.feature === "데이터 신청"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}>
                                {row.feature}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-neutral-500 max-w-[160px]">
                              {row.fileName
                                ? <span title={row.fileName}>{row.fileName.length > 20 ? row.fileName.slice(0, 18) + "…" : row.fileName}</span>
                                : <span className="text-neutral-300">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-neutral-100">
                      <button onClick={() => setActivityPage(p => Math.max(1, p - 1))} disabled={activityPage === 1}
                        className="px-2.5 py-1 text-xs rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition-colors">
                        ← 이전
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setActivityPage(p)}
                          className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                            p === activityPage ? "bg-brand-600 text-white" : "text-neutral-500 hover:bg-neutral-100"
                          }`}>
                          {p}
                        </button>
                      ))}
                      <button onClick={() => setActivityPage(p => Math.min(totalPages, p + 1))} disabled={activityPage === totalPages}
                        className="px-2.5 py-1 text-xs rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition-colors">
                        다음 →
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ── Tab 6: 접근 권한 관리 ──────────────────────────────── */}
        {!loading && tab === 6 && (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
              <Lock size={15} className="text-orange-500" />
              <h3 className="font-semibold text-neutral-900">지역/업체 데이터 접근 권한 신청 ({accessRows.length}건)</h3>
            </div>
            {accessRows.length === 0 ? (
              <EmptyState icon={Lock} text="접근 권한 신청이 없습니다." />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-100">
                  <tr>
                    {["신청일", "이름", "이메일", "소속기관", "신청 사유", "상태", "처리"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {accessRows.map(r => {
                    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                    const isPending = r.status === "pending";
                    return (
                      <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-5 py-3 text-xs text-neutral-500 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-neutral-900">{profile?.name ?? "-"}</td>
                        <td className="px-5 py-3 text-xs text-neutral-500">{profile?.email ?? "-"}</td>
                        <td className="px-5 py-3 text-xs text-neutral-500">{profile?.organization ?? "-"}</td>
                        <td className="px-5 py-3 text-xs text-neutral-600 max-w-[200px]">
                          <p className="truncate" title={r.reason}>{r.reason || "-"}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            r.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                            r.status === "rejected" ? "bg-red-50 text-red-600" :
                            "bg-amber-50 text-amber-700"
                          }`}>
                            {r.status === "approved" ? "승인됨" : r.status === "rejected" ? "거절됨" : "대기중"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {isPending ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAccessRequest(r.id, r.user_id, true)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                              >
                                승인
                              </button>
                              <button
                                onClick={() => handleAccessRequest(r.id, r.user_id, false)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold transition-colors"
                              >
                                거절
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-300">처리완료</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* 데이터셋 등록 모달 */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            fetchSummary();
            if (tab === 3) fetchTab(3);
          }}
        />
      )}
    </div>
  );
}

// ── 빈 상태 컴포넌트 ──────────────────────────────────────────────
function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="py-20 text-center text-neutral-400">
      <Icon size={36} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
