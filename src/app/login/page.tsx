"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Shield, AlertCircle, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 구글 OAuth 로그인
  const loginWithGoogle = async () => {
    setLoadingGoogle(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError("구글 로그인 중 오류가 발생했습니다.");
      setLoadingGoogle(false);
    }
  };

  // 이메일/비밀번호 로그인
  const loginWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("이메일과 비밀번호를 입력하세요."); return; }
    setLoadingEmail(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Supabase 에러 메시지를 한국어로 변환
      if (error.message.includes("Invalid login")) setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      else if (error.message.includes("Email not confirmed")) setError("이메일 인증을 완료해주세요. 받은 편지함을 확인하세요.");
      else setError("로그인 중 오류가 발생했습니다.");
      setLoadingEmail(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-brand-50/30 flex flex-col items-center justify-center px-4 py-12">

      {/* 홈으로 */}
      <Link href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
        <ArrowLeft size={14} /> 홈으로
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
          <h1 className="text-2xl font-bold text-neutral-900">로그인</h1>
          <p className="text-sm text-neutral-500 mt-1">계정에 로그인하세요</p>
        </div>

        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8 space-y-4">

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* 구글 로그인 */}
          <button onClick={loginWithGoogle} disabled={loadingGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold py-3.5 rounded-2xl border border-neutral-200 transition-colors active:scale-95 shadow-sm disabled:opacity-60">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7 13 19.5C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.2l-6.3-5.3C29.6 35.4 27 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.7 5.2C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.3C37 36.9 44 31 44 24c0-1.3-.1-2.7-.4-3.9z"/>
            </svg>
            {loadingGoogle ? "로그인 중..." : "Google로 계속하기"}
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-neutral-100" />
            <span className="text-xs text-neutral-400">또는 이메일로 로그인</span>
            <div className="flex-1 h-px bg-neutral-100" />
          </div>

          {/* 이메일/비밀번호 폼 */}
          <form onSubmit={loginWithEmail} className="space-y-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소" required
              className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400" />

            {/* 비밀번호 + 보기 토글 */}
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호" required
                className="w-full px-4 py-3.5 pr-11 rounded-xl border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" disabled={loadingEmail}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-colors active:scale-95 disabled:opacity-60">
              {loadingEmail ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* 회원가입 링크 */}
          <p className="text-center text-sm text-neutral-400">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-brand-600 font-semibold hover:underline">
              회원가입
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
