"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search, Grid3X3, List, Download, X,
  FileText, Eye, ShoppingCart, CheckSquare, Trash2,
  HelpCircle, Upload, Loader2, ClipboardList, Lock, Unlock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// ── 탭 정의 ──────────────────────────────────────────────────
const TABS = [
  { id: "browse",  label: "데이터 찾기" },
  { id: "history", label: "신청 내역"   },
  { id: "cart",    label: "장바구니"    },
  { id: "guide",   label: "이용 안내"   },
  { id: "result",  label: "결과물 제출" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ── 카테고리 / 연도 / 형식 목록 ──────────────────────────────
const CATEGORIES = ["전체", "통계/공공 데이터", "연구/학술 데이터", "금융/경제 데이터", "지역/업체 데이터"];
const YEARS      = ["전체 연도", "2025", "2024", "2023", "2022 이전"];
const FILE_TYPES = ["전체 형식", "CSV", "Excel", "JSON", "Parquet", "TXT", "SAS/SPSS"];

// ── 카테고리별 아이콘 색상 ────────────────────────────────────
const iconColor: Record<string, string> = {
  "통계/공공 데이터": "bg-blue-50 text-blue-600",
  "연구/학술 데이터": "bg-brand-50 text-brand-600",
  "금융/경제 데이터": "bg-emerald-50 text-emerald-600",
  "지역/업체 데이터": "bg-orange-50 text-orange-600",
};

// ── 신청 내역 행 타입 ────────────────────────────────────────
interface Application {
  id: string;
  created_at: string;
  field: string;
  period: string;
  purpose: string;
  datasets: {
    id: string;
    title: string;
    category: string;
    year: string;
    tags: string[];
  } | null;
}

// ── 분야별 배지 색상 ──────────────────────────────────────────
const fieldColor: Record<string, string> = {
  "학술연구":    "bg-brand-50 text-brand-700",
  "정책연구":    "bg-blue-50 text-blue-700",
  "산업분석":    "bg-emerald-50 text-emerald-700",
  "기타":        "bg-neutral-100 text-neutral-600",
};

// ── Supabase datasets 행 타입 ─────────────────────────────────
interface Dataset {
  id: string;
  title: string;
  category: string;
  year: string;
  description: string;
  tags: string[];
  downloads: number;
  file_path: string | null;
  created_at: string;
}


// ── 지역/업체 접근 권한 신청 모달 ─────────────────────────────
function AccessRequestModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    await onSubmit(reason.trim());
    setDone(true);
    setSubmitting(false);
  };

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <Unlock size={24} className="text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold mb-2">신청 완료</h3>
        <p className="text-sm text-neutral-500 mb-6">관리자 검토 후 승인되면 지역/업체 데이터에 접근할 수 있습니다.</p>
        <button onClick={onClose} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors">확인</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-orange-500" />
            <h3 className="text-lg font-bold text-neutral-900">지역/업체 데이터 접근 신청</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <p className="text-sm text-neutral-500 mb-5 leading-relaxed">
          지역/업체 데이터는 관리자 승인 후 이용할 수 있습니다.<br />
          아래에 접근이 필요한 이유를 작성해주세요.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="예) 지역 소상공인 분석 연구에 활용하고자 합니다."
          rows={4}
          className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400"
        />
        <button
          onClick={handleSubmit}
          disabled={!reason.trim() || submitting}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? "신청 중..." : "접근 권한 신청"}
        </button>
      </div>
    </div>
  );
}

// ── 토스트 알림 컴포넌트 ──────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-neutral-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl">
      <ShoppingCart size={15} className="text-brand-300" />
      {message}
      <button onClick={onClose} className="ml-2 text-neutral-400 hover:text-white">
        <X size={13} />
      </button>
    </div>
  );
}

