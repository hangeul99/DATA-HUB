"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, CheckCircle, Database } from "lucide-react";

const CONSENT_ITEMS = [
  { id: "privacy", required: true, title: "[?„ìˆ˜] ê°œì¸?•ë³´ ?˜ì§‘ ë°??´ìš© ?™ì˜", content: "?±ëª…, ?´ë©”?? ?Œì†ê¸°ê?, ?°ë½ì²˜ë? ?˜ì§‘?˜ë©°, ?°ì´???´ìš© ? ì²­ ë°??œë¹„???´ì˜ ëª©ì ?¼ë¡œ ?¬ìš©?©ë‹ˆ?? ë³´ìœ ê¸°ê°„?€ ?Œì› ?ˆí‡´ ?œê¹Œì§€?…ë‹ˆ??" },
  { id: "terms", required: true, title: "[?„ìˆ˜] ?œë¹„???´ìš©?½ê? ?™ì˜", content: "?¸ì œ?€?™êµ ?°ì´?°ê±°ë²„ë„Œ?¤ì„¼???œë¹„?¤ë? ?´ìš©?˜ëŠ” ì¡°ê±´ ë°?ê·œì •???™ì˜?©ë‹ˆ?? ?°ì´??ë¬´ë‹¨ ?¬ë°°?? ?ì—…???¬íŒë§???ê¸ˆì? ?‰ìœ„ë¥??„ë°˜?????´ìš©???œí•œ?©ë‹ˆ??" },
  { id: "thirdparty", required: false, title: "[? íƒ] ë§ˆì????•ë³´ ?˜ì‹  ?™ì˜", content: "? ê·œ ?°ì´?°ì…‹ ?…ë°?´íŠ¸, ê³µì??¬í•­ ?±ì˜ ?•ë³´ë¥??´ë©”?¼ë¡œ ?˜ì‹ ?©ë‹ˆ?? ë¯¸ë™???œì—???œë¹„???´ìš©??ê°€?¥í•©?ˆë‹¤." },
];

export default function ConsentPage() {
  const router = useRouter();
  const [checks, setChecks] = useState<Record<string, boolean>>({ privacy: false, terms: false, thirdparty: false });
  const [allChecked, setAllChecked] = useState(false);

  const toggle = (id: string) => {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    setAllChecked(Object.values(next).every(Boolean));
  };

  const toggleAll = (v: boolean) => {
    const next = Object.fromEntries(CONSENT_ITEMS.map(i => [i.id, v]));
    setChecks(next);
    setAllChecked(v);
  };

  const canProceed = checks.privacy && checks.terms;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <Database size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl text-neutral-900">?¸ì œ?€?™êµ ?°ì´?°ê±°ë²„ë„Œ?¤ì„¼??/span>
          </div>
          <h1 className="text-xl font-bold text-neutral-900">?œë¹„???´ìš© ?™ì˜</h1>
          <p className="text-sm text-neutral-500 mt-1">?¸ì œ?€?™êµ ?°ì´?°ê±°ë²„ë„Œ?¤ì„¼???´ìš©???„í•´ ?„ë˜ ??ª©???™ì˜?´ì£¼?¸ìš”.</p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 space-y-4">
          {/* ?„ì²´ ?™ì˜ */}
          <label className="flex items-center gap-3 p-4 bg-brand-50 rounded-xl cursor-pointer">
            <input type="checkbox" checked={allChecked} onChange={e => toggleAll(e.target.checked)}
              className="w-4 h-4 rounded accent-brand-600" />
            <span className="font-bold text-neutral-900 text-sm">?„ì²´ ?™ì˜ (? íƒ ?¬í•¨)</span>
          </label>

          <div className="border-t border-neutral-100 pt-4 space-y-4">
            {CONSENT_ITEMS.map(item => (
              <div key={item.id} className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={checks[item.id]} onChange={() => toggle(item.id)}
                    className="mt-0.5 w-4 h-4 rounded accent-brand-600" />
                  <span className={`text-sm font-semibold ${item.required ? "text-neutral-900" : "text-neutral-600"}`}>
                    {item.title}
                  </span>
                </label>
                <div className="ml-7 text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3 leading-relaxed">
                  {item.content}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => canProceed && router.push("/")}
            disabled={!canProceed}
            className={`w-full font-semibold py-4 rounded-xl transition-all active:scale-95 mt-2 ${canProceed ? "bg-brand-600 hover:bg-brand-700 text-white shadow-brand" : "bg-neutral-200 text-neutral-400 cursor-not-allowed"}`}
          >
            {canProceed ? "?™ì˜?˜ê³  ?œì‘?˜ê¸°" : "?„ìˆ˜ ??ª©???™ì˜?´ì£¼?¸ìš”"}
          </button>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-4">
          ?¸ì œ?€?™êµ ?°ì´?°ê±°ë²„ë„Œ?¤ì„¼?°ëŠ” ê°œì¸?•ë³´ë³´í˜¸ë²•ì— ?°ë¼ ?Œì›??ê°œì¸?•ë³´ë¥?ë³´í˜¸?©ë‹ˆ??
        </p>
      </div>
    </div>
  );
}
