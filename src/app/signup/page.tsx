"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock, Shield, AlertCircle, Eye, EyeOff, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  const [agreed, setAgreed]                 = useState(false);

  // 비밀번호 유효성 검사
  const passwordValid = password.length >= 8;
  const passwordMatch = password === passwordConfirm && passwordConfirm !== "";

  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreed) { setError("개인정보처리방침에 동의해주세요."); return; }
    if (!name.trim()) { setError("이름을 입력하세요."); return; }
    if (!organization.trim()) { setError("소속기관을 입력하세요."); return; }
    if (!passwordValid) { setError("비밀번호는 8자 이상이어야 합니다."); return; }
    if (!passwordMatch) { setError("비밀번호가 일치하지 않습니다."); return; }

    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, organization: organization.trim() },
        // 이메일 인증 후 돌아올 주소
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) setError("이미 가입된 이메일입니다. 로그인해주세요.");
      else setError("회원가입 중 오류가 발생했습니다.");
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
        <div className="w-full max-w-md bg-white rounded-3xl border border-neutral-100 shadow-sm p-10 text-center">
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
        <div className="text-center mb-8">
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

        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8">

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
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소" required
              className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400" />

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

            {/* 개인정보처리방침 동의 체크박스 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-400 cursor-pointer flex-shrink-0"
              />
              <span className="text-xs text-neutral-500 group-hover:text-neutral-700 transition-colors">
                <Link href="/privacy" target="_blank" className="text-brand-600 hover:underline font-semibold">개인정보처리방침</Link>
                {" "}및{" "}
                <Link href="/terms" target="_blank" className="text-brand-600 hover:underline font-semibold">이용약관</Link>
                {" "}동의 · 만 14세 이상 확인 <span className="text-red-400">(필수)</span>
              </span>
            </label>

            {/* 가입 버튼 */}
            <button type="submit" disabled={loading || !agreed}
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
