"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Download, Lock, CheckCircle, Loader2, Eye,
  X, ArrowRight, Shield, FileText, AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ── 상수 ─────────────────────────────────────────────────────────
const FIELDS = ["학술연구", "산업활용", "정책수립", "교육", "기타"];
const PERIODS = ["1개월 이내", "1~3개월", "3~6개월", "6개월~1년", "1년 이상"];
const PLEDGE_ITEMS = [
  "본 데이터는 신청서에 기재한 목적 외에 사용하지 않겠습니다.",
  "데이터를 제3자에게 무단으로 제공하거나 공유하지 않겠습니다.",
  "데이터를 상업적으로 재판매하거나 재배포하지 않겠습니다.",
  "데이터 활용 결과물을 성실히 제출하겠습니다.",
  "위 사항을 위반할 경우 관련 법령에 따른 법적 책임을 질 수 있음을 인지합니다.",
];

// ── 타입 ─────────────────────────────────────────────────────────
interface Dataset {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  year: string;
  downloads: number;
  file_path: string | null;
  file_size: number | null;
  created_at: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

// ── 용량 포맷 ─────────────────────────────────────────────────────
const fmtBytes = (bytes: number | null) => {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};

// ── 신청 모달 ─────────────────────────────────────────────────────
function ApplyModal({
  dataset, userInfo, onClose, onSuccess,
}: {
  dataset: Dataset;
  userInfo: UserInfo;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({ affiliation: "", phone: "", purpose: "", field: "", period: "", projectName: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pledgeChecked, setPledgeChecked] = useState(false);
  const [allPledge, setAllPledge] = useState(false);

  const set = (k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.affiliation.trim()) e.affiliation = "소속 기관을 입력해주세요.";
    if (!form.phone.trim()) e.phone = "연락처를 입력해주세요.";
    if (!form.purpose.trim()) e.purpose = "이용 목적을 입력해주세요.";
    if (!form.field) e.field = "활용 분야를 선택해주세요.";
    if (!form.period) e.period = "활용 기간을 선택해주세요.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!pledgeChecked) return;
    setSubmitting(true);
    setSubmitError(null);
    const supabase = createClient();
    const { error } = await supabase.from("applications").insert({
      user_id: userInfo.id,
      dataset_id: dataset.id,
      institution: form.affiliation,
      contact: form.phone,
      purpose: form.purpose,
      field: form.field,
      period: form.period,
      project_name: form.projectName || null,
      pledge_agreed: true,
    });
    if (error) {
      setSubmitError(error.code === "23505" ? "이미 신청한 데이터셋입니다." : "신청 중 오류가 발생했습니다.");
      setSubmitting(false);
      return;
    }
    onSuccess();
  };

  const inputCls = (err?: string) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400 ${err ? "border-red-300" : "border-neutral-200"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-auto">

        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-neutral-100">
          <div>
            <p className="text-xs text-brand-600 font-semibold mb-0.5">{dataset.category}</p>
            <h2 className="text-base font-bold text-neutral-900 leading-snug line-clamp-1">{dataset.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors flex-shrink-0 ml-3">
            <X size={18} />
          </button>
        </div>

        {/* 진행 단계 */}
        <div className="flex items-center gap-3 px-7 py-4">
          {[{ n: 1, label: "신청서 작성" }, { n: 2, label: "보안 서약" }].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= n ? "bg-brand-600 text-white" : "bg-neutral-200 text-neutral-400"}`}>
                  {step > n ? <CheckCircle size={12} /> : n}
                </div>
                <span className={`text-xs font-medium ${step >= n ? "text-brand-700" : "text-neutral-400"}`}>{label}</span>
              </div>
              {i < 1 && <div className={`flex-1 h-px ${step > 1 ? "bg-brand-300" : "bg-neutral-200"}`} />}
            </div>
          ))}
        </div>

        <div className="px-7 pb-7">

          {/* ── Step 1: 신청서 작성 ─────────────────────────────── */}
          {step === 1 && (
            <>
              {/* 계정 정보 자동 입력 */}
              <div className="bg-neutral-50 rounded-xl p-3.5 mb-4">
                <p className="text-xs font-semibold text-neutral-500 mb-2">계정 정보 (자동 입력)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-neutral-400 mb-0.5">이름</p>
                    <p className="text-sm font-medium text-neutral-700">{userInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 mb-0.5">이메일</p>
                    <p className="text-sm font-medium text-neutral-700 truncate">{userInfo.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">소속 기관 / 회사명 <span className="text-red-500">*</span></label>
                  <input type="text" value={form.affiliation} onChange={e => set("affiliation", e.target.value)}
                    placeholder="예: 한국과학기술원, 주식회사 ○○" className={inputCls(errors.affiliation)} />
                  {errors.affiliation && <p className="text-xs text-red-500 mt-1">{errors.affiliation}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">연락처 <span className="text-red-500">*</span></label>
                  <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                    placeholder="예: 010-1234-5678" className={inputCls(errors.phone)} />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">이용 목적 <span className="text-red-500">*</span></label>
                  <textarea value={form.purpose} onChange={e => set("purpose", e.target.value)}
                    placeholder="데이터를 어떤 목적으로 활용할 예정인지 설명해주세요." rows={3}
                    className={`${inputCls(errors.purpose)} resize-none`} />
                  {errors.purpose && <p className="text-xs text-red-500 mt-1">{errors.purpose}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">활용 분야 <span className="text-red-500">*</span></label>
                    <select value={form.field} onChange={e => set("field", e.target.value)} className={inputCls(errors.field)}>
                      <option value="">선택</option>
                      {FIELDS.map(f => <option key={f}>{f}</option>)}
                    </select>
                    {errors.field && <p className="text-xs text-red-500 mt-1">{errors.field}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">활용 기간 <span className="text-red-500">*</span></label>
                    <select value={form.period} onChange={e => set("period", e.target.value)} className={inputCls(errors.period)}>
                      <option value="">선택</option>
                      {PERIODS.map(p => <option key={p}>{p}</option>)}
                    </select>
                    {errors.period && <p className="text-xs text-red-500 mt-1">{errors.period}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">연구 / 프로젝트명 <span className="text-neutral-400 font-normal">(선택)</span></label>
                  <input type="text" value={form.projectName} onChange={e => set("projectName", e.target.value)}
                    placeholder="예: AI 기반 도시 인구 예측 모델 연구" className={inputCls()} />
                </div>
              </div>

              <button onClick={() => { if (validateStep1()) setStep(2); }}
                className="w-full mt-5 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95">
                다음 — 보안 서약 <ArrowRight size={15} />
              </button>
            </>
          )}

          {/* ── Step 2: 보안 서약 ──────────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-brand-600" />
                <h3 className="text-sm font-bold text-neutral-900">데이터 보안 서약</h3>
              </div>

              <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 mb-4">
                <label className="flex items-start gap-3 pb-3 mb-3 border-b border-neutral-200 cursor-pointer">
                  <input type="checkbox" checked={allPledge} onChange={e => { setAllPledge(e.target.checked); setPledgeChecked(e.target.checked); }}
                    className="mt-0.5 w-4 h-4 rounded accent-brand-600 cursor-pointer" />
                  <span className="text-sm font-bold text-neutral-900">아래 보안 서약 사항 전체에 동의합니다</span>
                </label>
                <div className="space-y-2.5">
                  {PLEDGE_ITEMS.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center ${allPledge ? "bg-brand-600 border-brand-600" : "border-neutral-300"}`}>
                        {allPledge && <CheckCircle size={9} className="text-white" />}
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2 mb-4">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">서약 위반 시 데이터 이용 권한이 즉시 취소되며 법적 책임을 질 수 있습니다.</p>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-sm text-red-600 mb-4">
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-3 rounded-xl transition-colors">
                  이전
                </button>
                <button onClick={handleSubmit} disabled={!pledgeChecked || submitting}
                  className={`flex-1 font-semibold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2
                    ${pledgeChecked && !submitting ? "bg-brand-600 hover:bg-brand-700 text-white" : "bg-neutral-200 text-neutral-400 cursor-not-allowed"}`}>
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? "처리 중..." : "신청 완료"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 신청 완료 모달 ────────────────────────────────────────────────
function SuccessModal({ datasetTitle, onClose }: { datasetTitle: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-brand-600" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900 mb-2">신청이 완료되었습니다</h2>
        <p className="text-sm font-medium text-brand-700 bg-brand-50 rounded-xl px-4 py-2 mb-4">{datasetTitle}</p>
        <p className="text-sm text-neutral-500 mb-6">보안 서약 및 신청서 제출이 확인되었습니다.<br />지금 바로 데이터를 다운로드하실 수 있습니다.</p>
        <div className="space-y-2">
          <button onClick={onClose}
            className="block w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95">
            데이터 다운로드 하러 가기
          </button>
          <Link href="/mypage"
            className="block w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-3 rounded-xl transition-colors">
            마이페이지에서 확인
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function DatasetDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ── 데이터셋 조회 + 신청 여부 + 유저 정보 ────────────────────
  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      supabase
        .from("datasets")
        .select("id, title, category, description, tags, year, downloads, file_path, file_size, created_at")
        .eq("id", id)
        .single(),
      supabase.auth.getUser(),
    ]).then(async ([{ data: ds }, { data: { user } }]) => {
      if (!ds) { router.replace("/datasets"); return; }
      setDataset(ds as Dataset);

      if (user) {
        // 프로필에서 이름 조회
        const { data: profile } = await supabase
          .from("profiles").select("name, email").eq("id", user.id).maybeSingle();
        setUserInfo({
          id: user.id,
          name: profile?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "",
          email: profile?.email ?? user.email ?? "",
        });

        // 신청 여부 확인
        const { data: app } = await supabase
          .from("applications").select("id").eq("user_id", user.id).eq("dataset_id", id).maybeSingle();
        setHasApplied(!!app);
      }
      setLoading(false);
    });
  }, [id, router]);

  // ── 다운로드 ──────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!dataset?.file_path || !userInfo) return;
    setDownloading(true);
    setDownloadError(null);
    const supabase = createClient();
    const { data: signedData, error } = await supabase.storage
      .from("datasets").createSignedUrl(dataset.file_path, 3600);
    if (error || !signedData?.signedUrl) {
      setDownloadError("다운로드 URL 생성에 실패했습니다.");
      setDownloading(false);
      return;
    }
    await supabase.from("download_logs").insert({ user_id: userInfo.id, dataset_id: dataset.id });
    window.open(signedData.signedUrl, "_blank");
    setDownloading(false);
  };

