"use client";

/* ============================================================
   DatasetDetailClient — 데이터 상세 + 신청 (시안 v8 디자인)

   구성: 위치 표시 → 제목·요약·태그 → [본문 | 오른쪽 고정 카드]
   본문: 들어 있는 항목(열 이름) / 활용 예시 / 알아 둘 점 / 출처 표시(복사)
   오른쪽: 신청 상태 → 신청하기·다운로드 / 설명자료·장바구니 / 파일 정보
   - 설명(description)의 "주요 항목: / 활용 예시: / 참고: / 출처:" 줄을 나눠서 보여줌
   - 다운로드는 서버가 승인 여부를 확인한 뒤에만 링크 발급 (화면만 막는 게 아님)
============================================================ */

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download, Lock, CheckCircle, Loader2, X, ArrowRight, Shield, AlertTriangle,
  FileText, ShoppingCart, Info, Copy, Check, ExternalLink, Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── 신청서 선택지 ───────────────────────────────────────────────
const FIELDS = ["학술연구", "산업활용", "정책수립", "교육", "기타"];
const PERIODS = ["1개월 이내", "1~3개월", "3~6개월", "6개월~1년", "1년 이상"];
const PLEDGE_ITEMS = [
  "본 데이터는 신청서에 기재한 목적 외에 사용하지 않겠습니다.",
  "데이터를 제3자에게 무단으로 제공하거나 공유하지 않겠습니다.",
  "데이터를 상업적으로 재판매하거나 재배포하지 않겠습니다.",
  "데이터 활용 결과물을 성실히 제출하겠습니다.",
  "위 사항을 위반할 경우 관련 법령에 따른 법적 책임을 질 수 있음을 인지합니다.",
];
const SHORT: Record<string, string> = {
  "통계/공공 데이터": "통계/공공", "연구/학술 데이터": "연구/학술",
  "금융/경제 데이터": "금융/경제", "지역/업체 데이터": "지역/업체",
};

interface Dataset {
  id: string; title: string; category: string; description: string; tags: string[];
  year: string; downloads: number; file_path: string | null; file_size: number | null; created_at: string;
}
interface UserInfo { id: string; name: string; email: string }

