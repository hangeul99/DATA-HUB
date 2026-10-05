"use client";

/* ============================================================
   DatasetsClient — 데이터 탐색 페이지 (시안 v8 디자인)

   구성: 머리글(제목·큰 검색창·탭) → [왼쪽 필터 | 오른쪽 목록]
   탭: 데이터 찾기 / 신청 내역 / 장바구니 / 이용 안내 / 결과물 제출
   - 파일 형식은 file_path 확장자, 제공 기관은 설명의 "출처:" 줄에서 읽음
   - 지역/업체 데이터는 접근 권한 승인 전까지 잠금 표시
   ★ 문구 수정: 이 파일의 JSX 텍스트, 이용 안내는 GUIDE_STEPS
============================================================ */

import { useState, useMemo, useEffect, useDeferredValue } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, X, FileText, ShoppingCart, Trash2, Upload, Loader2,
  ClipboardList, Lock, Unlock, ArrowRight, Check, HelpCircle,
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

// ── 분야 목록 (URL ?category= 값과 같아야 함) ────────────────
const CATEGORIES = ["통계/공공 데이터", "연구/학술 데이터", "금융/경제 데이터", "지역/업체 데이터"];
const SHORT: Record<string, string> = {
  "통계/공공 데이터": "통계/공공", "연구/학술 데이터": "연구/학술",
  "금융/경제 데이터": "금융/경제", "지역/업체 데이터": "지역/업체",
};
const LOCKED_CATEGORY = "지역/업체 데이터";

// ── 이용 안내 (정책 페이지의 데이터 이용 정책과 같은 내용) ──
const GUIDE_STEPS = [
  { title: "데이터 탐색", desc: "분야와 검색어로 필요한 데이터를 찾고, 상세 페이지에서 항목과 미리보기를 확인합니다." },
  { title: "이용 신청", desc: "소속 기관, 연락처, 이용 목적, 활용 분야와 기간을 적고 보안 서약에 동의합니다." },
  { title: "센터 검토·승인", desc: "센터가 이용 목적을 검토한 뒤 승인 여부를 알려 드립니다. 지역/업체 데이터는 접근 권한 승인이 먼저 필요합니다." },
  { title: "다운로드", desc: "승인되면 데이터 상세 페이지나 마이페이지에서 내려받습니다. 다운로드 링크는 보안을 위해 1시간 동안만 유효합니다." },
  { title: "결과물 제출", desc: "활용이 끝나면 논문, 보고서, 서비스 화면 등 결과물을 결과물 제출 탭에서 등록해 주세요." },
];

// ── 신청 내역 행 타입 ────────────────────────────────────────
interface Application {
  id: string;
  created_at: string;
  field: string;
  period: string;
  purpose: string;
  status?: string | null;
  datasets: { id: string; title: string; category: string; year: string; tags: string[] } | null;
}

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

