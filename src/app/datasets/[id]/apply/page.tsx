"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle, Shield, FileText, AlertTriangle, Loader2 } from "lucide-react";
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
interface UserInfo {
  id: string;
  name: string;
  email: string;
}

interface DatasetInfo {
  id: string;
  title: string;
  category: string;
}

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params.id as string;

  // ── 초기 로딩 상태 ─────────────────────────────────────────────
  const [initialLoading, setInitialLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);

  // ── 폼 상태 ────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    affiliation: "",
    phone: "",
    purpose: "",
    field: "",
    period: "",
    projectName: "",
  });
  const [pledgeChecked, setPledgeChecked] = useState(false);
  const [allPledge, setAllPledge] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── 마운트 시: 유저 및 데이터셋 정보 조회 ────────────────────
  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      // 현재 로그인 유저 조회
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return null;
        // profiles 테이블에서 이름 조회
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("id", user.id)
          .single();
        return {
          id: user.id,
          name: profile?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "",
          email: profile?.email ?? user.email ?? "",
        } as UserInfo;
      }),
      // 데이터셋 제목 조회
      supabase
        .from("datasets")
        .select("id, title, category")
        .eq("id", datasetId)
        .single()
        .then(({ data }) => data as DatasetInfo | null),
    ]).then(([user, dataset]) => {
      if (!user) {
        // 미로그인 → 로그인 페이지로 리디렉션
        router.replace(`/login?next=/datasets/${datasetId}/apply`);
        return;
      }
      setUserInfo(user);
      setDatasetInfo(dataset);
      setInitialLoading(false);
    });
  }, [datasetId, router]);

  // ── 필드 변경 헬퍼 ────────────────────────────────────────────
  const set = (k: string, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  // ── Step 1 유효성 검사 ────────────────────────────────────────
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

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  // ── 최종 제출 → Supabase applications INSERT ─────────────────
  const handleSubmit = async () => {
    if (!pledgeChecked || !userInfo) return;
    setSubmitting(true);
    setSubmitError(null);

    const supabase = createClient();
    const { error } = await supabase.from("applications").insert({
      user_id: userInfo.id,
      dataset_id: datasetId,
      institution: form.affiliation,
      contact: form.phone,
      purpose: form.purpose,
      field: form.field,
      period: form.period,
      project_name: form.projectName || null,
      pledge_agreed: true,
    });

    if (error) {
      // 중복 신청(UNIQUE 제약) 처리
      if (error.code === "23505") {
        setSubmitError("이미 신청한 데이터셋입니다. 마이페이지에서 확인해주세요.");
      } else {
        setSubmitError("신청 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
  };

  const toggleAllPledge = (checked: boolean) => {
    setAllPledge(checked);
    setPledgeChecked(checked);
  };

  // ── 초기 로딩 화면 ────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  // ── 신청 완료 화면 ────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-neutral-100 p-6 sm:p-10 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-brand-600" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">신청이 완료되었습니다</h2>
          {/* 신청한 데이터셋 이름 표시 */}
          {datasetInfo && (
            <p className="text-sm font-medium text-brand-700 bg-brand-50 rounded-xl px-4 py-2 mb-4">
              {datasetInfo.title}
            </p>
          )}
          <p className="text-sm text-neutral-500 mb-6">
            보안 서약 및 신청서 제출이 확인되었습니다.<br />
            지금 바로 데이터를 다운로드하실 수 있습니다.
          </p>
          <div className="space-y-3">
            <Link
              href={`/datasets/${datasetId}`}
              className="block w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-colors active:scale-95"
            >
              데이터 다운로드 하러 가기
            </Link>
            <Link
              href="/mypage"
              className="block w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-3.5 rounded-xl transition-colors"
            >
              마이페이지에서 확인
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 신청서 폼 ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-50 py-6 sm:py-10 px-4">
      <div className="max-w-xl mx-auto">

        {/* 뒤로 가기 */}
        <Link href={`/datasets/${datasetId}`} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors mb-6">
          <ArrowLeft size={14} /> 데이터 상세로
        </Link>

        {/* 데이터셋 이름 뱃지 */}
        {datasetInfo && (
          <div className="text-xs font-medium text-brand-700 bg-brand-50 rounded-lg px-3 py-1.5 inline-block mb-4">
            {datasetInfo.category} · {datasetInfo.title}
          </div>
        )}

        {/* 진행 단계 표시 — 모바일에서 원/라벨 축소 */}
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          {[
            { n: 1, label: "신청서 작성" },
            { n: 2, label: "보안 서약" },
          ].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-2 sm:gap-3 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= n ? "bg-brand-600 text-white" : "bg-neutral-200 text-neutral-400"}`}>
                  {step > n ? <CheckCircle size={14} /> : n}
                </div>
                <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${step >= n ? "text-brand-700" : "text-neutral-400"}`}>{label}</span>
              </div>
              {i < 1 && <div className={`flex-1 h-px ${step > 1 ? "bg-brand-300" : "bg-neutral-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 p-5 sm:p-7 shadow-sm">

          {/* ── Step 1: 신청서 작성 ─────────────────────────────── */}
          {step === 1 && (
            <>
              <div className="flex items-center gap-2 mb-6">
                <FileText size={18} className="text-brand-600" />
                <h2 className="text-lg font-bold text-neutral-900">신청서 작성</h2>
              </div>

              {/* 로그인 정보 자동 입력 */}
              <div className="bg-neutral-50 rounded-xl p-4 mb-6">
                <p className="text-xs font-semibold text-neutral-500 mb-2">계정 정보 (자동 입력)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-neutral-400 mb-0.5">이름</p>
                    <p className="text-sm font-medium text-neutral-700">{userInfo?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 mb-0.5">이메일</p>
                    <p className="text-sm font-medium text-neutral-700">{userInfo?.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* 소속 기관 */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    소속 기관 / 회사명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.affiliation}
                    onChange={(e) => set("affiliation", e.target.value)}
                    placeholder="예: 한국과학기술원, 주식회사 ○○"
                    className={`w-full px-4 py-3 rounded-xl border text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400 ${errors.affiliation ? "border-red-300" : "border-neutral-200"}`}
                  />
                  {errors.affiliation && <p className="text-xs text-red-500 mt-1">{errors.affiliation}</p>}
                </div>

                {/* 연락처 */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    연락처 (전화번호) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="예: 010-1234-5678"
                    className={`w-full px-4 py-3 rounded-xl border text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400 ${errors.phone ? "border-red-300" : "border-neutral-200"}`}
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>

                {/* 이용 목적 */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    이용 목적 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.purpose}
                    onChange={(e) => set("purpose", e.target.value)}
                    placeholder="데이터를 어떤 목적으로 활용할 예정인지 간략히 설명해주세요."
                    rows={3}
                    className={`w-full px-4 py-3 rounded-xl border text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400 resize-none ${errors.purpose ? "border-red-300" : "border-neutral-200"}`}
                  />
                  {errors.purpose && <p className="text-xs text-red-500 mt-1">{errors.purpose}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 활용 분야 */}
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                      활용 분야 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.field}
                      onChange={(e) => set("field", e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 ${errors.field ? "border-red-300" : "border-neutral-200"}`}
                    >
                      <option value="">선택</option>
                      {FIELDS.map((f) => <option key={f}>{f}</option>)}
                    </select>
                    {errors.field && <p className="text-xs text-red-500 mt-1">{errors.field}</p>}
                  </div>
                  {/* 활용 기간 */}
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                      예상 활용 기간 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.period}
                      onChange={(e) => set("period", e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 ${errors.period ? "border-red-300" : "border-neutral-200"}`}
                    >
                      <option value="">선택</option>
                      {PERIODS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                    {errors.period && <p className="text-xs text-red-500 mt-1">{errors.period}</p>}
                  </div>
                </div>

                {/* 프로젝트명 (선택) */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    연구 / 프로젝트명 <span className="text-neutral-400 font-normal">(선택)</span>
                  </label>
                  <input
                    type="text"
                    value={form.projectName}
                    onChange={(e) => set("projectName", e.target.value)}
                    placeholder="예: AI 기반 도시 인구 예측 모델 연구"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400"
                  />
                </div>
              </div>

              <button
                onClick={handleNext}
                className="w-full mt-6 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-colors active:scale-95"
              >
                다음 단계 — 보안 서약
                <ArrowRight size={16} />
              </button>
            </>
          )}

          {/* ── Step 2: 보안 서약 ──────────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={18} className="text-brand-600" />
                <h2 className="text-lg font-bold text-neutral-900">데이터 보안 서약</h2>
              </div>
              <p className="text-sm text-neutral-500 mb-6">
                데이터를 안전하게 활용하기 위해 아래 보안 서약에 동의해주세요.
              </p>

              <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-5 mb-5">
                {/* 전체 동의 */}
                <label className="flex items-start gap-3 pb-4 mb-4 border-b border-neutral-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allPledge}
                    onChange={(e) => toggleAllPledge(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-brand-600 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-neutral-900">아래 보안 서약 사항 전체에 동의합니다</span>
                </label>

                {/* 개별 항목 */}
                <div className="space-y-3">
                  {PLEDGE_ITEMS.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center ${allPledge ? "bg-brand-600 border-brand-600" : "border-neutral-300"}`}>
                        {allPledge && <CheckCircle size={10} className="text-white" />}
                      </div>
                      <p className="text-sm text-neutral-600 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 mb-5">
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  서약 위반 시 데이터 이용 권한이 즉시 취소되며, 관련 법령에 따라 법적 책임을 질 수 있습니다.
                </p>
              </div>

              {/* 제출 오류 메시지 */}
              {submitError && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-3.5 rounded-xl transition-colors"
                >
                  이전
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!pledgeChecked || submitting}
                  className={`flex-1 font-semibold py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${pledgeChecked && !submitting ? "bg-brand-600 hover:bg-brand-700 text-white" : "bg-neutral-200 text-neutral-400 cursor-not-allowed"}`}
                >
                  {submitting && <Loader2 size={15} className="animate-spin" />}
                  {submitting ? "처리 중..." : "신청 완료 및 서약 동의"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