const fmtSize = (bytes: number | null) =>
  !bytes ? "-" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))}KB` : `${(bytes / 1024 / 1024).toFixed(1)}MB`;
const fileFormat = (path: string | null) => {
  const ext = path?.split(".").pop()?.toLowerCase();
  if (!ext || ext === path) return "-";
  return ext === "xlsx" || ext === "xls" ? "Excel" : ext.toUpperCase();
};

/** 설명 → 요약 / 주요 항목 / 활용 예시 / 참고 / 출처 로 나누기 (형식에 안 맞으면 전체를 요약으로) */
function parseDescription(desc: string) {
  const [summary, ...rest] = (desc ?? "").split("\n\n");
  const body = rest.join("\n\n");
  const pick = (label: string) => body.match(new RegExp(`^${label}: (.+)$`, "m"))?.[1]?.trim() ?? null;
  const source = pick("출처");
  return {
    summary,
    columns: pick("주요 항목")?.split(/,\s*/).filter(Boolean) ?? [],
    usage: pick("활용 예시"),
    note: pick("참고"),
    source,
    org: source?.split(",")[0] ?? null,
    license: source?.match(/이용허락범위 (.+)$/)?.[1] ?? null,
    url: source?.match(/https?:\/\/\S+/)?.[0] ?? null,
    structured: !!(pick("주요 항목") || source),
  };
}

// ── 신청서 칸 이름 (필수는 *, 선택은 "선택") ──────────────────────
function Label({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[15px] font-bold text-neutral-900">
      {children}{optional ? <span className="ml-1.5 font-medium text-neutral-500">선택</span> : <span className="ml-0.5 text-orange-700">*</span>}
    </label>
  );
}
// ── 칸 아래 오류 문구 ─────────────────────────────────────────────
function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-[13px] text-red-700">{msg}</p> : null;
}

// ── 신청 팝업 (2단계: 신청서 → 보안 서약) ─────────────────────────
function ApplyModal({ dataset, userInfo, onClose, onSuccess }: {
  dataset: Dataset; userInfo: UserInfo; onClose: () => void; onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({ affiliation: "", phone: "", purpose: "", field: "", period: "", projectName: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);

  // Esc 키로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !submitting) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const set = (k: string, v: string) => { setForm((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: "" })); };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.affiliation.trim()) e.affiliation = "소속 기관을 입력해 주세요.";
    if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(form.phone.trim())) e.phone = "연락처를 010-0000-0000 형식으로 입력해 주세요.";
    if (form.purpose.trim().length < 10) e.purpose = "이용 목적을 10자 이상 구체적으로 적어 주세요.";
    if (!form.field) e.field = "활용 분야를 선택해 주세요.";
    if (!form.period) e.period = "활용 기간을 선택해 주세요.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!agreed) return;
    setSubmitting(true);
    setSubmitError(null);
    const { error } = await createClient().from("applications").insert({
      user_id: userInfo.id, dataset_id: dataset.id, institution: form.affiliation.trim(), contact: form.phone.trim(),
      purpose: form.purpose.trim(), field: form.field, period: form.period, project_name: form.projectName.trim() || null, pledge_agreed: true,
    });
    if (error) {
      setSubmitError(error.code === "23505" ? "이미 신청한 데이터입니다. 신청 내역에서 상태를 확인하세요." : "신청하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
      return;
    }
    onSuccess();
  };

  const input = (err?: string) =>
    `w-full rounded-xl border bg-white px-3.5 py-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400 transition-shadow focus:ring-4 ${
      err ? "border-red-300 focus:ring-red-100" : "border-neutral-200 focus:border-brand-300 focus:ring-brand-100"}`;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-neutral-900/50 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="apply-title">
      <div className="mx-auto w-full max-w-xl rounded-3xl bg-white shadow-2xl">
        {/* 머리 */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 pb-5 pt-6 sm:px-8">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-brand-600">데이터 이용 신청</p>
            <h2 id="apply-title" className="mt-1 text-xl font-extrabold leading-snug text-neutral-900">{dataset.title}</h2>
          </div>
          <button onClick={onClose} aria-label="닫기" className="flex-none rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"><X size={20} /></button>
        </div>

        {/* 단계 */}
        <div className="flex gap-2 px-6 pt-5 sm:px-8">
          {["신청서 작성", "보안 서약"].map((label, i) => {
            const n = i + 1, on = step === n, done = step > n;
            return (
              <div key={label} className={`flex flex-1 items-center gap-2.5 rounded-xl px-3.5 py-3 text-[15px] font-bold ${on ? "bg-brand-50 text-brand-700" : "bg-neutral-50 text-neutral-500"}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${on || done ? "bg-brand-500 text-white" : "bg-white text-neutral-500 ring-1 ring-neutral-200"}`}>
                  {done ? <Check size={13} /> : n}
                </span>
                {label}
              </div>
            );
          })}
        </div>

        <div className="px-6 pb-7 pt-6 sm:px-8">
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-4 text-sm">
                <div><p className="text-neutral-500">이름</p><p className="mt-0.5 font-semibold text-neutral-900">{userInfo.name}</p></div>
                <div className="min-w-0"><p className="text-neutral-500">이메일</p><p className="mt-0.5 truncate font-semibold text-neutral-900">{userInfo.email}</p></div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><Label htmlFor="ap-org">소속 기관</Label>
                  <input id="ap-org" value={form.affiliation} onChange={(e) => set("affiliation", e.target.value)} placeholder="예: 인제대학교 보건행정학과" className={input(errors.affiliation)} /><Err msg={errors.affiliation} /></div>
                <div><Label htmlFor="ap-tel">연락처</Label>
                  <input id="ap-tel" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="010-0000-0000" className={input(errors.phone)} />
                  {errors.phone ? <Err msg={errors.phone} /> : <p className="mt-1.5 text-[13px] text-neutral-500">승인 결과 안내에만 씁니다.</p>}</div>
              </div>
              <div><Label htmlFor="ap-pur">이용 목적</Label>
                <textarea id="ap-pur" rows={4} value={form.purpose} onChange={(e) => set("purpose", e.target.value)}
                  placeholder="예: 김해시 제조업 고용 구조를 분석하는 학위논문 3장에 사용합니다." className={`${input(errors.purpose)} resize-y leading-relaxed`} />
                {errors.purpose ? <Err msg={errors.purpose} /> : <p className="mt-1.5 text-[13px] text-neutral-500">무엇을, 어디에 쓰는지 구체적으로 적을수록 검토가 빨라집니다.</p>}</div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><Label htmlFor="ap-fld">활용 분야</Label>
                  <select id="ap-fld" value={form.field} onChange={(e) => set("field", e.target.value)} className={input(errors.field)}>
                    <option value="">선택하세요</option>{FIELDS.map((f) => <option key={f}>{f}</option>)}
                  </select><Err msg={errors.field} /></div>
                <div><Label htmlFor="ap-per">활용 기간</Label>
                  <select id="ap-per" value={form.period} onChange={(e) => set("period", e.target.value)} className={input(errors.period)}>
                    <option value="">선택하세요</option>{PERIODS.map((p) => <option key={p}>{p}</option>)}
                  </select><Err msg={errors.period} /></div>
              </div>
              <div><Label htmlFor="ap-prj" optional>연구·프로젝트명</Label>
                <input id="ap-prj" value={form.projectName} onChange={(e) => set("projectName", e.target.value)} placeholder="예: 2026 지역혁신 연구과제" className={input()} /></div>
              <button onClick={() => { if (validateStep1()) setStep(2); }}
                className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-500 font-bold text-white hover:bg-brand-600">
                다음: 보안 서약 <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="mb-4 flex items-center gap-2 text-[15px] text-neutral-700"><Shield size={17} className="text-brand-600" aria-hidden="true" /> 아래 내용을 확인하고 동의해야 신청할 수 있습니다.</p>
              <div className="overflow-hidden rounded-2xl ring-1 ring-neutral-200">
                <label className="flex cursor-pointer items-start gap-3 bg-neutral-50 px-4 py-4 text-[15px] font-bold text-neutral-900">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-[#0D7377]" />
                  보안 서약 전체에 동의합니다
                </label>
                <ul className="divide-y divide-neutral-100">
                  {PLEDGE_ITEMS.map((item) => (
                    <li key={item} className="flex gap-3 px-4 py-3 text-[15px] leading-relaxed text-neutral-700">
                      <Check size={16} className={`mt-1 flex-none ${agreed ? "text-brand-600" : "text-neutral-300"}`} aria-hidden="true" />{item}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertTriangle size={16} className="mt-0.5 flex-none" aria-hidden="true" /> 서약을 어기면 이용 승인이 취소되고 법적 책임을 질 수 있습니다.
              </p>
              {submitError && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>}
              <div className="mt-6 flex gap-2">
                <button onClick={() => setStep(1)} className="press h-12 flex-1 rounded-full bg-white font-bold text-neutral-800 ring-1 ring-neutral-200 hover:bg-neutral-50">이전</button>
                <button onClick={handleSubmit} disabled={!agreed || submitting}
                  className="press flex h-12 flex-[2] items-center justify-center gap-2 rounded-full bg-brand-500 font-bold text-white hover:bg-brand-600 disabled:bg-neutral-200 disabled:text-neutral-500">
                  {submitting && <Loader2 size={16} className="animate-spin" />}{submitting ? "신청 중…" : "신청 완료"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 신청 완료 안내 (승인 전까지는 다운로드 불가) ──────────────────
function SuccessModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 px-4" role="dialog" aria-modal="true" aria-labelledby="ok-title">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600"><CheckCircle size={30} /></div>
        <h2 id="ok-title" className="text-xl font-extrabold text-neutral-900">신청이 접수되었습니다</h2>
        <p className="mt-2 text-[15px] font-semibold text-brand-700">{title}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">센터가 이용 목적을 검토한 뒤 결과를 알려 드립니다. 승인되면 이 페이지에서 바로 내려받을 수 있습니다.</p>
        <div className="mt-7 space-y-2">
          <button onClick={onClose} className="press h-12 w-full rounded-full bg-brand-500 font-bold text-white hover:bg-brand-600">확인</button>
          <Link href="/datasets?tab=history" className="press block h-12 w-full rounded-full bg-white pt-3 font-bold text-neutral-800 ring-1 ring-neutral-200 hover:bg-neutral-50">신청 내역 보기</Link>
        </div>
      </div>
    </div>
  );
}

// ── 불러오는 동안 자리표시 ─────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-5 pb-28 pt-10 sm:px-6" aria-hidden="true">
      <div className="h-4 w-40 rounded bg-neutral-200" />
      <div className="mt-8 h-4 w-20 rounded bg-neutral-200" />
      <div className="mt-4 h-10 w-3/4 rounded bg-neutral-200" />
      <div className="mt-4 h-5 w-2/3 rounded bg-neutral-100" />
      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-neutral-100" />)}</div>
        <div className="h-80 rounded-3xl bg-neutral-100" />
      </div>
    </div>
  );
}

export default function DatasetDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [appStatus, setAppStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  // 장바구니 담김 여부 — 브라우저 저장소에서 처음 한 번 읽음 (데이터 탐색과 같은 저장소)
  const [inCart, setInCart] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return (JSON.parse(localStorage.getItem("cart") ?? "[]") as string[]).includes(id); } catch { return false; }
  });

  // ── 데이터 + 로그인 사용자 + 신청 상태 ─────────────────────────
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase.from("datasets").select("id, title, category, description, tags, year, downloads, file_path, file_size, created_at").eq("id", id).single(),
      supabase.auth.getUser(),
    ]).then(async ([{ data: ds }, { data: { user } }]) => {
      if (cancelled) return;
      if (!ds) { router.replace("/datasets"); return; }
      setDataset(ds as Dataset);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("name, email").eq("id", user.id).maybeSingle();
        if (cancelled) return;
        setUserInfo({
          id: user.id,
          name: profile?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "",
          email: profile?.email ?? user.email ?? "",
        });
        const { data: app } = await supabase.from("applications").select("id, status").eq("user_id", user.id).eq("dataset_id", id).maybeSingle();
        if (!cancelled && app) setAppStatus(((app as { status: string | null }).status ?? "pending") as "pending" | "approved" | "rejected");
      }
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, router]);

  const toggleCart = () => {
    try {
      const list = new Set(JSON.parse(localStorage.getItem("cart") ?? "[]") as string[]);
      if (list.has(id)) list.delete(id); else list.add(id);
      localStorage.setItem("cart", JSON.stringify([...list]));
      setInCart(list.has(id));
    } catch { /* 저장 불가 환경 */ }
  };

  const info = useMemo(() => parseDescription(dataset?.description ?? ""), [dataset?.description]);
  const citation = info.source
    ? `${info.source.replace(/, 이용허락범위.*$/, "").replace(/, 제한 없음$/, "")}, 인제대학교 데이터거버넌스센터 데이터허브 경유`
    : null;

  const copyCitation = async () => {
    if (!citation) return;
    try { await navigator.clipboard.writeText(citation); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(false); }
  };

  // ── 다운로드 (서버가 승인 여부를 확인한 뒤 서명 링크 발급) ─────
  const handleDownload = async () => {
    if (!dataset || !userInfo) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/datasets/${dataset.id}/download`);
      if (!res.ok) {
        setDownloadError(res.status === 403 ? "다운로드 권한이 없습니다. 승인 상태를 확인해 주세요." : "다운로드 링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setDownloading(false);
        return;
      }
      const { url, filename } = (await res.json()) as { url: string; filename: string };
      const blobUrl = URL.createObjectURL(await (await fetch(url)).blob());
      const a = document.createElement("a");
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setDataset((prev) => (prev ? { ...prev, downloads: prev.downloads + 1 } : prev));
    } catch {
      setDownloadError("내려받지 못했습니다. 다시 시도해 주세요.");
    }
    setDownloading(false);
  };

  // ── 설명자료(.txt) ───────────────────────────────────────────
  const downloadDescription = () => {
    if (!dataset) return;
    const text = [`데이터셋 설명자료`, "=".repeat(40), `제목: ${dataset.title}`, `분야: ${dataset.category}`, `기준연도: ${dataset.year}`,
      `파일: ${fileFormat(dataset.file_path)} ${fmtSize(dataset.file_size)}`, "", dataset.description, "", "인제대학교 데이터거버넌스센터 데이터허브"].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `설명자료_${dataset.title.replace(/[\\/:*?"<>|]/g, "_")}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <DetailSkeleton />;
  if (!dataset) return null;

  const isLocalData = dataset.category === "지역/업체 데이터";

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* 위치 */}
        <nav aria-label="위치" className="flex items-center gap-2 pt-8 text-sm text-neutral-500">
          <Link href="/datasets" className="hover:text-neutral-900">데이터 탐색</Link><span aria-hidden="true">/</span>
          <Link href={`/datasets?category=${encodeURIComponent(dataset.category)}`} className="hover:text-neutral-900">{SHORT[dataset.category] ?? dataset.category}</Link>
        </nav>

        {/* 머리 */}
        <header className="border-b border-neutral-200 pb-9 pt-5">
          <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-brand-600">
            {SHORT[dataset.category] ?? dataset.category}
            {isLocalData && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"><Lock size={11} /> 추가 승인 필요</span>}
          </div>
          <h1 className="t-h1 mt-2.5">{dataset.title}</h1>
          <p className="t-body mt-3 max-w-[44em] text-neutral-700">{info.summary}</p>
          {dataset.tags?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {dataset.tags.map((t) => <span key={t} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[13px] text-neutral-600">#{t}</span>)}
            </div>
          )}
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-12 pb-28 pt-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ── 본문 ── */}
          <div className="divide-y divide-neutral-200 [&>section]:py-9 [&>section:first-child]:pt-0">
            {info.columns.length > 0 && (
              <section>
                <h2 className="t-h3 mb-4">어떤 항목이 들어 있나요</h2>
                <div className="flex flex-wrap gap-1.5">
                  {info.columns.map((c) => <span key={c} className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900">{c}</span>)}
                </div>
              </section>
            )}
            {info.usage && (
              <section>
                <h2 className="t-h3 mb-3">이렇게 활용할 수 있어요</h2>
                <p className="t-body text-neutral-700">{info.usage}</p>
              </section>
            )}
            {info.note && (
              <section>
                <h2 className="t-h3 mb-3">알아 두세요</h2>
                <p className="t-body text-neutral-700">{info.note}</p>
              </section>
            )}
            {/* 형식에 맞지 않는 예전 설명은 그대로 보여줌 */}
            {!info.structured && dataset.description && (
              <section>
                <h2 className="t-h3 mb-3">데이터 설명</h2>
                <p className="t-body whitespace-pre-line text-neutral-700">{dataset.description}</p>
              </section>
            )}
            {citation && (
              <section>
                <h2 className="t-h3 mb-3">출처 표시</h2>
                <div className="rounded-2xl bg-neutral-50 p-5 text-[15px] leading-relaxed text-neutral-800 ring-1 ring-neutral-200/70">
                  {citation}
                  <div className="mt-3 flex justify-end">
                    <button onClick={copyCitation} className="press inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold text-neutral-700 hover:bg-white">
                      {copied ? <><Check size={15} className="text-brand-600" /> 복사했습니다</> : <><Copy size={15} /> 출처 문구 복사</>}
                    </button>
                  </div>
                </div>
                <p className="mt-2.5 text-[13px] text-neutral-500">결과물에 이 문구를 넣으면 이용허락 조건(출처 표시)을 지킨 것이 됩니다. <Link href="/policy#license" className="underline underline-offset-2">저작권 및 라이선스 정책</Link></p>
              </section>
            )}
          </div>

          {/* ── 오른쪽 고정 카드 ── */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl bg-white p-6 shadow-[0_0_0_1px_#E3E7EC,0_18px_40px_-28px_rgba(20,26,34,.3)]">
              {/* 신청 상태 */}
              {appStatus === "approved" ? (
                <>
                  <div className="flex gap-3 rounded-2xl bg-brand-50 p-4 text-[15px] text-brand-900"><CheckCircle size={19} className="mt-0.5 flex-none text-brand-600" /><div><b className="block">승인 완료</b>지금 내려받을 수 있습니다. 링크는 1시간 동안 유효합니다.</div></div>
                  {downloadError && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{downloadError}</p>}
                  <button onClick={handleDownload} disabled={downloading || !dataset.file_path}
                    className="press mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-500 font-bold text-white hover:bg-brand-600 disabled:opacity-60">
                    {downloading ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
                    {downloading ? "내려받는 중…" : dataset.file_path ? "데이터 내려받기" : "파일 준비 중"}
                  </button>
                </>
              ) : appStatus === "pending" ? (
                <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-[15px] text-amber-900"><Clock size={19} className="mt-0.5 flex-none" /><div><b className="block">검토 중</b>센터가 신청서를 검토하고 있습니다. 승인되면 여기서 내려받을 수 있습니다.</div></div>
              ) : appStatus === "rejected" ? (
                <div className="flex gap-3 rounded-2xl bg-red-50 p-4 text-[15px] text-red-900"><Lock size={19} className="mt-0.5 flex-none" /><div><b className="block">반려되었습니다</b>사유는 han9449@inje.ac.kr 로 문의해 주세요.</div></div>
              ) : (
                <>
                  <div className="flex gap-3 rounded-2xl bg-neutral-50 p-4 text-[15px] text-neutral-700"><Info size={19} className="mt-0.5 flex-none text-neutral-500" /><div><b className="block text-neutral-900">신청 전</b>신청서를 내고 승인되면 여기서 바로 내려받을 수 있습니다.</div></div>
                  {userInfo ? (
                    <button onClick={() => setShowApply(true)} className="press mt-3 h-12 w-full rounded-full bg-brand-500 font-bold text-white hover:bg-brand-600">이 데이터 신청하기</button>
                  ) : (
                    <Link href={`/login?next=/datasets/${dataset.id}`} className="press mt-3 block h-12 w-full rounded-full bg-brand-500 pt-3 text-center font-bold text-white hover:bg-brand-600">로그인하고 신청하기</Link>
                  )}
                </>
              )}

              <div className="mt-2 flex gap-2">
                <button onClick={downloadDescription} className="press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-white text-sm font-bold text-neutral-800 ring-1 ring-neutral-200 hover:bg-neutral-50"><FileText size={16} /> 설명자료</button>
                <button onClick={toggleCart} aria-pressed={inCart}
                  className={`press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-bold ring-1 ${inCart ? "bg-brand-50 text-brand-700 ring-brand-200" : "bg-white text-neutral-800 ring-neutral-200 hover:bg-neutral-50"}`}>
                  <ShoppingCart size={16} /> {inCart ? "담김" : "담기"}
                </button>
              </div>

              {/* 파일 정보 */}
              <dl className="mt-5 text-sm">
                {[
                  ["파일 형식", fileFormat(dataset.file_path)],
                  ["용량", fmtSize(dataset.file_size)],
                  ["기준 연도", dataset.year],
                  ["제공 기관", info.org ?? "-"],
                  ["이용허락", info.license ?? "출처 확인"],
                  ["다운로드", `${(dataset.downloads ?? 0).toLocaleString()}회`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-t border-neutral-100 py-2.5">
                    <dt className="text-neutral-500">{k}</dt><dd className="text-right font-semibold tabular-nums text-neutral-900">{v}</dd>
                  </div>
                ))}
                {info.url && (
                  <div className="flex justify-between gap-4 border-t border-neutral-100 py-2.5">
                    <dt className="text-neutral-500">원문</dt>
                    <dd><a href={info.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">공공데이터포털 <ExternalLink size={13} /></a></dd>
                  </div>
                )}
              </dl>

              {isLocalData && (
                <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-900">
                  지역/업체 데이터는 데이터 탐색 페이지에서 &ldquo;접근 권한&rdquo;을 먼저 승인받아야 이용할 수 있습니다.
                </p>
              )}
            </div>
            <p className="mt-4 px-1 text-[13px] leading-relaxed text-neutral-500">
              신청 목적 밖의 이용, 제3자 제공, 재배포는 금지됩니다. 활용 후에는 결과물을 제출해 주세요.
            </p>
          </aside>
        </div>
      </div>

      {showApply && userInfo && (
        <ApplyModal dataset={dataset} userInfo={userInfo} onClose={() => setShowApply(false)}
          onSuccess={() => { setShowApply(false); setShowSuccess(true); setAppStatus("pending"); }} />
      )}
      {showSuccess && <SuccessModal title={dataset.title} onClose={() => setShowSuccess(false)} />}
    </div>
  );
}
