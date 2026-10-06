"use client";

import { useState, useMemo, useEffect, useDeferredValue } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, Grid3X3, List, Download, X,
  FileText, Eye, ShoppingCart, CheckSquare, Trash2,
  HelpCircle, Upload, Loader2, ClipboardList, Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AccessRequestModal from "@/components/AccessRequestModal";
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
const CATEGORIES = ["전체 카테고리", "통계/공공 데이터", "연구/학술 데이터", "금융/경제 데이터", "지역/업체 데이터"];
const YEARS      = ["전체 연도", "2026", "2025", "2024", "2023 이전"];
const FILE_TYPES = ["전체 형식", "CSV", "Excel", "JSON", "Parquet", "TXT", "SAS/SPSS"];
const SORTS = [["new", "최근 등록순"], ["name", "이름순"], ["size", "용량 큰 순"], ["downloads", "다운로드 많은 순"]] as const;
type SortId = (typeof SORTS)[number][0];

// ── 파일 형식·용량·요약·제공 기관 표시용 ──
const fmtOf = (path: string | null) => {
  const ext = path?.includes(".") ? path.split(".").pop()!.toLowerCase() : "";
  return !ext ? "" : ext === "xlsx" || ext === "xls" ? "Excel" : ext.toUpperCase();
};
const sizeOf = (b: number | null) => !b ? "" : b < 1048576 ? `${Math.max(1, Math.round(b / 1024))}KB` : `${(b / 1048576).toFixed(1)}MB`;
// 등록 7일 이내면 "신규" 표시
const isRecent = (createdAt: string) => Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
const summaryOf = (desc: string) => (desc ?? "").split("\n")[0];
const orgOf = (desc: string) => desc?.match(/출처: ([^,\n]+),/)?.[1] ?? "";

// ── 신청 처리 상태 표시 (applications.status) ──
const STATUS_LABEL: Record<string, string> = { pending: "검토 중", approved: "승인됨", rejected: "반려됨" };
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

// ── 카테고리별 아이콘 색상 ────────────────────────────────────
const iconColor: Record<string, string> = {
  "통계/공공 데이터": "bg-blue-50 text-blue-600",
  "연구/학술 데이터": "bg-brand-50 text-brand-600",
  "금융/경제 데이터": "bg-emerald-50 text-emerald-600",
  "지역/업체 데이터": "bg-accent-50 text-accent-700",
};

// ── 신청 내역 행 타입 ────────────────────────────────────────
interface Application {
  id: string;
  created_at: string;
  field: string;
  period: string;
  purpose: string;
  status: string | null; // pending(검토 중) / approved(승인) / rejected(반려)
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
  file_size: number | null;
  created_at: string;
}


// ── 토스트 알림 컴포넌트 ──────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-neutral-900 text-white text-xs sm:text-sm px-4 sm:px-5 py-3 rounded-2xl shadow-xl max-w-[calc(100vw-2rem)]">
      <ShoppingCart size={15} className="text-brand-300" />
      {message}
      <button onClick={onClose} className="ml-2 text-neutral-400 hover:text-white">
        <X size={13} />
      </button>
    </div>
  );
}