  const isNew = dataset
    ? Date.now() - new Date(dataset.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
    : false;

  const registeredYM = dataset
    ? new Date(dataset.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit" }).replace(". ", "-").replace(".", "")
    : "-";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  if (!dataset) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10">

        <Link href="/datasets" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-6">
          <ArrowLeft size={14} /> 데이터 목록으로
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── 메인 정보 ──────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-neutral-100 p-7">

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs text-brand-600 font-semibold bg-brand-50 px-2.5 py-1 rounded-full">
                  #{dataset.category}
                </span>
              </div>

              <div className="flex items-start gap-3 mb-4">
                {isNew && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-red-500 text-white flex-shrink-0 mt-0.5">NEW</span>
                )}
                <h1 className="text-2xl font-bold text-neutral-900 leading-tight">{dataset.title}</h1>
              </div>

              {dataset.tags?.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-5">
                  <span className="text-xs text-neutral-500 font-semibold">형식</span>
                  {dataset.tags.map((t) => (
                    <span key={t} className="text-xs px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded-md font-mono font-medium">{t}</span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500 border-t border-b border-neutral-100 py-4 mb-5">
                <span>구축년도 <strong className="text-neutral-800 ml-1">{dataset.year}</strong></span>
                <span>등록일 <strong className="text-neutral-800 ml-1">{registeredYM}</strong></span>
                <span className="flex items-center gap-1">
                  <Eye size={14} />
                  다운로드 <strong className="text-neutral-800 ml-1">{dataset.downloads.toLocaleString()}</strong>
                </span>
                {dataset.file_size && (
                  <span>용량 <strong className="text-neutral-800 ml-1">{fmtBytes(dataset.file_size)}</strong></span>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-neutral-900 text-sm mb-2">데이터 설명</h3>
                <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line bg-neutral-50 rounded-xl p-4">
                  {dataset.description}
                </p>
              </div>
            </div>
          </div>

          {/* ── 사이드바 ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-neutral-100 p-5 sticky top-24">
              {hasApplied ? (
                <>
                  <div className="flex items-center gap-2 text-brand-600 mb-4">
                    <CheckCircle size={18} />
                    <span className="text-sm font-semibold">신청 완료 — 다운로드 가능</span>
                  </div>
                  {downloadError && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600 mb-3">{downloadError}</div>
                  )}
                  <button onClick={handleDownload} disabled={downloading || !dataset.file_path}
                    className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-colors active:scale-95 disabled:opacity-60">
                    {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {downloading ? "다운로드 중..." : dataset.file_path ? "데이터 다운로드" : "파일 준비 중"}
                  </button>
                  {!dataset.file_path && (
                    <p className="text-xs text-neutral-400 text-center mt-2">파일이 아직 업로드되지 않았습니다.</p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-neutral-500 mb-4">
                    <Lock size={16} />
                    <span className="text-sm font-medium">신청서 제출 후 다운로드 가능</span>
                  </div>
                  {userInfo ? (
                    <button onClick={() => setShowApply(true)}
                      className="block w-full text-center bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-colors active:scale-95">
                      신청하기
                    </button>
                  ) : (
                    <Link href={`/login?next=/datasets/${dataset.id}`}
                      className="block w-full text-center bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-colors active:scale-95">
                      로그인 후 신청하기
                    </Link>
                  )}
                  <div className="mt-4 bg-neutral-50 rounded-xl p-3 text-xs text-neutral-500 space-y-1.5">
                    <p className="font-semibold text-neutral-700">신청 절차</p>
                    <p>① 신청서 작성 (소속, 목적 등)</p>
                    <p>② 보안 서약 동의</p>
                    <p>③ 제출 즉시 다운로드 가능</p>
                  </div>
                </>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-700 space-y-1.5">
              <p className="font-semibold">데이터 이용 유의사항</p>
              <p>• 신청 목적 외 사용 금지</p>
              <p>• 제3자 무단 제공·공유 금지</p>
              <p>• 활용 후 결과물 제출 권장</p>
            </div>
          </div>
        </div>
      </div>

      {/* 신청 모달 */}
      {showApply && userInfo && (
        <ApplyModal
          dataset={dataset}
          userInfo={userInfo}
          onClose={() => setShowApply(false)}
          onSuccess={() => { setShowApply(false); setShowSuccess(true); setHasApplied(true); }}
        />
      )}

      {/* 완료 모달 */}
      {showSuccess && (
        <SuccessModal
          datasetTitle={dataset.title}
          onClose={() => setShowSuccess(false)}
        />
      )}
    </div>
  );
}
