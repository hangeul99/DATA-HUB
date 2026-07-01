"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock, Shield, AlertCircle, Eye, EyeOff, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Turnstile from "@/components/Turnstile";

export default function SignupPage() {
  const [name, setName]                     = useState("");
  const [organization, setOrganization]     = useState("");
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword]     = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [done, setDone]                     = useState(false);
  const [agreePrivacy, setAgreePrivacy]     = useState(false);
  const [agreeTerms, setAgreeTerms]         = useState(false);
  const [agreeAge, setAgreeAge]             = useState(false);
  const [emailStatus, setEmailStatus]       = useState<"idle" | "checking" | "available" | "taken">("idle");
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 캡차 토큰 (봇 차단) — 통과 시 발급, 가입 요청에 실어 보냄
  const [captchaToken, setCaptchaToken]     = useState<string | null>(null);
  const [captchaKey, setCaptchaKey]         = useState(0);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailStatus("idle");
    if (emailTimer.current) clearTimeout(emailTimer.current);
    if (!val || !val.includes("@")) return;
    setEmailStatus("checking");
    emailTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: val }),
        });
        const json = await res.json();
        setEmailStatus(json.available ? "available" : "taken");
      } catch {
        setEmailStatus("idle");
      }
    }, 600);
  };

  // 비밀번호 유효성 검사
  const passwordValid = password.length >= 8;
  const passwordMatch = password === passwordConfirm && passwordConfirm !== "";

  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreePrivacy) { setError("개인정보처리방침에 동의해주세요."); return; }
    if (!agreeTerms)   { setError("이용약관에 동의해주세요."); return; }
    if (!agreeAge)     { setError("만 14세 이상인 경우에만 가입하실 수 있습니다."); return; }
    if (!name.trim()) { setError("이름을 입력하세요."); return; }
    if (!organization.trim()) { setError("소속기관을 입력하세요."); return; }
    if (!passwordValid) { setError("비밀번호는 8자 이상이어야 합니다."); return; }
    if (!passwordMatch) { setError("비밀번호가 일치하지 않습니다."); return; }
    // 캡차 사용 중인데 아직 통과 전이면 잠시 대기 요청
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
      setError("보안 확인이 진행 중입니다. 잠시 후 다시 시도해주세요."); return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, organization: organization.trim(), consented_at: new Date().toISOString() },
        // 이메일 인증 후 돌아올 주소
        emailRedirectTo: `${location.origin}/auth/callback`,
        captchaToken: captchaToken ?? undefined,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) setError("이미 가입된 이메일입니다. 로그인해주세요.");
      else if (error.message.toLowerCase().includes("captcha")) setError("보안 확인에 실패했습니다. 다시 시도해주세요.");
      else setError("회원가입 중 오류가 발생했습니다.");
      // 캡차 토큰은 1회용이므로 실패 시 위젯 리셋
      setCaptchaToken(null);
      setCaptchaKey((k) => k + 1);
      setLoading(false);
    } else {
      // 성공 → 이메일 인증 안내 화면으로 전환
      setDone(true);
    }
  };

  // ── 이메일 인증 안내 화면 ─────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-brand-50/30 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-100 shadow-sm p-6 sm:p-10 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-brand-600" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">이메일을 확인해주세요</h2>
          <p className="text-sm text-neutral-500 leading-relaxed mb-6">
            <span className="font-semibold text-neutral-700">{email}</span>로<br />
            인증 메일을 발송했습니다.<br />
            받은 편지함의 링크를 클릭하면 로그인됩니다.
          </p>
          <Link href="/login"
            className="block w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors">
            로그인 페이지로
          </Link>
          <p className="text-xs text-neutral-400 mt-4">
            메일이 안 왔다면 스팸 편지함을 확인하세요.
          </p>
        </div>
      </div>
    );
  }

  // ── 회원가입 폼 ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-brand-50/30 flex flex-col items-center justify-center px-4 py-12">

      {/* 뒤로가기 */}
      <Link href="/login"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
        <ArrowLeft size={14} /> 로그인으로
      </Link>

      <div className="w-full max-w-md">

        {/* 로고 + 제목 */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative w-12 h-12 bg-white rounded-xl border border-neutral-100 p-1 shadow-sm flex-shrink-0">
              <Image src="/logo.png" alt="인제대학교 로고" fill sizes="48px"
                style={{ objectFit: "contain" }} priority draggable={false} />
            </div>
            <div className="text-left leading-tight">
              <p className="text-xs text-neutral-400">인제대학교</p>
              <p className="font-bold text-base text-neutral-900">데이터거버넌스센터</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">회원가입</h1>
          <p className="text-sm text-neutral-500 mt-1">데이터 이용 신청을 위한 계정을 만드세요</p>
        </div>

        {/* 모바일에서 카드 여백 축소 */}
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6 sm:p-8">

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={signup} className="space-y-3">

            {/* 이름 */}
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="이름" required
              className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400" />

            {/* 소속기관 */}
            <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)}
              placeholder="소속기관 (예: 인제대학교, 김해시청)" required
              className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400" />

            {/* 이메일 */}
            <div className="space-y-1">
              <input type="email" value={email} onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="이메일 주소" required
                className={`w-full px-4 py-3.5 rounded-xl border text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400
                  ${emailStatus === "taken" ? "border-red-300" : emailStatus === "available" ? "border-brand-300" : "border-neutral-200"}`} />
              {emailStatus === "checking" && (
                <p className="text-xs text-neutral-400 pl-1">확인 중...</p>
              )}
              {emailStatus === "available" && (
                <p className="text-xs text-brand-600 pl-1">사용 가능한 이메일입니다.</p>
              )}
              {emailStatus === "taken" && (
                <p className="text-xs text-red-500 pl-1">이미 가입된 이메일입니다. 로그인해주세요.</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 (8자 이상)" required
                className={`w-full px-4 py-3.5 pr-11 rounded-xl border text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400
                  ${password && !passwordValid ? "border-red-300" : "border-neutral-200"}`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* 비밀번호 확인 */}
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호 확인" required
                className={`w-full px-4 py-3.5 rounded-xl border text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400
                  ${passwordConfirm && !passwordMatch ? "border-red-300" : passwordMatch ? "border-brand-300" : "border-neutral-200"}`} />
              {/* 비밀번호 일치 여부 아이콘 */}
              {passwordConfirm && (
                <div className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium ${passwordMatch ? "text-brand-600" : "text-red-400"}`}>
                  {passwordMatch ? "일치" : "불일치"}
                </div>
              )}
            </div>

            {/* 동의 체크박스 3개 (개인정보보호법 제22조 제2항: 항목별 개별 동의) */}
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-neutral-300 accent-brand-600 cursor-pointer flex-shrink-0" />
                <span className="text-xs text-neutral-500 group-hover:text-neutral-700 transition-colors">
                  <Link href="/privacy" target="_blank" className="text-brand-600 hover:underline font-semibold">개인정보처리방침</Link>
                  {" "}에 동의합니다 <span className="text-red-400">(필수)</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-neutral-300 accent-brand-600 cursor-pointer flex-shrink-0" />
                <span className="text-xs text-neutral-500 group-hover:text-neutral-700 transition-colors">
                  <Link href="/terms" target="_blank" className="text-brand-600 hover:underline font-semibold">이용약관</Link>
                  {" "}에 동의합니다 <span className="text-red-400">(필수)</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input type="checkbox" checked={agreeAge} onChange={(e) => setAgreeAge(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-neutral-300 accent-brand-600 cursor-pointer flex-shrink-0" />
                <span className="text-xs text-neutral-500 group-hover:text-neutral-700 transition-colors">
                  만 14세 이상임을 확인합니다 <span className="text-red-400">(필수)</span>
                </span>
              </label>
            </div>

            {/* 캡차 (봇 차단) — 대부분 자동 통과 */}
            <Turnstile
              key={captchaKey}
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
            />

            {/* 가입 버튼 */}
            <button type="submit" disabled={loading || !agreePrivacy || !agreeTerms || !agreeAge || emailStatus === "taken"}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-colors active:scale-95 disabled:opacity-60 mt-2">
              {loading ? "처리 중..." : "회원가입"}
            </button>
          </form>

          {/* 로그인 링크 */}
          <p className="text-center text-sm text-neutral-400 mt-4">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-brand-600 font-semibold hover:underline">
              로그인
            </Link>
          </p>
        </div>

        {/* 보안 배지 */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5"><Lock size={12} /> 암호화 보안 연결</div>
          <div className="flex items-center gap-1.5"><Shield size={12} /> 개인정보 보호</div>
        </div>
      </div>
    </div>
  );
}
