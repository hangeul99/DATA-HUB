"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Database } from "lucide-react";

/**
 * ?¨ë³´???˜ì´ì§€
 * - ?Œì…œ ë¡œê·¸??ì§í›„ organization ë¯¸ì…???¬ìš©?ì—ê²??œì‹œ
 * - proxy.ts?ì„œ ?redirect= ?Œë¼ë¯¸í„°ë¡??ë˜ ëª©ì ì§€ë¥??„ë‹¬
 * - ?Œì†ê¸°ê? ?…ë ¥ ??profiles ?Œì´ë¸??…ë°?´íŠ¸ ??redirect ê²½ë¡œë¡??´ë™
 */
function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [organization, setOrganization] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ?´ë? ?¨ë³´???„ë£Œ???¬ìš©?ëŠ” ëª©ì ì§€(?ëŠ” ??ë¡??´ë™
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization")
        .eq("id", user.id)
        .single();
      if (profile?.organization) router.replace(redirectTo);
    });
  }, [router, redirectTo]);

  // ?Œì†ê¸°ê???profiles ?Œì´ë¸”ì— ?€????ëª©ì ì§€ë¡??´ë™
  const handleSubmit = async () => {
    if (!organization.trim()) { setError("?Œì†ê¸°ê????…ë ¥?´ì£¼?¸ìš”."); return; }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ organization: organization.trim() })
      .eq("id", user.id);

    if (updateErr) {
      setError("?€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„?´ì£¼?¸ìš”.");
      setSubmitting(false);
      return;
    }

    router.replace(redirectTo);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-8 w-full max-w-md">

        {/* ë¡œê³  */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
            <Database size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 leading-none mb-0.5">?¸ì œ?€?™êµ</p>
            <p className="text-sm font-bold text-neutral-900 leading-none">?°ì´?°ê±°ë²„ë„Œ?¤ì„¼??/p>
          </div>
        </div>

        <h1 className="text-xl font-bold text-neutral-900 mb-1">?Œì†ê¸°ê? ?…ë ¥</h1>
        <p className="text-sm text-neutral-500 mb-7">?œë¹„???´ìš©???„í•´ ?Œì†ê¸°ê????…ë ¥?´ì£¼?¸ìš”.</p>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            ?Œì†ê¸°ê? <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={organization}
            onChange={(e) => { setOrganization(e.target.value); setError(null); }}
            placeholder="?? ?¸ì œ?€?™êµ, ê¹€?´ì‹œì²? (ì£??¸ì œ?Œí”„??
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
            submitting
              ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              : "bg-brand-600 hover:bg-brand-700 text-white"
          }`}
        >
          {submitting ? "?€??ì¤?.." : "?œì‘?˜ê¸°"}
        </button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}
