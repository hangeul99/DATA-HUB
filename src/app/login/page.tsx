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

  // êµ¬ê? OAuth ë¡œê·¸??  const loginWithGoogle = async () => {
    setLoadingGoogle(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError("êµ¬ê? ë¡œê·¸??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
      setLoadingGoogle(false);
    }
  };

  // ?´ë©”??ë¹„ë?ë²ˆí˜¸ ë¡œê·¸??  const loginWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("?´ë©”?¼ê³¼ ë¹„ë?ë²ˆí˜¸ë¥??…ë ¥?˜ì„¸??"); return; }
    setLoadingEmail(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Supabase ?ëŸ¬ ë©”ì‹œì§€ë¥??œêµ­?´ë¡œ ë³€??      if (error.message.includes("Invalid login")) setError("?´ë©”???ëŠ” ë¹„ë?ë²ˆí˜¸ê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.");
      else if (error.message.includes("Email not confirmed")) setError("?´ë©”???¸ì¦???„ë£Œ?´ì£¼?¸ìš”. ë°›ì? ?¸ì??¨ì„ ?•ì¸?˜ì„¸??");
      else setError("ë¡œê·¸??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
      setLoadingEmail(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-brand-50/30 flex flex-col items-center justify-center px-4 py-12">

      {/* ?ˆìœ¼ë¡?*/}
      <Link href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
        <ArrowLeft size={14} /> ?ˆìœ¼ë¡?      </Link>

      <div className="w-full max-w-md">

        {/* ë¡œê³  + ?œëª© */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative w-12 h-12 bg-white rounded-xl border border-neutral-100 p-1 shadow-sm flex-shrink-0">
              <Image src="/logo.png" alt="?¸ì œ?€?™êµ ë¡œê³ " fill sizes="48px"
                style={{ objectFit: "contain" }} priority draggable={false} />
            </div>
            <div className="text-left leading-tight">
              <p className="text-xs text-neutral-400">?¸ì œ?€?™êµ</p>
              <p className="font-bold text-base text-neutral-900">?°ì´?°ê±°ë²„ë„Œ?¤ì„¼??/p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">ë¡œê·¸??/h1>
          <p className="text-sm text-neutral-500 mt-1">ê³„ì •??ë¡œê·¸?¸í•˜?¸ìš”</p>
        </div>

        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8 space-y-4">

          {/* ?ëŸ¬ ë©”ì‹œì§€ */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* êµ¬ê? ë¡œê·¸??*/}
          <button onClick={loginWithGoogle} disabled={loadingGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold py-3.5 rounded-2xl border border-neutral-200 transition-colors active:scale-95 shadow-sm disabled:opacity-60">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7 13 19.5C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.2l-6.3-5.3C29.6 35.4 27 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.7 5.2C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.3 5.3C37 36.9 44 31 44 24c0-1.3-.1-2.7-.4-3.9z"/>
            </svg>
            {loadingGoogle ? "ë¡œê·¸??ì¤?.." : "Googleë¡?ê³„ì†?˜ê¸°"}
          </button>

          {/* êµ¬ë¶„??*/}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-neutral-100" />
            <span className="text-xs text-neutral-400">?ëŠ” ?´ë©”?¼ë¡œ ë¡œê·¸??/span>
            <div className="flex-1 h-px bg-neutral-100" />
          </div>

          {/* ?´ë©”??ë¹„ë?ë²ˆí˜¸ ??*/}
          <form onSubmit={loginWithEmail} className="space-y-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="?´ë©”??ì£¼ì†Œ" required
              className="w-full px-4 py-3.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400" />

            {/* ë¹„ë?ë²ˆí˜¸ + ë³´ê¸° ? ê? */}
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ë¹„ë?ë²ˆí˜¸" required
                className="w-full px-4 py-3.5 pr-11 rounded-xl border border-neutral-200 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" disabled={loadingEmail}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-colors active:scale-95 disabled:opacity-60">
              {loadingEmail ? "ë¡œê·¸??ì¤?.." : "ë¡œê·¸??}
            </button>
          </form>

          {/* ?Œì›ê°€??ë§í¬ */}
          <p className="text-center text-sm text-neutral-400">
            ê³„ì •???†ìœ¼? ê???{" "}
            <Link href="/signup" className="text-brand-600 font-semibold hover:underline">
              ?Œì›ê°€??            </Link>
          </p>
        </div>

        {/* ë³´ì•ˆ ë°°ì? */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5"><Lock size={12} /> ?”í˜¸??ë³´ì•ˆ ?°ê²°</div>
          <div className="flex items-center gap-1.5"><Shield size={12} /> ê°œì¸?•ë³´ ë³´í˜¸</div>
        </div>
      </div>
    </div>
  );
}