/** 파일 경로 확장자 → 표시용 형식 이름 */
function fileFormat(path: string | null): string {
  const ext = path?.split(".").pop()?.toLowerCase();
  if (!ext || ext === path) return "기타";
  if (ext === "xlsx" || ext === "xls") return "Excel";
  return ext.toUpperCase();
}
/** 바이트 → "1.1MB" / "56KB" */
function fmtSize(bytes: number | null) {
  if (!bytes) return null;
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
/** 설명 첫 문단 = 목록에 보이는 요약 */
const summaryOf = (d: Dataset) => (d.description ?? "").split("\n\n")[0];
/** 설명의 "출처: 기관, ..." 줄에서 제공 기관 이름만 */
const orgOf = (d: Dataset) => d.description?.match(/출처: ([^,\n]+),/)?.[1] ?? null;

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  approved: { text: "승인", cls: "bg-brand-50 text-brand-700" },
  rejected: { text: "반려", cls: "bg-red-50 text-red-700" },
  pending:  { text: "검토 중", cls: "bg-amber-50 text-amber-800" },
};

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 px-4" role="dialog" aria-modal="true" aria-labelledby="access-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        {done ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Unlock size={24} /></div>
            <h3 id="access-title" className="text-xl font-extrabold text-neutral-900">신청했습니다</h3>
            <p className="mt-2 text-[15px] text-neutral-600">센터가 검토해 승인하면 지역/업체 데이터를 신청할 수 있습니다.</p>
            <button onClick={onClose} className="press mt-6 h-12 w-full rounded-full bg-brand-500 font-bold text-white hover:bg-brand-600">확인</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="access-title" className="text-xl font-extrabold text-neutral-900">지역/업체 데이터 접근 신청</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">지역 사업체 정보가 담긴 데이터라 센터 승인 후 이용할 수 있습니다. 필요한 이유를 적어 주세요.</p>
              </div>
              <button onClick={onClose} aria-label="닫기" className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"><X size={18} /></button>
            </div>
            <label htmlFor="access-reason" className="mt-5 block text-sm font-bold text-neutral-900">신청 이유</label>
            <textarea id="access-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
              placeholder="예: 김해 소상공인 상권 분석 연구에 활용하려고 합니다."
              className="mt-2 w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-[15px] outline-none placeholder:text-neutral-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100" />
            <button onClick={handleSubmit} disabled={!reason.trim() || submitting}
              className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-500 font-bold text-white hover:bg-brand-600 disabled:bg-neutral-200 disabled:text-neutral-500">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "신청 중…" : "접근 권한 신청"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── 목록 자리표시 (불러오는 동안) ─────────────────────────────
function RowSkeleton() {
  return (
    <div className="animate-pulse border-b border-neutral-200 px-1 py-6" aria-hidden="true">
      <div className="h-3 w-16 rounded bg-neutral-200" />
      <div className="mt-3 h-5 w-2/3 rounded bg-neutral-200" />
      <div className="mt-3 h-4 w-11/12 rounded bg-neutral-100" />
      <div className="mt-4 h-3 w-1/3 rounded bg-neutral-100" />
    </div>
  );
}

// ── 빈 상태 공통 ─────────────────────────────────────────────
function Empty({ icon: Icon, title, desc, action }: { icon: React.ElementType; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-neutral-50 px-6 py-16 text-center ring-1 ring-neutral-200/70">
      <Icon size={32} className="mx-auto text-neutral-400" aria-hidden="true" />
      <p className="mt-4 text-[17px] font-bold text-neutral-900">{title}</p>
      {desc && <p className="mt-1.5 text-[15px] text-neutral-600">{desc}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export default function DatasetsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── 탭 / 필터 상태 ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("browse");
  const [query, setQuery]         = useState("");
  const [category, setCategory]   = useState("all");
  const [year, setYear]           = useState("all");
  const [fileType, setFileType]   = useState("all");
  const [sort, setSort]           = useState<"new" | "name" | "downloads">("new");

  // ── 선택 / 장바구니 상태 (장바구니는 이 브라우저에 저장) ────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("cart") ?? "[]")); } catch { return new Set(); }
  });
  const [toast, setToast] = useState<string | null>(null);

  // ── 로그인 유저 / 데이터 ───────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [datasets, setDatasets]     = useState<Dataset[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── 결과물 제출 폼 ─────────────────────────────────────────
  const [resultDatasetId,  setResultDatasetId]  = useState("");
  const [resultSummary,    setResultSummary]    = useState("");
  const [resultFile,       setResultFile]       = useState<File | null>(null);
  const [resultSubmitting, setResultSubmitting] = useState(false);
  const [resultDone,       setResultDone]       = useState(false);
  const [resultError,      setResultError]      = useState<string | null>(null);

  // ── 지역/업체 데이터 접근 권한 ─────────────────────────────
  const [localDataApproved, setLocalDataApproved] = useState<boolean | null>(null);
  const [showAccessModal, setShowAccessModal]     = useState(false);
  const [alreadyRequested, setAlreadyRequested]   = useState(false);

  // ── 신청 내역 ─────────────────────────────────────────────
  const [applications, setApplications]     = useState<Application[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFetched, setHistoryFetched] = useState(false);

  // ── 로그인 유저 감지 ──────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      setHistoryFetched(false); // 유저가 바뀌면 신청 내역 다시 불러오기
      setApplications([]);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── URL ?category= / ?q= / ?tab= 로 초기 상태 적용 (홈 검색·분야 링크에서 넘어올 때) ──
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && CATEGORIES.includes(cat)) setCategory(cat);
    const q = searchParams.get("q");
    if (q) setQuery(q);
    const tab = searchParams.get("tab");
    if (tab && TABS.some((t) => t.id === tab)) setActiveTab(tab as TabId);
  }, [searchParams]);

  // ── 지역/업체 접근 권한 + 신청 여부 ───────────────────────
  useEffect(() => {
    if (!user) { setLocalDataApproved(null); return; }
    const supabase = createClient();
    supabase.from("profiles").select("local_data_approved").eq("id", user.id).single()
      .then(({ data }) => setLocalDataApproved(data?.local_data_approved ?? false));
    supabase.from("access_requests").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setAlreadyRequested(!!data));
  }, [user]);

  // ── 데이터셋 목록 ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("datasets")
      .select("id, title, category, year, description, tags, downloads, file_path, file_size, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setFetchError("데이터를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.");
        else setDatasets(data ?? []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ── 신청 내역 (탭에 처음 들어갈 때 1회) ───────────────────
  useEffect(() => {
    if (activeTab !== "history" || !user || historyFetched) return;
    let cancelled = false;
    setHistoryLoading(true);
    createClient()
      .from("applications")
      .select("id, created_at, field, period, purpose, status, datasets(id, title, category, year, tags)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        setApplications((data as unknown as Application[]) ?? []);
        setHistoryFetched(true);
        setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, user, historyFetched]);

  // ── 장바구니 → localStorage ───────────────────────────────
  useEffect(() => {
    try { localStorage.setItem("cart", JSON.stringify([...cart])); } catch { /* 저장 불가 환경은 무시 */ }
  }, [cart]);

  // ── 키보드 "/" → 검색창 ───────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (e.key !== "/" || ["input", "textarea", "select"].includes(tag)) return;
      e.preventDefault();
      document.getElementById("ds-search")?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── 필터 옵션과 건수 (데이터에서 계산) ─────────────────────
  const counts = useMemo(() => {
    const cat: Record<string, number> = {}, fmt: Record<string, number> = {}, yr: Record<string, number> = {};
    for (const d of datasets) {
      cat[d.category] = (cat[d.category] ?? 0) + 1;
      const f = fileFormat(d.file_path); fmt[f] = (fmt[f] ?? 0) + 1;
      yr[d.year] = (yr[d.year] ?? 0) + 1;
    }
    return { cat, fmt, yr };
  }, [datasets]);

  // ── 필터링 + 정렬 (검색어는 한 박자 늦춰 타이핑 중 버벅임 방지) ──
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const filtered = useMemo(() => {
    const list = datasets.filter((d) => {
      const hay = `${d.title} ${d.description ?? ""} ${(d.tags ?? []).join(" ")}`.toLowerCase();
      return (!deferredQuery || hay.includes(deferredQuery))
        && (category === "all" || d.category === category)
        && (year === "all" || d.year === year)
        && (fileType === "all" || fileFormat(d.file_path) === fileType);
    });
    return list.sort((a, b) =>
      sort === "name" ? a.title.localeCompare(b.title, "ko")
      : sort === "downloads" ? (b.downloads ?? 0) - (a.downloads ?? 0)
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [datasets, deferredQuery, category, year, fileType, sort]);

  const hasFilter = category !== "all" || year !== "all" || fileType !== "all" || query !== "";
  const resetFilters = () => { setCategory("all"); setYear("all"); setFileType("all"); setQuery(""); };

  // ── 동작 ──────────────────────────────────────────────────
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600); };
  const isLocked = (d: Dataset) => d.category === LOCKED_CATEGORY && !localDataApproved;
  const openLocked = () => (user ? setShowAccessModal(true) : router.push("/login"));

  const toggleCart = (d: Dataset) => {
    const had = cart.has(d.id); // 알림은 상태 변경 함수 밖에서 (두 번 실행 방지)
    setCart((prev) => { const n = new Set(prev); if (had) n.delete(d.id); else n.add(d.id); return n; });
    showToast(had ? "장바구니에서 뺐습니다." : `장바구니에 담았습니다: ${d.title}`);
  };
  const toggleSelect = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const addSelectedToCart = () => {
    setCart((prev) => { const n = new Set(prev); selected.forEach((id) => n.add(id)); return n; });
    showToast(`${selected.size}개를 장바구니에 담았습니다.`);
    setSelected(new Set());
  };

  const submitAccessRequest = async (reason: string) => {
    if (!user) return;
    await createClient().from("access_requests").insert({ user_id: user.id, reason, status: "pending" });
    setAlreadyRequested(true);
  };

  // ── 설명자료(.txt) 내려받기 ──────────────────────────────
  const downloadDescription = (ds: Dataset) => {
    const lines = [
      "데이터셋 설명자료", "=".repeat(40),
      `제목    : ${ds.title}`, `분야    : ${ds.category}`, `기준연도: ${ds.year}`,
      `파일형식: ${fileFormat(ds.file_path)}${fmtSize(ds.file_size) ? ` (${fmtSize(ds.file_size)})` : ""}`,
      `태그    : ${ds.tags?.join(", ") || "-"}`, "",
      "[데이터 설명]", ds.description || "설명 없음", "",
      "=".repeat(40), "인제대학교 데이터거버넌스센터 데이터허브",
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `설명자료_${ds.title.replace(/[\\/:*?"<>|]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── 결과물 제출 ───────────────────────────────────────────
  const submitResult = async () => {
    if (!user)                 { setResultError("로그인이 필요합니다."); return; }
    if (!resultDatasetId)      { setResultError("활용한 데이터를 선택해 주세요."); return; }
    if (!resultSummary.trim()) { setResultError("활용 내용을 적어 주세요."); return; }
    if (resultFile && resultFile.size > 50 * 1024 * 1024) { setResultError("파일은 50MB까지 올릴 수 있습니다."); return; }

    setResultSubmitting(true);
    setResultError(null);
    const supabase = createClient();

    let filePath: string | null = null, fileName: string | null = null;
    if (resultFile) {
      const uploadPath = `${user.id}/${Date.now()}.${resultFile.name.split(".").pop()}`;
      const { error: uploadErr } = await supabase.storage.from("results").upload(uploadPath, resultFile, { upsert: false });
      if (uploadErr) { setResultError("파일을 올리지 못했습니다. 다시 시도해 주세요."); setResultSubmitting(false); return; }
      filePath = uploadPath; fileName = resultFile.name;
    }

    const { error } = await supabase.from("results").insert({
      user_id: user.id, dataset_id: resultDatasetId, summary: resultSummary.trim(), file_path: filePath, file_name: fileName,
    });
    if (error) setResultError("제출하지 못했습니다. 다시 시도해 주세요.");
    else { setResultDone(true); setResultDatasetId(""); setResultSummary(""); setResultFile(null); }
    setResultSubmitting(false);
  };

  const cartItems = datasets.filter((d) => cart.has(d.id));

  // ── 필터 버튼 공통 스타일 ─────────────────────────────────
  const chip = (on: boolean) =>
    `press rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-neutral-900 text-white" : "bg-white text-neutral-700 ring-1 ring-neutral-200 hover:ring-neutral-300"}`;

  return (
    <div className="min-h-screen bg-white">
      {/* 토스트 */}
      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[70] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
      {showAccessModal && <AccessRequestModal onClose={() => setShowAccessModal(false)} onSubmit={submitAccessRequest} />}

      {/* ── 머리글: 제목 · 큰 검색창 · 탭 ── */}
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-5 pt-10 sm:px-6 sm:pt-14">
          <h1 className="t-h1">데이터 탐색</h1>
          <p className="t-body mt-2 text-neutral-600">공공기관이 공개한 데이터를 개인정보를 걸러 정리했습니다. 신청 후 승인되면 내려받을 수 있습니다.</p>

          <label htmlFor="ds-search"
            className="mt-6 flex h-14 max-w-3xl items-center gap-3 rounded-2xl bg-white px-5 shadow-[0_0_0_1px_#E3E7EC,0_8px_24px_-16px_rgba(20,26,34,.25)] transition-shadow focus-within:shadow-[0_0_0_2px_#4FAFAF,0_8px_24px_-16px_rgba(20,26,34,.25)]">
            <Search size={20} className="flex-none text-neutral-500" aria-hidden="true" />
            <span className="sr-only">데이터 검색</span>
            <input id="ds-search" type="search" value={query}
              onChange={(e) => { setQuery(e.target.value); if (activeTab !== "browse") setActiveTab("browse"); }}
              placeholder="데이터 이름, 내용, 태그로 검색"
              className="h-full min-w-0 flex-1 bg-transparent text-base text-neutral-900 outline-none placeholder:text-neutral-500" />
            <kbd className="hidden rounded-md border border-neutral-200 bg-neutral-50 px-1.5 text-xs text-neutral-500 sm:block">/</kbd>
          </label>

          <div role="tablist" aria-label="데이터 탐색 메뉴" className="-mb-px mt-7 flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {TABS.map((tab) => (
              <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-none border-b-2 px-3.5 py-3 text-[15px] font-bold transition-colors ${
                  activeTab === tab.id ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}>
                {tab.label}
                {tab.id === "cart" && cart.size > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs text-white tabular-nums">{cart.size}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-6">

        {/* ═════════ 데이터 찾기 ═════════ */}
        {activeTab === "browse" && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-10 pb-28 pt-9 lg:grid-cols-[230px_minmax(0,1fr)]">

            {/* 왼쪽 필터 (PC) */}
            <aside aria-label="필터" className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
              <div className="border-b border-neutral-200 pb-5">
                <h2 className="mb-2.5 text-sm font-bold text-neutral-900">분야</h2>
                {["all", ...CATEGORIES].map((c) => {
                  const on = category === c;
                  return (
                    <button key={c} type="button" aria-pressed={on} onClick={() => setCategory(c)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[15px] transition-colors ${on ? "bg-brand-50 font-bold text-brand-700" : "text-neutral-700 hover:bg-neutral-50"}`}>
                      <span>{c === "all" ? "전체" : SHORT[c]}</span>
                      <span className={`text-[13px] tabular-nums ${on ? "text-brand-700" : "text-neutral-500"}`}>{c === "all" ? datasets.length : counts.cat[c] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
              <div className="border-b border-neutral-200 py-5">
                <h2 className="mb-2.5 text-sm font-bold text-neutral-900">파일 형식</h2>
                <div className="flex flex-wrap gap-1.5">
                  {["all", ...Object.keys(counts.fmt)].map((f) => (
                    <button key={f} type="button" aria-pressed={fileType === f} onClick={() => setFileType(f)} className={chip(fileType === f)}>
                      {f === "all" ? "전체" : `${f} ${counts.fmt[f]}`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="py-5">
                <h2 className="mb-2.5 text-sm font-bold text-neutral-900">기준 연도</h2>
                <div className="flex flex-wrap gap-1.5">
                  {["all", ...Object.keys(counts.yr).sort().reverse()].map((y) => (
                    <button key={y} type="button" aria-pressed={year === y} onClick={() => setYear(y)} className={chip(year === y)}>
                      {y === "all" ? "전체" : y}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div>
              {/* 모바일 분야 칩 */}
              <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] lg:hidden">
                {["all", ...CATEGORIES].map((c) => (
                  <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={`flex-none ${chip(category === c)}`}>
                    {c === "all" ? "전체" : SHORT[c]}
                  </button>
                ))}
              </div>

              {/* 건수 · 정렬 */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[15px] text-neutral-600" aria-live="polite">
                  {loading ? "불러오는 중…" : <><b className="tabular-nums text-neutral-900">{filtered.length}</b>건의 데이터{query && <> · &ldquo;{query}&rdquo; 검색 결과</>}</>}
                  {hasFilter && !loading && (
                    <button type="button" onClick={resetFilters} className="ml-3 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline">필터 초기화</button>
                  )}
                </p>
                <label className="relative">
                  <span className="sr-only">정렬</span>
                  <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
                    className="h-10 appearance-none rounded-xl border border-neutral-200 bg-white pl-3 pr-9 text-sm text-neutral-800 outline-none focus:border-brand-300">
                    <option value="new">최근 등록순</option>
                    <option value="name">이름순</option>
                    <option value="downloads">다운로드 많은 순</option>
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                </label>
              </div>

              {fetchError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{fetchError}</p>}

              {/* 목록 */}
              <div className="border-t border-neutral-200">
                {loading ? (
                  Array.from({ length: 6 }, (_, i) => <RowSkeleton key={i} />)
                ) : filtered.length === 0 ? (
                  <div className="pt-8">
                    <Empty icon={Search}
                      title={datasets.length === 0 ? "아직 등록된 데이터가 없습니다" : "조건에 맞는 데이터가 없습니다"}
                      desc={datasets.length === 0 ? "센터가 데이터를 등록하면 이곳에 표시됩니다." : "검색어를 줄이거나 필터를 초기화해 보세요."}
                      action={hasFilter ? <button onClick={resetFilters} className="press h-11 rounded-full bg-white px-5 font-bold text-neutral-900 ring-1 ring-neutral-200 hover:bg-neutral-50">필터 초기화</button> : undefined} />
                  </div>
                ) : filtered.map((ds) => {
                  const locked = isLocked(ds);
                  const inCart = cart.has(ds.id);
                  const size = fmtSize(ds.file_size);
                  const org = orgOf(ds);
                  return (
                    <article key={ds.id}
                      onClick={() => (locked ? openLocked() : router.push(`/datasets/${ds.id}`))}
                      className="group grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-b border-neutral-200 px-1 py-6 transition-colors hover:bg-neutral-50/70 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4">
                      {/* 여러 개 선택 */}
                      <input type="checkbox" checked={selected.has(ds.id)} disabled={locked}
                        onChange={() => toggleSelect(ds.id)} onClick={(e) => e.stopPropagation()}
                        aria-label={`${ds.title} 선택`}
                        className="mt-1 h-[18px] w-[18px] cursor-pointer rounded accent-[#0D7377] disabled:cursor-not-allowed disabled:opacity-30" />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-brand-600">
                          {SHORT[ds.category] ?? ds.category}
                          {ds.category === LOCKED_CATEGORY && !localDataApproved && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              <Lock size={11} aria-hidden="true" /> 추가 승인 필요
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 text-lg font-bold leading-snug text-neutral-900 group-hover:text-brand-700">{ds.title}</h3>
                        <p className="mt-1.5 line-clamp-1 text-[15px] text-neutral-600">{summaryOf(ds)}</p>
                        <p className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-neutral-500">
                          <span>{fileFormat(ds.file_path)}</span>
                          {size && <span>{size}</span>}
                          <span>{ds.year} 기준</span>
                          {org && <span>{org}</span>}
                          <span className="tabular-nums">다운로드 {(ds.downloads ?? 0).toLocaleString()}</span>
                        </p>
                      </div>

                      {/* 오른쪽 동작 */}
                      <div className="col-span-2 mt-4 flex items-center gap-1.5 sm:col-span-1 sm:mt-0 sm:self-center" onClick={(e) => e.stopPropagation()}>
                        {locked ? (
                          <button type="button" onClick={openLocked} disabled={alreadyRequested}
                            className="press inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-50 disabled:opacity-60">
                            {alreadyRequested ? <><Check size={14} /> 접근 신청 검토 중</> : <><Lock size={14} /> 접근 권한 신청</>}
                          </button>
                        ) : (
                          <>
                            <button type="button" title="설명자료 내려받기" aria-label="설명자료 내려받기" onClick={() => downloadDescription(ds)}
                              className="press flex h-10 w-10 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900">
                              <FileText size={18} />
                            </button>
                            <button type="button" title={inCart ? "장바구니에서 빼기" : "장바구니 담기"} aria-label={inCart ? "장바구니에서 빼기" : "장바구니 담기"}
                              aria-pressed={inCart} onClick={() => toggleCart(ds)}
                              className={`press flex h-10 w-10 items-center justify-center rounded-xl ${inCart ? "bg-brand-50 text-brand-700" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"}`}>
                              <ShoppingCart size={18} />
                            </button>
                            <Link href={`/datasets/${ds.id}`}
                              className="press ml-1 inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-neutral-900 ring-1 ring-neutral-200 hover:bg-neutral-50">
                              자세히 <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═════════ 신청 내역 ═════════ */}
        {activeTab === "history" && (
          <div className="mx-auto max-w-3xl pb-28 pt-10">
            <h2 className="t-h3 mb-5">신청 내역</h2>
            {!user ? (
              <Empty icon={ClipboardList} title="로그인하면 신청 내역을 볼 수 있습니다"
                action={<Link href="/login" className="press inline-flex h-11 items-center rounded-full bg-brand-500 px-5 font-bold text-white hover:bg-brand-600">로그인</Link>} />
            ) : historyLoading ? (
              Array.from({ length: 3 }, (_, i) => <RowSkeleton key={i} />)
            ) : applications.length === 0 ? (
              <Empty icon={ClipboardList} title="아직 신청한 데이터가 없습니다"
                action={<button onClick={() => setActiveTab("browse")} className="press h-11 rounded-full bg-white px-5 font-bold text-neutral-900 ring-1 ring-neutral-200 hover:bg-neutral-50">데이터 찾기</button>} />
            ) : (
              <ul className="border-t border-neutral-200">
                {applications.map((app) => {
                  const ds = app.datasets;
                  const st = STATUS_LABEL[app.status ?? "pending"] ?? STATUS_LABEL.pending;
                  return (
                    <li key={app.id} className="flex items-center gap-4 border-b border-neutral-200 py-5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-brand-600">{ds ? SHORT[ds.category] ?? ds.category : "—"}</p>
                        <p className="mt-1 truncate text-[17px] font-bold text-neutral-900">{ds?.title ?? "삭제된 데이터"}</p>
                        <p className="mt-1 text-[13px] text-neutral-500">
                          {new Date(app.created_at).toLocaleDateString("ko-KR")} 신청 · {app.field || "기타"} · 이용 기간 {app.period}
                        </p>
                      </div>
                      <span className={`flex-none rounded-md px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.text}</span>
                      {ds && (
                        <Link href={`/datasets/${ds.id}`} aria-label={`${ds.title} 상세 보기`}
                          className="press flex h-10 w-10 flex-none items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100">
                          <ArrowRight size={18} />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ═════════ 장바구니 ═════════ */}
        {activeTab === "cart" && (
          <div className="mx-auto max-w-3xl pb-28 pt-10">
            <h2 className="t-h3 mb-1">장바구니 <span className="tabular-nums text-brand-600">{cart.size}</span></h2>
            <p className="mb-5 text-[15px] text-neutral-600">담아 둔 데이터는 이 브라우저에 저장됩니다. 하나씩 상세 페이지에서 신청하세요.</p>
            {cartItems.length === 0 ? (
              <Empty icon={ShoppingCart} title="장바구니가 비어 있습니다" desc="목록에서 장바구니 아이콘을 눌러 담아 보세요."
                action={<button onClick={() => setActiveTab("browse")} className="press h-11 rounded-full bg-white px-5 font-bold text-neutral-900 ring-1 ring-neutral-200 hover:bg-neutral-50">데이터 찾기</button>} />
            ) : (
              <ul className="border-t border-neutral-200">
                {cartItems.map((ds) => (
                  <li key={ds.id} className="flex items-center gap-3 border-b border-neutral-200 py-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-brand-600">{SHORT[ds.category] ?? ds.category}</p>
                      <p className="mt-1 truncate text-[17px] font-bold text-neutral-900">{ds.title}</p>
                    </div>
                    <Link href={`/datasets/${ds.id}`} className="press inline-flex h-10 flex-none items-center rounded-full bg-brand-500 px-4 text-sm font-bold text-white hover:bg-brand-600">신청하기</Link>
                    <button onClick={() => toggleCart(ds)} aria-label={`${ds.title} 장바구니에서 빼기`}
                      className="press flex h-10 w-10 flex-none items-center justify-center rounded-xl text-neutral-500 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={17} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ═════════ 이용 안내 ═════════ */}
        {activeTab === "guide" && (
          <div className="mx-auto max-w-3xl pb-28 pt-10">
            <h2 className="t-h3 mb-6">신청부터 활용까지 다섯 단계</h2>
            <ol className="relative space-y-7 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-0.5 before:bg-neutral-200">
              {GUIDE_STEPS.map((s, i) => (
                <li key={s.title} className="relative flex gap-5">
                  <span className="z-10 flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-500 text-[15px] font-extrabold text-white">{i + 1}</span>
                  <div className="pt-1.5">
                    <p className="text-[17px] font-bold text-neutral-900">{s.title}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-neutral-600">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex gap-3 rounded-2xl bg-neutral-50 p-5 ring-1 ring-neutral-200/70">
              <HelpCircle size={18} className="mt-0.5 flex-none text-brand-600" aria-hidden="true" />
              <p className="text-[15px] text-neutral-700">
                자세한 기준은 <Link href="/policy#data-use" className="font-bold text-brand-700 underline underline-offset-2">데이터 이용 정책</Link>을 확인하세요.
                문의: <span className="font-semibold">han9449@inje.ac.kr</span>
              </p>
            </div>
          </div>
        )}

        {/* ═════════ 결과물 제출 ═════════ */}
        {activeTab === "result" && (
          <div className="mx-auto max-w-2xl pb-28 pt-10">
            <h2 className="t-h3 mb-1">결과물 제출</h2>
            <p className="mb-6 text-[15px] text-neutral-600">데이터를 활용해 만든 논문, 보고서, 서비스 화면 등을 등록해 주세요. <Link href="/policy#results" className="font-semibold text-brand-700 underline underline-offset-2">제출 지침</Link></p>
            {!user ? (
              <Empty icon={Upload} title="로그인하면 결과물을 제출할 수 있습니다"
                action={<Link href="/login" className="press inline-flex h-11 items-center rounded-full bg-brand-500 px-5 font-bold text-white hover:bg-brand-600">로그인</Link>} />
            ) : resultDone ? (
              <Empty icon={Check} title="결과물을 제출했습니다" desc="마이페이지에서 제출 내역을 볼 수 있습니다."
                action={<button onClick={() => setResultDone(false)} className="press h-11 rounded-full bg-white px-5 font-bold text-neutral-900 ring-1 ring-neutral-200 hover:bg-neutral-50">하나 더 제출하기</button>} />
            ) : (
              <div className="space-y-6">
                <div>
                  <label htmlFor="r-ds" className="mb-2 block text-[15px] font-bold text-neutral-900">활용한 데이터 <span className="text-orange-700">*</span></label>
                  <select id="r-ds" value={resultDatasetId} onChange={(e) => setResultDatasetId(e.target.value)}
                    className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-base text-neutral-900 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100">
                    <option value="">데이터를 선택하세요</option>
                    {datasets.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="r-sum" className="mb-2 block text-[15px] font-bold text-neutral-900">활용 내용 <span className="text-orange-700">*</span></label>
                  <textarea id="r-sum" rows={5} value={resultSummary} onChange={(e) => setResultSummary(e.target.value)}
                    placeholder="예: 김해시 공장기업 현황으로 업종별 외국인 근로자 비중을 분석해 학회에서 발표했습니다."
                    className="w-full resize-y rounded-xl border border-neutral-200 px-3.5 py-3 text-base leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-100" />
                </div>
                <div>
                  <p className="mb-2 text-[15px] font-bold text-neutral-900">증빙 파일 <span className="font-medium text-neutral-500">선택</span></p>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 px-6 py-9 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40">
                    <Upload size={22} className="text-neutral-500" aria-hidden="true" />
                    {resultFile ? <span className="text-[15px] font-bold text-brand-700">{resultFile.name}</span> : (
                      <>
                        <span className="text-[15px] text-neutral-700">눌러서 파일 선택</span>
                        <span className="text-[13px] text-neutral-500">PDF, JPG, PNG, ZIP · 최대 50MB</span>
                      </>
                    )}
                    <input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png,.zip" onChange={(e) => setResultFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
                {resultError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{resultError}</p>}
                <button onClick={submitResult} disabled={resultSubmitting}
                  className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-500 font-bold text-white hover:bg-brand-600 disabled:opacity-60">
                  {resultSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {resultSubmitting ? "제출 중…" : "결과물 제출"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 여러 개 선택했을 때 아래에 뜨는 막대 */}
      {selected.size > 0 && activeTab === "browse" && (
        <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full bg-neutral-900 py-2 pl-5 pr-2 text-white shadow-2xl">
            <span className="text-[15px] font-semibold tabular-nums">{selected.size}개 선택</span>
            <button onClick={() => setSelected(new Set())} className="rounded-full px-3 py-2 text-sm text-neutral-300 hover:text-white">해제</button>
            <button onClick={addSelectedToCart} className="press inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-bold text-neutral-900">
              <ShoppingCart size={15} /> 장바구니에 담기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