export default function DatasetsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── 탭 / 필터 상태 ─────────────────────────────────────────
  const [activeTab, setActiveTab]   = useState<TabId>("browse");
  const [query, setQuery]           = useState("");
  const [category, setCategory]     = useState("전체 카테고리");
  const [year, setYear]             = useState("전체 연도");
  const [fileType, setFileType]     = useState("전체 형식");
  const [view, setView]             = useState<"grid" | "list">("grid");
  const [sort, setSort]             = useState<SortId>("new");

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

  // ── URL ?category= / ?q= / ?tab= 파라미터로 초기 상태 적용 ─────────────
  // (홈 히어로 검색창·카테고리 칩에서 넘어올 때 사용)
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && CATEGORIES.includes(cat)) setCategory(cat);
    const q = searchParams.get("q");
    if (q) setQuery(q);
    // 신청 완료 팝업·홈 안내 링크에서 특정 탭으로 바로 열기
    const tab = searchParams.get("tab");
    if (tab && TABS.some((t) => t.id === tab)) setActiveTab(tab as TabId);
  }, [searchParams]);

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
      .select("id, title, category, year, description, tags, downloads, file_path, file_size, created_at")
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
      .select("id, created_at, field, period, purpose, status, datasets(id, title, category, year, tags)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setApplications((data as unknown as Application[]) ?? []);
        setHistoryFetched(true);
        setHistoryLoading(false);
      });
  }, [activeTab, user, historyFetched]);

  // ── 필터링 ─────────────────────────────────────────────────
  // 검색어는 useDeferredValue로 지연 처리 — 입력창은 즉시 반응하고,
  // 무거운 목록 재필터링은 한 박자 늦춰 타이핑 중 버벅임을 막는다.
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const list = datasets.filter((d) => {
      const matchQ    = !q || (d.title + " " + (d.description ?? "") + " " + (d.tags ?? []).join(" ")).toLowerCase().includes(q);
      const matchCat  = category === "전체 카테고리" || d.category === category;
      const matchYear = year === "전체 연도" || (year === "2023 이전" ? Number(d.year) <= 2023 : d.year === year);
      const matchFile = fileType === "전체 형식" || fmtOf(d.file_path) === fileType || d.tags?.includes(fileType);
      return matchQ && matchCat && matchYear && matchFile;
    });
    if (sort === "name") list.sort((a, b) => a.title.localeCompare(b.title, "ko"));
    if (sort === "size") list.sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0));
    if (sort === "downloads") list.sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0));
    return list; // "new"는 조회 순서(최근 등록순) 그대로
  }, [datasets, deferredQuery, category, year, fileType, sort]);

  // 분야별 건수 (칩에 표시)
  const catCount = useMemo(() => {
    const m: Record<string, number> = { "전체 카테고리": datasets.length };
    for (const d of datasets) m[d.category] = (m[d.category] ?? 0) + 1;
    return m;
  }, [datasets]);

  const hasFilter = category !== "전체 카테고리" || year !== "전체 연도" || fileType !== "전체 형식" || query !== "";

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

      {/* ── 페이지 머리: 제목 + 설명 + 탭 (왼쪽 정렬, 아래 목록과 같은 선) ── */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
          <h1 className="t-h1">데이터 탐색</h1>
          <p className="mt-2 text-[15px] text-neutral-500">공공기관이 공개한 데이터를 개인정보를 걸러 정리했습니다. 신청 후 센터가 승인하면 내려받을 수 있습니다.</p>
          {fetchError && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{fetchError}</div>}
          {/* 모바일: 탭이 많아 넘칠 수 있으므로 가로 스크롤 허용 */}
          <div role="tablist" className="mt-6 flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}
                className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[15px] font-bold transition-colors ${
                  activeTab === tab.id ? "border-brand-500 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>
                {tab.label}
                {tab.id === "cart" && cart.size > 0 && (
                  <span className="ml-1.5 rounded-full bg-accent-400 px-1.5 py-px text-xs font-extrabold text-navy-900 tabular-nums">{cart.size}</span>
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

                    {/* 처리 상태 — 센터 검토 결과 */}
                    <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[app.status ?? "pending"] ?? STATUS_STYLE.pending}`}>
                      {STATUS_LABEL[app.status ?? "pending"] ?? "검토 중"}
                    </span>

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
        <div className="max-w-[1680px] mx-auto px-6 lg:px-8 py-10">
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
              { step: "03", title: "센터 검토·승인", desc: "센터가 신청 내용을 검토합니다. 승인되면 신청 내역과 데이터 페이지에서 바로 내려받을 수 있습니다." },
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
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 pb-20 pt-5">
          {/* 필터 줄: 검색(남는 폭) + 연도 + 형식 + 정렬 + 보기 전환 */}
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex h-[50px] min-w-[240px] flex-[1_1_320px] items-center gap-2.5 rounded-[14px] border border-neutral-200 bg-white px-4 focus-within:border-brand-500 focus-within:ring-[3px] focus-within:ring-brand-100">
              <Search size={18} className="flex-none text-neutral-400" aria-hidden="true" />
              <span className="sr-only">데이터 검색</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="데이터 이름, 내용, 태그로 검색"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400" />
            </label>
            {[
              { value: year, set: setYear, opts: YEARS, label: "기준 연도" },
              { value: fileType, set: setFileType, opts: FILE_TYPES, label: "파일 형식" },
            ].map((sel) => (
              <select key={sel.label} aria-label={sel.label} value={sel.value} onChange={(e) => sel.set(e.target.value)} className="ds-select">
                {sel.opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            ))}
            <select aria-label="정렬" value={sort} onChange={(e) => setSort(e.target.value as SortId)} className="ds-select">
              {SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <div role="group" aria-label="보기 방식" className="flex h-[50px] rounded-[14px] border border-neutral-200 bg-white p-1">
              {([["grid", Grid3X3, "격자 보기"], ["list", List, "목록 보기"]] as const).map(([v, Icon, label]) => (
                <button key={v} type="button" aria-pressed={view === v} aria-label={label} onClick={() => setView(v)}
                  className={`grid w-[42px] place-items-center rounded-[10px] transition-colors ${view === v ? "bg-brand-500 text-white" : "text-neutral-400 hover:text-neutral-700"}`}>
                  <Icon size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* 분야 칩 (건수 포함) */}
          <div role="group" aria-label="분야" className="mt-5 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const on = category === c;
              return (
                <button key={c} type="button" aria-pressed={on} onClick={() => setCategory(c)}
                  className={`h-9 rounded-full border px-3.5 text-sm font-semibold transition-colors ${on ? "border-navy-900 bg-navy-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"}`}>
                  {c === "전체 카테고리" ? "전체" : c.replace(" 데이터", "")}
                  <span className={`ml-1.5 font-medium tabular-nums ${on ? "text-accent-300" : "text-neutral-400"}`}>{catCount[c] ?? 0}</span>
                </button>
              );
            })}
          </div>

          {/* 건수 + 필터 초기화 */}
          <div className="mb-3.5 mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-500">
            <span>총 <b className="font-bold text-neutral-900 tabular-nums">{filtered.length}</b>건{hasFilter && (
              <button type="button" onClick={() => { setCategory("전체 카테고리"); setYear("전체 연도"); setFileType("전체 형식"); setQuery(""); }}
                className="ml-3 inline-flex items-center gap-1 text-brand-600 hover:underline"><X size={12} /> 필터 초기화</button>)}</span>
            <span className="hidden sm:inline">카드의 체크 상자로 여러 개를 골라 한 번에 담을 수 있습니다</span>
          </div>

          {/* 목록 (격자/목록 보기 공용 카드) */}
          {filtered.length === 0 ? (
            <div className="rounded-[18px] border border-neutral-200 bg-white px-5 py-16 text-center">
              <p className="text-[17px] font-bold text-neutral-900">{datasets.length === 0 ? "아직 등록된 데이터가 없습니다" : "조건에 맞는 데이터가 없습니다"}</p>
              <p className="mt-1.5 text-sm text-neutral-500">{datasets.length === 0 ? "센터가 데이터를 등록하면 여기에 보입니다." : "검색어를 줄이거나 다른 분야를 골라 보세요. 필요한 데이터는 게시판에 요청할 수 있습니다."}</p>
            </div>
          ) : (
            <div className={view === "grid"
              ? "grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
              : "overflow-hidden rounded-[18px] border border-neutral-200 bg-white"}>
              {filtered.map((ds) => {
                const isSelected = selected.has(ds.id);
                const inCart = cart.has(ds.id);
                const isLocked = ds.category === "지역/업체 데이터" && !localDataApproved;
                const isNew = isRecent(ds.created_at);
                const grid = view === "grid";
                const go = () => (isLocked ? (user ? setShowAccessModal(true) : router.push("/login")) : router.push(`/datasets/${ds.id}`));
                const fmt = fmtOf(ds.file_path), size = sizeOf(ds.file_size), org = orgOf(ds.description);
                return (
                  <article key={ds.id} onClick={go}
                    className={`group relative cursor-pointer bg-white transition-[transform,box-shadow,border-color,background-color] duration-200 ${grid
                      ? `flex flex-col gap-2.5 rounded-[18px] border p-[18px] pb-4 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(10,22,38,.35)] ${isSelected ? "border-brand-400 ring-2 ring-brand-100" : "border-neutral-200 hover:border-neutral-300"}`
                      : `flex items-center gap-3 border-b border-neutral-200 px-3.5 py-3.5 last:border-b-0 sm:gap-4 sm:px-[18px] ${isSelected ? "bg-brand-50" : "hover:bg-neutral-50"}`}`}>

                    {/* 여러 개 선택용 체크 상자 */}
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(ds.id)} onClick={(e) => e.stopPropagation()}
                      aria-label={`${ds.title} 선택`}
                      className={`h-5 w-5 flex-none cursor-pointer rounded border-neutral-300 accent-brand-500 ${grid ? "absolute right-3.5 top-3.5" : ""}`} />

                    {/* 분야 + 배지 */}
                    <div className={grid ? "flex items-center justify-between gap-2 pr-8" : "flex w-[110px] flex-none flex-col items-start gap-1.5 sm:w-[150px]"}>
                      <span className="text-xs font-bold text-brand-600">{ds.category.replace(" 데이터", "")}</span>
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-accent-100 bg-accent-50 px-1.5 py-0.5 text-[11.5px] font-bold text-accent-700"><Lock size={11} /> 추가 승인 필요</span>
                      ) : isNew && grid ? (
                        <span className="rounded-md bg-accent-400 px-1.5 py-0.5 text-[11px] font-extrabold text-navy-900">신규</span>
                      ) : null}
                    </div>

                    {/* 제목 · 요약 · 메타 · 태그 */}
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <h3 className={`text-[16.5px] font-extrabold leading-[1.35] tracking-[-.01em] text-neutral-900 group-hover:text-brand-700 ${grid ? "" : "truncate"}`}>{ds.title}</h3>
                      <p className={`text-[13.5px] leading-relaxed text-neutral-500 ${grid ? "line-clamp-2" : "truncate"}`}>{summaryOf(ds.description)}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-neutral-500 tabular-nums">
                        {fmt && <b className="font-semibold text-neutral-700">{fmt}</b>}
                        {size && <span>{size}</span>}
                        {ds.year && <span>{ds.year}년 기준</span>}
                        {org && <span className="hidden sm:inline">{org}</span>}
                        <span className="inline-flex items-center gap-0.5"><Download size={11} /> {ds.downloads?.toLocaleString() ?? 0}</span>
                      </div>
                      {grid && ds.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {ds.tags.slice(0, 4).map((t) => <span key={t} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11.5px] text-neutral-700">#{t}</span>)}
                        </div>
                      )}
                    </div>

                    {/* 동작: 설명자료 · 장바구니 · 자세히/권한 신청 */}
                    <div className={`flex flex-none items-center gap-2 ${grid ? "mt-auto pt-1.5" : ""}`}>
                      <button type="button" title="설명자료 내려받기" aria-label="설명자료 내려받기" onClick={(e) => { e.stopPropagation(); downloadDescription(ds); }}
                        className="hidden h-10 w-10 place-items-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 sm:grid"><FileText size={16} /></button>
                      <button type="button" title={inCart ? "장바구니에 담김" : "장바구니 담기"} aria-pressed={inCart} aria-label="장바구니 담기" onClick={(e) => { e.stopPropagation(); addToCart(ds.id); }}
                        className={`grid h-10 w-10 place-items-center rounded-full border ${inCart ? "border-brand-100 bg-brand-50 text-brand-600" : "border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"}`}><ShoppingCart size={16} /></button>
                      {isLocked ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); go(); }}
                          className={`press inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-900 hover:bg-neutral-50 ${grid ? "flex-1" : ""}`}>
                          {alreadyRequested ? <><CheckSquare size={14} /> 권한 신청 대기 중</> : <><Lock size={14} /> 접근 권한 신청</>}
                        </button>
                      ) : (
                        <Link href={`/datasets/${ds.id}`} onClick={(e) => e.stopPropagation()}
                          className={`press inline-flex h-10 items-center justify-center rounded-full bg-brand-500 px-4 text-sm font-bold text-white hover:bg-brand-600 ${grid ? "flex-1" : ""}`}>
                          자세히 · 신청
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* 여러 개 선택했을 때 떠 있는 막대 */}
          {selected.size > 0 && (
            <div className="fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full bg-navy-900 py-2.5 pl-5 pr-2.5 font-bold text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,.6)]">
              <span className="whitespace-nowrap text-sm"><b className="text-accent-300 tabular-nums">{selected.size}</b>개 선택</span>
              <button type="button" onClick={addSelectedToCart} className="press h-9 rounded-full bg-accent-400 px-4 text-[13px] font-bold text-navy-900 hover:bg-accent-300">장바구니에 담기</button>
              <button type="button" onClick={() => setSelected(new Set())} className="press h-9 rounded-full border border-white/20 px-3.5 text-[13px] font-bold text-white hover:bg-white/10">선택 해제</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