export default function DatasetsClient() {
  // ── 탭 / 필터 상태 ─────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState<TabId>("browse");
  const [query, setQuery]           = useState("");
  const [category, setCategory]     = useState("전체");
  const [year, setYear]             = useState("전체 연도");
  const [fileType, setFileType]     = useState("전체 형식");
  const [view, setView]             = useState<"grid" | "list">("grid");

  // ── 선택 / 장바구니 상태 ──────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cart, setCart]         = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("cart") ?? "[]")); } catch { return new Set(); }
  });
  const [toast, setToast]       = useState<string | null>(null);

  // ── 현재 로그인 유저 상태 ────────────────────────────────
  const [user, setUser] = useState<User | null>(null);

  // ── Supabase 데이터 상태 ───────────────────────────────────
  const [datasets, setDatasets]         = useState<Dataset[]>([]);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState<string | null>(null);

  // ── 결과물 제출 폼 상태 ──────────────────────────────────
  const [resultDatasetId,  setResultDatasetId]  = useState("");
  const [resultSummary,    setResultSummary]    = useState("");
  const [resultFile,       setResultFile]       = useState<File | null>(null);
  const [resultSubmitting, setResultSubmitting] = useState(false);
  const [resultDone,       setResultDone]       = useState(false);
  const [resultError,      setResultError]      = useState<string | null>(null);

  // ── 지역/업체 데이터 접근 권한 상태 ──────────────────────
  const [localDataApproved, setLocalDataApproved] = useState<boolean | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);

  // ── 신청 내역 상태 ────────────────────────────────────────
  const [applications, setApplications] = useState<Application[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFetched, setHistoryFetched] = useState(false);

  // ── 로그인 유저 감지 ──────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      // 유저가 바뀌면 캐시 초기화
      setHistoryFetched(false);
      setApplications([]);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── 지역/업체 접근 권한 + 신청 여부 확인 ─────────────────
  useEffect(() => {
    if (!user) { setLocalDataApproved(null); return; }
    const supabase = createClient();
    supabase.from("profiles").select("local_data_approved").eq("id", user.id).single()
      .then(({ data }) => setLocalDataApproved(data?.local_data_approved ?? false));
    supabase.from("access_requests").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setAlreadyRequested(!!data));
  }, [user]);

  // ── 데이터셋 목록 불러오기 ─────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("datasets")
      .select("id, title, category, year, description, tags, downloads, file_path, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setFetchError("데이터를 불러오는 데 실패했습니다.");
        else setDatasets(data ?? []);
        setLoading(false);
      });
  }, []);

  // ── 신청 내역 fetch (히스토리 탭 진입 시 1회) ────────────
  useEffect(() => {
    if (activeTab !== "history" || !user || historyFetched) return;
    setHistoryLoading(true);
    const supabase = createClient();
    supabase
      .from("applications")
      .select("id, created_at, field, period, purpose, datasets(id, title, category, year, tags)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setApplications((data as unknown as Application[]) ?? []);
        setHistoryFetched(true);
        setHistoryLoading(false);
      });
  }, [activeTab, user, historyFetched]);

  // ── 필터링 ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return datasets.filter((d) => {
      const matchQ    = d.title.includes(query) || d.description?.includes(query);
      const matchCat  = category === "전체" || d.category === category;
      const matchYear = year === "전체 연도" || d.year === year;
      const matchFile = fileType === "전체 형식" || d.tags?.includes(fileType);
      return matchQ && matchCat && matchYear && matchFile;
    });
  }, [datasets, query, category, year, fileType]);

  const hasFilter = category !== "전체" || year !== "전체 연도" || fileType !== "전체 형식" || query !== "";

  // ── 결과물 제출 핸들러 ────────────────────────────────────
  const submitResult = async () => {
    if (!user)                  { setResultError("로그인이 필요합니다."); return; }
    if (!resultDatasetId)       { setResultError("데이터셋을 선택해주세요."); return; }
    if (!resultSummary.trim())  { setResultError("활용 내역을 입력해주세요."); return; }

    setResultSubmitting(true);
    setResultError(null);
    const supabase = createClient();

    // 파일 첨부가 있으면 Storage에 먼저 업로드
    let filePath: string | null = null;
    let fileName: string | null = null;
    if (resultFile) {
      const ext = resultFile.name.split(".").pop();
      const uploadPath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("results").upload(uploadPath, resultFile, { upsert: false });
      if (uploadErr) {
        setResultError("파일 업로드에 실패했습니다.");
        setResultSubmitting(false);
        return;
      }
      filePath = uploadPath;
      fileName = resultFile.name;
    }

    // results 테이블에 저장
    const { error } = await supabase.from("results").insert({
      user_id: user.id,
      dataset_id: resultDatasetId,
      summary: resultSummary.trim(),
      file_path: filePath,
      file_name: fileName,
    });

    if (error) {
      setResultError("제출에 실패했습니다. 다시 시도해주세요.");
    } else {
      setResultDone(true);
      setResultDatasetId("");
      setResultSummary("");
      setResultFile(null);
    }
    setResultSubmitting(false);
  };

  // ── 지역/업체 접근 권한 신청 제출 ────────────────────────
  const submitAccessRequest = async (reason: string) => {
    if (!user) return;
    const supabase = createClient();
    await supabase.from("access_requests").insert({ user_id: user.id, reason, status: "pending" });
    setAlreadyRequested(true);
  };

  // ── 체크박스 토글 ──────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── 장바구니 단건 추가 ─────────────────────────────────────
  const addToCart = (id: string) => {
    setCart((prev) => new Set(prev).add(id));
    const ds = datasets.find((d) => d.id === id);
    showToast(`"${ds?.title}" 장바구니에 담겼습니다.`);
  };

  // ── 선택 항목 일괄 장바구니 담기 ──────────────────────────
  const addSelectedToCart = () => {
    if (selected.size === 0) return;
    setCart((prev) => { const n = new Set(prev); selected.forEach((id) => n.add(id)); return n; });
    showToast(`${selected.size}개 데이터가 장바구니에 담겼습니다.`);
    setSelected(new Set());
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── 장바구니 → localStorage 동기화 ───────────────────────
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify([...cart]));
  }, [cart]);

  // ── 설명자료 텍스트 생성 후 파일 다운로드 ────────────────
  const downloadDescription = (ds: Dataset) => {
    const lines = [
      `데이터셋 설명자료`,
      `${"=".repeat(40)}`,
      `제목    : ${ds.title}`,
      `카테고리: ${ds.category}`,
      `구축년도: ${ds.year}`,
      `형식    : ${ds.tags?.join(", ") || "-"}`,
      `다운로드: ${ds.downloads?.toLocaleString()}회`,
      ``,
      `[데이터 설명]`,
      ds.description || "설명 없음",
      ``,
      `${"=".repeat(40)}`,
      `인제대학교 데이터거버넌스센터`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    // 파일명에 사용 불가 문자 제거
    a.download = `설명자료_${ds.title.replace(/[\\/:*?"<>|]/g, "_")}.txt`;
    a.click();
    // 메모리 해제
    URL.revokeObjectURL(url);
  };

  const cartItems = datasets.filter((d) => cart.has(d.id));

  // ── 로딩 화면 ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {showAccessModal && (
        <AccessRequestModal
          onClose={() => setShowAccessModal(false)}
          onSubmit={submitAccessRequest}
        />
      )}

      {/* ── 탭 바 ── */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-center">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors duration-150
                  ${activeTab === tab.id ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"}
                  ${tab.id === "cart" && cart.size > 0 ? "pr-8" : ""}`}>
                {tab.label}
                {/* 장바구니 개수 배지 */}
                {tab.id === "cart" && cart.size > 0 && (
                  <span className="absolute top-3 right-2 bg-brand-500 text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">
                    {cart.size}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 신청 내역 탭 ── */}
      {activeTab === "history" && (
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">신청 내역</h2>

          {/* 비로그인 상태 */}
          {!user ? (
            <div className="bg-white rounded-2xl border border-neutral-200 py-20 text-center text-neutral-400">
              <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">로그인 후 신청 내역을 확인할 수 있습니다.</p>
              <Link href="/login"
                className="mt-4 inline-block text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-5 py-2 rounded-xl transition-colors">
                로그인하기
              </Link>
            </div>

          /* 로딩 중 */
          ) : historyLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={28} className="animate-spin text-brand-600" />
            </div>

          /* 신청 내역 없음 */
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 py-20 text-center text-neutral-400">
              <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">아직 신청한 데이터셋이 없습니다.</p>
              <button onClick={() => setActiveTab("browse")}
                className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">
                데이터 찾기로 이동
              </button>
            </div>

          /* 신청 내역 목록 */
          ) : (
            <div className="flex flex-col gap-3">
              {applications.map((app) => {
                const ds = app.datasets;
                const badgeColor = fieldColor[app.field] ?? fieldColor["기타"];
                return (
                  <div key={app.id}
                    className="bg-white rounded-2xl border border-neutral-100 hover:border-brand-200 transition-all duration-200 px-5 py-4 flex items-center gap-4">

                    {/* 카테고리 아이콘 */}
                    <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm
                      ${iconColor[ds?.category ?? ""] ?? "bg-neutral-100 text-neutral-500"}`}>
                      {(ds?.category ?? "?")[0]}
                    </div>

                    {/* 데이터셋 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-400 mb-0.5">{ds?.category ?? "—"}</p>
                      <p className="font-semibold text-sm text-neutral-900 truncate">{ds?.title ?? "삭제된 데이터셋"}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">이용 기간: {app.period}</p>
                    </div>

                    {/* 분야 배지 */}
                    <span className={`hidden sm:inline-flex text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${badgeColor}`}>
                      {app.field || "기타"}
                    </span>

                    {/* 신청일 */}
                    <p className="hidden md:block text-xs text-neutral-400 flex-shrink-0 w-24 text-right">
                      {new Date(app.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
                    </p>

                    {/* 상세 보기 링크 */}
                    {ds && (
                      <Link href={`/datasets/${ds.id}`}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-brand-50 hover:text-brand-600 text-neutral-400 transition-colors flex-shrink-0">
                        <Eye size={14} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 장바구니 탭 ── */}
      {activeTab === "cart" && (
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-900">장바구니 <span className="text-brand-600">{cart.size}</span>개</h2>
          </div>
          {cartItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 py-24 text-center text-neutral-400">
              <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">장바구니가 비어 있습니다.</p>
              <button onClick={() => setActiveTab("browse")} className="mt-4 text-xs text-brand-600 hover:underline">
                데이터 찾기로 이동
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cartItems.map((ds) => (
                <div key={ds.id} className="bg-white rounded-2xl border border-neutral-200 flex items-center gap-4 px-5 py-4">
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold ${iconColor[ds.category] ?? "bg-neutral-100 text-neutral-500"}`}>
                    {ds.category[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-400 mb-0.5">{ds.category}</p>
                    <p className="font-semibold text-sm text-neutral-900 truncate">{ds.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/datasets/${ds.id}`}
                      className="text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg transition-colors">
                      신청하기
                    </Link>
                    <button onClick={() => setCart((prev) => { const n = new Set(prev); n.delete(ds.id); return n; })}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 hover:bg-red-50 hover:text-red-500 text-neutral-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 이용 안내 탭 ── */}
      {activeTab === "guide" && (
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-10">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">이용 안내</h2>
          <div className="space-y-4">
            {[
              { step: "01", title: "데이터 탐색",  desc: "데이터 찾기 탭에서 원하는 데이터셋을 검색하고 상세 내용을 확인합니다." },
              { step: "02", title: "신청서 작성",  desc: "신청하기 버튼을 클릭해 소속기관, 이용목적, 활용기간 등을 입력하고 보안서약에 동의합니다." },
              { step: "03", title: "즉시 다운로드", desc: "신청서 제출 즉시 다운로드 링크가 활성화됩니다. 별도 승인 대기 없이 바로 이용할 수 있습니다." },
              { step: "04", title: "결과물 제출",  desc: "데이터를 활용한 연구 결과물(논문, 보고서 등)을 결과물 제출 탭에서 등록해주세요." },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl border border-neutral-200 p-6 flex gap-5">
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{item.step}</div>
                <div>
                  <p className="font-semibold text-neutral-900 mb-1">{item.title}</p>
                  <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
            <div className="bg-brand-50 rounded-2xl border border-brand-100 p-5 flex gap-3">
              <HelpCircle size={18} className="text-brand-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-brand-800">
                이용 관련 문의는 <a href="mailto:han9449@inje.ac.kr" className="font-semibold underline">han9449@inje.ac.kr</a> 로 연락주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 결과물 제출 탭 ── */}
      {activeTab === "result" && (
        <div className="max-w-2xl mx-auto px-6 lg:px-8 py-10">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">결과물 제출</h2>

          {/* 비로그인 안내 */}
          {!user ? (
            <div className="bg-white rounded-2xl border border-neutral-200 py-20 text-center text-neutral-400">
              <Upload size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">로그인 후 결과물을 제출할 수 있습니다.</p>
              <a href="/login" className="mt-4 inline-block text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-5 py-2 rounded-xl transition-colors">
                로그인하기
              </a>
            </div>

          /* 제출 완료 */
          ) : resultDone ? (
            <div className="bg-white rounded-2xl border border-neutral-200 py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                <Upload size={24} className="text-brand-600" />
              </div>
              <p className="font-semibold text-neutral-900 mb-1">결과물이 제출되었습니다.</p>
              <p className="text-sm text-neutral-400 mb-6">마이페이지에서 제출 내역을 확인할 수 있습니다.</p>
              <button onClick={() => setResultDone(false)}
                className="text-sm font-semibold text-brand-600 hover:underline">
                추가 제출하기
              </button>
            </div>

          /* 제출 폼 */
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
              {/* 데이터셋 선택 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">관련 데이터셋 <span className="text-red-500">*</span></label>
                <select value={resultDatasetId} onChange={(e) => setResultDatasetId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                  <option value="">데이터셋 선택</option>
                  {datasets.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>

              {/* 활용 내역 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">활용 내역 요약 <span className="text-red-500">*</span></label>
                <textarea rows={4} value={resultSummary} onChange={(e) => setResultSummary(e.target.value)}
                  placeholder="데이터를 어떻게 활용했는지 간략히 작성해주세요."
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
              </div>

              {/* 파일 첨부 */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">증빙자료 첨부</label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-200 rounded-xl p-8 cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
                  <Upload size={22} className="text-neutral-400" />
                  {resultFile ? (
                    <span className="text-sm text-brand-600 font-medium">{resultFile.name}</span>
                  ) : (
                    <>
                      <span className="text-sm text-neutral-500">파일을 드래그하거나 클릭해서 업로드</span>
                      <span className="text-xs text-neutral-400">PDF, JPG, PNG, ZIP · 최대 50MB</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.zip"
                    onChange={(e) => setResultFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>

              {/* 에러 */}
              {resultError && (
                <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{resultError}</p>
              )}

              {/* 제출 버튼 */}
              <button onClick={submitResult} disabled={resultSubmitting}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2">
                {resultSubmitting && <Loader2 size={16} className="animate-spin" />}
                {resultSubmitting ? "제출 중..." : "결과물 제출하기"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── 데이터 찾기 탭 ── */}
      {activeTab === "browse" && (
        <>
          {/* 페이지 헤더 + 필터 */}
          <div className="bg-white border-b border-neutral-100">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
              <h1 className="text-3xl font-bold text-neutral-900 mb-1">데이터 탐색</h1>
              <p className="text-neutral-500 text-sm">
                검증된 {datasets.length}개 데이터셋을 탐색하고 이용 신청하세요.
              </p>

              {/* 에러 */}
              {fetchError && (
                <div className="mt-4 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{fetchError}</div>
              )}

              {/* 필터 행 */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 flex-wrap">
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select value={year} onChange={(e) => setYear(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {YEARS.map((y) => <option key={y}>{y}</option>)}
                </select>
                <select value={fileType} onChange={(e) => setFileType(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {FILE_TYPES.map((f) => <option key={f}>{f}</option>)}
                </select>

                {/* 검색창 */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                  <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="검색어를 입력하세요."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>

                {/* 선택 데이터 담기 */}
                <button onClick={addSelectedToCart} disabled={selected.size === 0}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                    ${selected.size > 0 ? "bg-brand-600 text-white hover:bg-brand-700 shadow-brand active:scale-95" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"}`}>
                  <CheckSquare size={15} />
                  선택 데이터 담기
                  {selected.size > 0 && (
                    <span className="bg-white text-brand-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{selected.size}</span>
                  )}
                </button>

                {/* 장바구니 버튼 */}
                <button onClick={() => setActiveTab("cart")}
                  className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-neutral-200 bg-white hover:border-brand-300 transition-colors">
                  <ShoppingCart size={15} className="text-neutral-500" />
                  장바구니
                  {cart.size > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                      {cart.size}
                    </span>
                  )}
                </button>

                {/* 뷰 전환 */}
                <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
                  <button onClick={() => setView("grid")}
                    className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-white text-brand-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"}`}>
                    <Grid3X3 size={16} />
                  </button>
                  <button onClick={() => setView("list")}
                    className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-white text-brand-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"}`}>
                    <List size={16} />
                  </button>
                </div>
              </div>

              {/* 활성 필터 칩 */}
              {hasFilter && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-neutral-500">필터:</span>
                  {category !== "전체" && (
                    <button onClick={() => setCategory("전체")} className="flex items-center gap-1 text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full hover:bg-brand-100">
                      {category} <X size={10} />
                    </button>
                  )}
                  {year !== "전체 연도" && (
                    <button onClick={() => setYear("전체 연도")} className="flex items-center gap-1 text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full hover:bg-brand-100">
                      {year} <X size={10} />
                    </button>
                  )}
                  {fileType !== "전체 형식" && (
                    <button onClick={() => setFileType("전체 형식")} className="flex items-center gap-1 text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full hover:bg-brand-100">
                      {fileType} <X size={10} />
                    </button>
                  )}
                  {query && (
                    <button onClick={() => setQuery("")} className="flex items-center gap-1 text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full hover:bg-brand-100">
                      &ldquo;{query}&rdquo; <X size={10} />
                    </button>
                  )}
                  <button onClick={() => { setCategory("전체"); setYear("전체 연도"); setFileType("전체 형식"); setQuery(""); }}
                    className="text-xs text-neutral-400 hover:text-neutral-600">초기화</button>
                </div>
              )}
            </div>
          </div>

          {/* 결과 목록 */}
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            <p className="text-sm text-neutral-500 mb-6">
              총 <span className="font-semibold text-neutral-900">{filtered.length}</span>개 데이터셋
              {selected.size > 0 && <span className="ml-2 text-brand-600 font-medium">{selected.size}개 선택됨</span>}
            </p>

            {/* 데이터 없음 */}
            {filtered.length === 0 ? (
              <div className="text-center py-24 text-neutral-400">
                <Search size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-base font-medium">
                  {datasets.length === 0 ? "등록된 데이터셋이 없습니다." : "검색 결과가 없습니다."}
                </p>
                <p className="text-sm mt-1">
                  {datasets.length === 0 ? "관리자가 데이터셋을 등록하면 이곳에 표시됩니다." : "다른 키워드나 필터를 시도해보세요."}
                </p>
              </div>
            ) : view === "grid" ? (
              // ── 그리드 뷰 ──
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((ds) => {
                  const isSelected = selected.has(ds.id);
                  const inCart = cart.has(ds.id);
                  const isLocal = ds.category === "지역/업체 데이터";
                  const isLocked = isLocal && !localDataApproved;
                  return (
                    <div key={ds.id}
                      className={`group bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden
                        ${isLocked ? "border-orange-200" : isSelected ? "border-brand-400 ring-2 ring-brand-200 shadow-brand" : "border-neutral-100 hover:border-brand-200 hover:shadow-brand"}`}>

                      {/* 잠금 배너 */}
                      {isLocked && (
                        <div className="bg-orange-50 border-b border-orange-100 px-3 py-1.5 flex items-center gap-1.5">
                          <Lock size={11} className="text-orange-500 flex-shrink-0" />
                          <span className="text-[10px] text-orange-600 font-medium">접근 권한 필요</span>
                        </div>
                      )}

                      {/* 체크박스 + 배지 */}
                      <div className="flex items-start justify-between px-4 pt-4 pb-2">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(ds.id)}
                          disabled={isLocked}
                          className="w-4 h-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-400 cursor-pointer mt-0.5 disabled:opacity-30" />
                        {new Date().getTime() - new Date(ds.created_at).getTime() < 7 * 24 * 60 * 60 * 1000 ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-500 text-white">신규</span>
                        ) : <span />}
                      </div>

                      {/* 아이콘 + 정보 */}
                      <div className="flex flex-col items-center px-4 pb-3 flex-1">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-lg font-bold relative ${iconColor[ds.category] ?? "bg-neutral-100 text-neutral-500"} ${isLocked ? "opacity-50" : ""}`}>
                          {isLocked ? <Lock size={22} /> : ds.category[0]}
                        </div>
                        <p className="text-[10px] text-neutral-400 mb-1">{ds.category}</p>
                        <h3 className={`font-semibold text-sm leading-snug mb-1.5 text-center transition-colors line-clamp-2 ${isLocked ? "text-neutral-400" : "text-neutral-900 group-hover:text-brand-700"}`}>
                          {ds.title}
                        </h3>
                        <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2 text-center">{ds.description}</p>
                      </div>

                      {/* 태그 + 다운로드 수 */}
                      <div className="px-4 pb-2 flex items-center justify-between">
                        <div className="flex gap-1 flex-wrap">
                          {ds.tags?.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded font-mono">{t}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-0.5 text-[10px] text-neutral-400">
                          <Download size={10} /> {ds.downloads?.toLocaleString()}
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="border-t border-neutral-100 px-4 py-3 flex items-center gap-2">
                        {isLocked ? (
                          // 잠금 상태: 접근 권한 신청 버튼
                          <button
                            onClick={() => user ? setShowAccessModal(true) : window.location.href = "/login"}
                            className="flex-1 text-center text-xs font-semibold flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors active:scale-95 bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            {alreadyRequested ? (
                              <><CheckSquare size={12} /> 신청 완료 (대기중)</>
                            ) : (
                              <><Lock size={12} /> 접근 권한 신청</>
                            )}
                          </button>
                        ) : (
                          <>
                            <button title="설명자료 내려받기" onClick={() => downloadDescription(ds)}
                              className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors">
                              <FileText size={14} />
                            </button>
                            <button title="장바구니 담기" onClick={() => addToCart(ds.id)}
                              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors
                                ${inCart ? "bg-brand-100 text-brand-600" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-500"}`}>
                              <ShoppingCart size={14} />
                            </button>
                            <Link href={`/datasets/${ds.id}`} title="미리보기"
                              className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors">
                              <Eye size={14} />
                            </Link>
                            <Link href={`/datasets/${ds.id}`}
                              className="flex-1 text-center text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 py-2 rounded-lg transition-colors active:scale-95">
                              신청하기
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // ── 리스트 뷰 ──
              <div className="flex flex-col gap-2">
                {filtered.map((ds) => {
                  const isSelected = selected.has(ds.id);
                  const inCart = cart.has(ds.id);
                  return (
                    <div key={ds.id}
                      className={`group bg-white rounded-2xl border transition-all duration-200 flex items-center gap-4 px-5 py-4
                        ${isSelected ? "border-brand-400 ring-2 ring-brand-200" : "border-neutral-100 hover:border-brand-200 hover:shadow-brand"}`}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(ds.id)}
                        className="w-4 h-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-400 cursor-pointer flex-shrink-0" />
                      <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm ${iconColor[ds.category] ?? "bg-neutral-100 text-neutral-500"}`}>
                        {ds.category[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-neutral-400 mb-0.5">{ds.category}</p>
                        <h3 className="font-semibold text-sm text-neutral-900 group-hover:text-brand-700 transition-colors truncate">{ds.title}</h3>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">{ds.description}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                        {ds.tags?.map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded font-mono">{t}</span>
                        ))}
                      </div>
                      <div className="hidden md:flex items-center gap-1 text-xs text-neutral-400 flex-shrink-0 w-16 justify-end">
                        <Download size={11} /> {ds.downloads?.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* 설명자료 내려받기: 리스트 뷰 */}
                        <button title="설명자료 내려받기" onClick={() => downloadDescription(ds)} className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors"><FileText size={14} /></button>
                        <button title="장바구니" onClick={() => addToCart(ds.id)}
                          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${inCart ? "bg-brand-100 text-brand-600" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-500"}`}>
                          <ShoppingCart size={14} />
                        </button>
                        <Link href={`/datasets/${ds.id}`} title="미리보기"
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors">
                          <Eye size={14} />
                        </Link>
                        <Link href={`/datasets/${ds.id}`}
                          className="text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg transition-colors active:scale-95">
                          신청하기
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
