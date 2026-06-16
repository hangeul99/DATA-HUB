"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search, Grid3X3, List, Download, X,
  FileText, Eye, ShoppingCart, CheckSquare, Trash2,
  HelpCircle, Upload, Loader2, ClipboardList, Lock, Unlock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// ?€?€ ???•ì˜ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
const TABS = [
  { id: "browse",  label: "?°ì´??ì°¾ê¸°" },
  { id: "history", label: "? ì²­ ?´ì—­"   },
  { id: "cart",    label: "?¥ë°”êµ¬ë‹ˆ"    },
  { id: "guide",   label: "?´ìš© ?ˆë‚´"   },
  { id: "result",  label: "ê²°ê³¼ë¬??œì¶œ" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ?€?€ ì¹´í…Œê³ ë¦¬ / ?°ë„ / ?•ì‹ ëª©ë¡ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
const CATEGORIES = ["?„ì²´", "?µê³„/ê³µê³µ ?°ì´??, "?°êµ¬/?™ìˆ  ?°ì´??, "ê¸ˆìœµ/ê²½ì œ ?°ì´??, "ì§€???…ì²´ ?°ì´??];
const YEARS      = ["?„ì²´ ?°ë„", "2025", "2024", "2023", "2022 ?´ì „"];
const FILE_TYPES = ["?„ì²´ ?•ì‹", "CSV", "Excel", "JSON", "Parquet", "TXT", "SAS/SPSS"];

// ?€?€ ì¹´í…Œê³ ë¦¬ë³??„ì´ì½??‰ìƒ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
const iconColor: Record<string, string> = {
  "?µê³„/ê³µê³µ ?°ì´??: "bg-blue-50 text-blue-600",
  "?°êµ¬/?™ìˆ  ?°ì´??: "bg-brand-50 text-brand-600",
  "ê¸ˆìœµ/ê²½ì œ ?°ì´??: "bg-emerald-50 text-emerald-600",
  "ì§€???…ì²´ ?°ì´??: "bg-orange-50 text-orange-600",
};

// ?€?€ ? ì²­ ?´ì—­ ???€???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
interface Application {
  id: string;
  created_at: string;
  field: string;
  period: string;
  purpose: string;
  datasets: {
    id: string;
    title: string;
    category: string;
    year: string;
    tags: string[];
  } | null;
}

// ?€?€ ë¶„ì•¼ë³?ë°°ì? ?‰ìƒ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
const fieldColor: Record<string, string> = {
  "?™ìˆ ?°êµ¬":    "bg-brand-50 text-brand-700",
  "?•ì±…?°êµ¬":    "bg-blue-50 text-blue-700",
  "?°ì—…ë¶„ì„":    "bg-emerald-50 text-emerald-700",
  "ê¸°í?":        "bg-neutral-100 text-neutral-600",
};

// ?€?€ Supabase datasets ???€???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
interface Dataset {
  id: string;
  title: string;
  category: string;
  year: string;
  description: string;
  tags: string[];
  downloads: number;
  file_path: string | null;
  created_at: string;
}


// ?€?€ ì§€???…ì²´ ?‘ê·¼ ê¶Œí•œ ? ì²­ ëª¨ë‹¬ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
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

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <Unlock size={24} className="text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold mb-2">? ì²­ ?„ë£Œ</h3>
        <p className="text-sm text-neutral-500 mb-6">ê´€ë¦¬ì ê²€?????¹ì¸?˜ë©´ ì§€???…ì²´ ?°ì´?°ì— ?‘ê·¼?????ˆìŠµ?ˆë‹¤.</p>
        <button onClick={onClose} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors">?•ì¸</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-orange-500" />
            <h3 className="text-lg font-bold text-neutral-900">ì§€???…ì²´ ?°ì´???‘ê·¼ ? ì²­</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <p className="text-sm text-neutral-500 mb-5 leading-relaxed">
          ì§€???…ì²´ ?°ì´?°ëŠ” ê´€ë¦¬ì ?¹ì¸ ???´ìš©?????ˆìŠµ?ˆë‹¤.<br />
          ?„ë˜???‘ê·¼???„ìš”???´ìœ ë¥??‘ì„±?´ì£¼?¸ìš”.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="?? ì§€???Œìƒê³µì¸ ë¶„ì„ ?°êµ¬???œìš©?˜ê³ ???©ë‹ˆ??"
          rows={4}
          className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-neutral-400"
        />
        <button
          onClick={handleSubmit}
          disabled={!reason.trim() || submitting}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting ? "? ì²­ ì¤?.." : "?‘ê·¼ ê¶Œí•œ ? ì²­"}
        </button>
      </div>
    </div>
  );
}

// ?€?€ ? ìŠ¤???Œë¦¼ ì»´í¬?ŒíŠ¸ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-neutral-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl">
      <ShoppingCart size={15} className="text-brand-300" />
      {message}
      <button onClick={onClose} className="ml-2 text-neutral-400 hover:text-white">
        <X size={13} />
      </button>
    </div>
  );
}

export default function DatasetsClient() {
  // ?€?€ ??/ ?„í„° ?íƒœ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const [activeTab, setActiveTab]   = useState<TabId>("browse");
  const [query, setQuery]           = useState("");
  const [category, setCategory]     = useState("?„ì²´");
  const [year, setYear]             = useState("?„ì²´ ?°ë„");
  const [fileType, setFileType]     = useState("?„ì²´ ?•ì‹");
  const [view, setView]             = useState<"grid" | "list">("grid");

  // ?€?€ ? íƒ / ?¥ë°”êµ¬ë‹ˆ ?íƒœ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cart, setCart]         = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("cart") ?? "[]")); } catch { return new Set(); }
  });
  const [toast, setToast]       = useState<string | null>(null);

  // ?€?€ ?„ì¬ ë¡œê·¸??? ì? ?íƒœ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const [user, setUser] = useState<User | null>(null);

  // ?€?€ Supabase ?°ì´???íƒœ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const [datasets, setDatasets]         = useState<Dataset[]>([]);
  const [loading, setLoading]           = useState(true);
  const [fetchError, setFetchError]     = useState<string | null>(null);

  // ?€?€ ê²°ê³¼ë¬??œì¶œ ???íƒœ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const [resultDatasetId,  setResultDatasetId]  = useState("");
  const [resultSummary,    setResultSummary]    = useState("");
  const [resultFile,       setResultFile]       = useState<File | null>(null);
  const [resultSubmitting, setResultSubmitting] = useState(false);
  const [resultDone,       setResultDone]       = useState(false);
  const [resultError,      setResultError]      = useState<string | null>(null);

  // ?€?€ ì§€???…ì²´ ?°ì´???‘ê·¼ ê¶Œí•œ ?íƒœ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const [localDataApproved, setLocalDataApproved] = useState<boolean | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);

  // ?€?€ ? ì²­ ?´ì—­ ?íƒœ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const [applications, setApplications] = useState<Application[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFetched, setHistoryFetched] = useState(false);

  // ?€?€ ë¡œê·¸??? ì? ê°ì? ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      // ? ì?ê°€ ë°”ë€Œë©´ ìºì‹œ ì´ˆê¸°??      setHistoryFetched(false);
      setApplications([]);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ?€?€ ì§€???…ì²´ ?‘ê·¼ ê¶Œí•œ + ? ì²­ ?¬ë? ?•ì¸ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  useEffect(() => {
    if (!user) { setLocalDataApproved(null); return; }
    const supabase = createClient();
    supabase.from("profiles").select("local_data_approved").eq("id", user.id).single()
      .then(({ data }) => setLocalDataApproved(data?.local_data_approved ?? false));
    supabase.from("access_requests").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setAlreadyRequested(!!data));
  }, [user]);

  // ?€?€ ?°ì´?°ì…‹ ëª©ë¡ ë¶ˆëŸ¬?¤ê¸° ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("datasets")
      .select("id, title, category, year, description, tags, downloads, file_path, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setFetchError("?°ì´?°ë? ë¶ˆëŸ¬?¤ëŠ” ???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
        else setDatasets(data ?? []);
        setLoading(false);
      });
  }, []);

  // ?€?€ ? ì²­ ?´ì—­ fetch (?ˆìŠ¤? ë¦¬ ??ì§„ì… ??1?? ?€?€?€?€?€?€?€?€?€?€?€?€
  useEffect(() => {
    if (activeTab !== "history" || !user || historyFetched) return;
    setHistoryLoading(true);
    const supabase = createClient();
    supabase
      .from("applications")
      .select("id, created_at, field, period, purpose, datasets(id, title, category, year, tags)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setApplications((data as unknown as Application[]) ?? []);
        setHistoryFetched(true);
        setHistoryLoading(false);
      });
  }, [activeTab, user, historyFetched]);

  // ?€?€ ?„í„°ë§??€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const filtered = useMemo(() => {
    return datasets.filter((d) => {
      const matchQ    = d.title.includes(query) || d.description?.includes(query);
      const matchCat  = category === "?„ì²´" || d.category === category;
      const matchYear = year === "?„ì²´ ?°ë„" || d.year === year;
      const matchFile = fileType === "?„ì²´ ?•ì‹" || d.tags?.includes(fileType);
      return matchQ && matchCat && matchYear && matchFile;
    });
  }, [datasets, query, category, year, fileType]);

  const hasFilter = category !== "?„ì²´" || year !== "?„ì²´ ?°ë„" || fileType !== "?„ì²´ ?•ì‹" || query !== "";

  // ?€?€ ê²°ê³¼ë¬??œì¶œ ?¸ë“¤???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const submitResult = async () => {
    if (!user)                  { setResultError("ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??"); return; }
    if (!resultDatasetId)       { setResultError("?°ì´?°ì…‹??? íƒ?´ì£¼?¸ìš”."); return; }
    if (!resultSummary.trim())  { setResultError("?œìš© ?´ì—­???…ë ¥?´ì£¼?¸ìš”."); return; }

    setResultSubmitting(true);
    setResultError(null);
    const supabase = createClient();

    // ?Œì¼ ì²¨ë?ê°€ ?ˆìœ¼ë©?Storage??ë¨¼ì? ?…ë¡œ??    let filePath: string | null = null;
    let fileName: string | null = null;
    if (resultFile) {
      const ext = resultFile.name.split(".").pop();
      const uploadPath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("results").upload(uploadPath, resultFile, { upsert: false });
      if (uploadErr) {
        setResultError("?Œì¼ ?…ë¡œ?œì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.");
        setResultSubmitting(false);
        return;
      }
      filePath = uploadPath;
      fileName = resultFile.name;
    }

    // results ?Œì´ë¸”ì— ?€??    const { error } = await supabase.from("results").insert({
      user_id: user.id,
      dataset_id: resultDatasetId,
      summary: resultSummary.trim(),
      file_path: filePath,
      file_name: fileName,
    });

    if (error) {
      setResultError("?œì¶œ???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„?´ì£¼?¸ìš”.");
    } else {
      setResultDone(true);
      setResultDatasetId("");
      setResultSummary("");
      setResultFile(null);
    }
    setResultSubmitting(false);
  };

  // ?€?€ ì§€???…ì²´ ?‘ê·¼ ê¶Œí•œ ? ì²­ ?œì¶œ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const submitAccessRequest = async (reason: string) => {
    if (!user) return;
    const supabase = createClient();
    await supabase.from("access_requests").insert({ user_id: user.id, reason, status: "pending" });
    setAlreadyRequested(true);
  };

  // ?€?€ ì²´í¬ë°•ìŠ¤ ? ê? ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ?€?€ ?¥ë°”êµ¬ë‹ˆ ?¨ê±´ ì¶”ê? ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const addToCart = (id: string) => {
    setCart((prev) => new Set(prev).add(id));
    const ds = datasets.find((d) => d.id === id);
    showToast(`"${ds?.title}" ?¥ë°”êµ¬ë‹ˆ???´ê²¼?µë‹ˆ??`);
  };

  // ?€?€ ? íƒ ??ª© ?¼ê´„ ?¥ë°”êµ¬ë‹ˆ ?´ê¸° ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const addSelectedToCart = () => {
    if (selected.size === 0) return;
    setCart((prev) => { const n = new Set(prev); selected.forEach((id) => n.add(id)); return n; });
    showToast(`${selected.size}ê°??°ì´?°ê? ?¥ë°”êµ¬ë‹ˆ???´ê²¼?µë‹ˆ??`);
    setSelected(new Set());
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ?€?€ ?¥ë°”êµ¬ë‹ˆ ??localStorage ?™ê¸°???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify([...cart]));
  }, [cart]);

  // ?€?€ ?¤ëª…?ë£Œ ?ìŠ¤???ì„± ???Œì¼ ?¤ìš´ë¡œë“œ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const downloadDescription = (ds: Dataset) => {
    const lines = [
      `?°ì´?°ì…‹ ?¤ëª…?ë£Œ`,
      `${"=".repeat(40)}`,
      `?œëª©    : ${ds.title}`,
      `ì¹´í…Œê³ ë¦¬: ${ds.category}`,
      `êµ¬ì¶•?„ë„: ${ds.year}`,
      `?•ì‹    : ${ds.tags?.join(", ") || "-"}`,
      `?¤ìš´ë¡œë“œ: ${ds.downloads?.toLocaleString()}??,
      ``,
      `[?°ì´???¤ëª…]`,
      ds.description || "?¤ëª… ?†ìŒ",
      ``,
      `${"=".repeat(40)}`,
      `?¸ì œ?€?™êµ ?°ì´?°ê±°ë²„ë„Œ?¤ì„¼??,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    // ?Œì¼ëª…ì— ?¬ìš© ë¶ˆê? ë¬¸ì ?œê±°
    a.download = `?¤ëª…?ë£Œ_${ds.title.replace(/[\\/:*?"<>|]/g, "_")}.txt`;
    a.click();
    // ë©”ëª¨ë¦??´ì œ
    URL.revokeObjectURL(url);
  };

  const cartItems = datasets.filter((d) => cart.has(d.id));

  // ?€?€ ë¡œë”© ?”ë©´ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      {showAccessModal && (
        <AccessRequestModal
          onClose={() => setShowAccessModal(false)}
          onSubmit={submitAccessRequest}
        />
      )}

      {/* ?€?€ ??ë°??€?€ */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-center">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors duration-150
                  ${activeTab === tab.id ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"}
                  ${tab.id === "cart" && cart.size > 0 ? "pr-8" : ""}`}>
                {tab.label}
                {/* ?¥ë°”êµ¬ë‹ˆ ê°œìˆ˜ ë°°ì? */}
                {tab.id === "cart" && cart.size > 0 && (
                  <span className="absolute top-3 right-2 bg-brand-500 text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">
                    {cart.size}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ?€?€ ? ì²­ ?´ì—­ ???€?€ */}
      {activeTab === "history" && (
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">? ì²­ ?´ì—­</h2>

          {/* ë¹„ë¡œê·¸ì¸ ?íƒœ */}
          {!user ? (
            <div className="bg-white rounded-2xl border border-neutral-200 py-20 text-center text-neutral-400">
              <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">ë¡œê·¸????? ì²­ ?´ì—­???•ì¸?????ˆìŠµ?ˆë‹¤.</p>
              <Link href="/login"
                className="mt-4 inline-block text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-5 py-2 rounded-xl transition-colors">
                ë¡œê·¸?¸í•˜ê¸?              </Link>
            </div>

          /* ë¡œë”© ì¤?*/
          ) : historyLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={28} className="animate-spin text-brand-600" />
            </div>

          /* ? ì²­ ?´ì—­ ?†ìŒ */
          ) : applications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 py-20 text-center text-neutral-400">
              <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">?„ì§ ? ì²­???°ì´?°ì…‹???†ìŠµ?ˆë‹¤.</p>
              <button onClick={() => setActiveTab("browse")}
                className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">
                ?°ì´??ì°¾ê¸°ë¡??´ë™
              </button>
            </div>

          /* ? ì²­ ?´ì—­ ëª©ë¡ */
          ) : (
            <div className="flex flex-col gap-3">
              {applications.map((app) => {
                const ds = app.datasets;
                const badgeColor = fieldColor[app.field] ?? fieldColor["ê¸°í?"];
                return (
                  <div key={app.id}
                    className="bg-white rounded-2xl border border-neutral-100 hover:border-brand-200 transition-all duration-200 px-5 py-4 flex items-center gap-4">

                    {/* ì¹´í…Œê³ ë¦¬ ?„ì´ì½?*/}
                    <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm
                      ${iconColor[ds?.category ?? ""] ?? "bg-neutral-100 text-neutral-500"}`}>
                      {(ds?.category ?? "?")[0]}
                    </div>

                    {/* ?°ì´?°ì…‹ ?•ë³´ */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-400 mb-0.5">{ds?.category ?? "??}</p>
                      <p className="font-semibold text-sm text-neutral-900 truncate">{ds?.title ?? "?? œ???°ì´?°ì…‹"}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">?´ìš© ê¸°ê°„: {app.period}</p>
                    </div>

                    {/* ë¶„ì•¼ ë°°ì? */}
                    <span className={`hidden sm:inline-flex text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${badgeColor}`}>
                      {app.field || "ê¸°í?"}
                    </span>

                    {/* ? ì²­??*/}
                    <p className="hidden md:block text-xs text-neutral-400 flex-shrink-0 w-24 text-right">
                      {new Date(app.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })}
                    </p>

                    {/* ?ì„¸ ë³´ê¸° ë§í¬ */}
                    {ds && (
                      <Link href={`/datasets/${ds.id}`}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-brand-50 hover:text-brand-600 text-neutral-400 transition-colors flex-shrink-0">
                        <Eye size={14} />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ?€?€ ?¥ë°”êµ¬ë‹ˆ ???€?€ */}
      {activeTab === "cart" && (
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-neutral-900">?¥ë°”êµ¬ë‹ˆ <span className="text-brand-600">{cart.size}</span>ê°?/h2>
          </div>
          {cartItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 py-24 text-center text-neutral-400">
              <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">?¥ë°”êµ¬ë‹ˆê°€ ë¹„ì–´ ?ˆìŠµ?ˆë‹¤.</p>
              <button onClick={() => setActiveTab("browse")} className="mt-4 text-xs text-brand-600 hover:underline">
                ?°ì´??ì°¾ê¸°ë¡??´ë™
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cartItems.map((ds) => (
                <div key={ds.id} className="bg-white rounded-2xl border border-neutral-200 flex items-center gap-4 px-5 py-4">
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold ${iconColor[ds.category] ?? "bg-neutral-100 text-neutral-500"}`}>
                    {ds.category[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-400 mb-0.5">{ds.category}</p>
                    <p className="font-semibold text-sm text-neutral-900 truncate">{ds.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/datasets/${ds.id}`}
                      className="text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg transition-colors">
                      ? ì²­?˜ê¸°
                    </Link>
                    <button onClick={() => setCart((prev) => { const n = new Set(prev); n.delete(ds.id); return n; })}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 hover:bg-red-50 hover:text-red-500 text-neutral-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ?€?€ ?´ìš© ?ˆë‚´ ???€?€ */}
      {activeTab === "guide" && (
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-10">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">?´ìš© ?ˆë‚´</h2>
          <div className="space-y-4">
            {[
              { step: "01", title: "?°ì´???ìƒ‰",  desc: "?°ì´??ì°¾ê¸° ??—???í•˜???°ì´?°ì…‹??ê²€?‰í•˜ê³??ì„¸ ?´ìš©???•ì¸?©ë‹ˆ??" },
              { step: "02", title: "? ì²­???‘ì„±",  desc: "? ì²­?˜ê¸° ë²„íŠ¼???´ë¦­???Œì†ê¸°ê?, ?´ìš©ëª©ì , ?œìš©ê¸°ê°„ ?±ì„ ?…ë ¥?˜ê³  ë³´ì•ˆ?œì•½???™ì˜?©ë‹ˆ??" },
              { step: "03", title: "ì¦‰ì‹œ ?¤ìš´ë¡œë“œ", desc: "? ì²­???œì¶œ ì¦‰ì‹œ ?¤ìš´ë¡œë“œ ë§í¬ê°€ ?œì„±?”ë©?ˆë‹¤. ë³„ë„ ?¹ì¸ ?€ê¸??†ì´ ë°”ë¡œ ?´ìš©?????ˆìŠµ?ˆë‹¤." },
              { step: "04", title: "ê²°ê³¼ë¬??œì¶œ",  desc: "?°ì´?°ë? ?œìš©???°êµ¬ ê²°ê³¼ë¬??¼ë¬¸, ë³´ê³ ??????ê²°ê³¼ë¬??œì¶œ ??—???±ë¡?´ì£¼?¸ìš”." },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl border border-neutral-200 p-6 flex gap-5">
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{item.step}</div>
                <div>
                  <p className="font-semibold text-neutral-900 mb-1">{item.title}</p>
                  <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
            <div className="bg-brand-50 rounded-2xl border border-brand-100 p-5 flex gap-3">
              <HelpCircle size={18} className="text-brand-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-brand-800">
                ?´ìš© ê´€??ë¬¸ì˜??<a href="mailto:han9449@inje.ac.kr" className="font-semibold underline">han9449@inje.ac.kr</a> ë¡??°ë½ì£¼ì„¸??
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ?€?€ ê²°ê³¼ë¬??œì¶œ ???€?€ */}
      {activeTab === "result" && (
        <div className="max-w-2xl mx-auto px-6 lg:px-8 py-10">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">ê²°ê³¼ë¬??œì¶œ</h2>

          {/* ë¹„ë¡œê·¸ì¸ ?ˆë‚´ */}
          {!user ? (
            <div className="bg-white rounded-2xl border border-neutral-200 py-20 text-center text-neutral-400">
              <Upload size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">ë¡œê·¸????ê²°ê³¼ë¬¼ì„ ?œì¶œ?????ˆìŠµ?ˆë‹¤.</p>
              <a href="/login" className="mt-4 inline-block text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-5 py-2 rounded-xl transition-colors">
                ë¡œê·¸?¸í•˜ê¸?              </a>
            </div>

          /* ?œì¶œ ?„ë£Œ */
          ) : resultDone ? (
            <div className="bg-white rounded-2xl border border-neutral-200 py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
                <Upload size={24} className="text-brand-600" />
              </div>
              <p className="font-semibold text-neutral-900 mb-1">ê²°ê³¼ë¬¼ì´ ?œì¶œ?˜ì—ˆ?µë‹ˆ??</p>
              <p className="text-sm text-neutral-400 mb-6">ë§ˆì´?˜ì´ì§€?ì„œ ?œì¶œ ?´ì—­???•ì¸?????ˆìŠµ?ˆë‹¤.</p>
              <button onClick={() => setResultDone(false)}
                className="text-sm font-semibold text-brand-600 hover:underline">
                ì¶”ê? ?œì¶œ?˜ê¸°
              </button>
            </div>

          /* ?œì¶œ ??*/
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
              {/* ?°ì´?°ì…‹ ? íƒ */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">ê´€???°ì´?°ì…‹ <span className="text-red-500">*</span></label>
                <select value={resultDatasetId} onChange={(e) => setResultDatasetId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                  <option value="">?°ì´?°ì…‹ ? íƒ</option>
                  {datasets.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>

              {/* ?œìš© ?´ì—­ */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">?œìš© ?´ì—­ ?”ì•½ <span className="text-red-500">*</span></label>
                <textarea rows={4} value={resultSummary} onChange={(e) => setResultSummary(e.target.value)}
                  placeholder="?°ì´?°ë? ?´ë–»ê²??œìš©?ˆëŠ”ì§€ ê°„ëµ???‘ì„±?´ì£¼?¸ìš”."
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
              </div>

              {/* ?Œì¼ ì²¨ë? */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">ì¦ë¹™?ë£Œ ì²¨ë?</label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-200 rounded-xl p-8 cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
                  <Upload size={22} className="text-neutral-400" />
                  {resultFile ? (
                    <span className="text-sm text-brand-600 font-medium">{resultFile.name}</span>
                  ) : (
                    <>
                      <span className="text-sm text-neutral-500">?Œì¼???œë˜ê·¸í•˜ê±°ë‚˜ ?´ë¦­?´ì„œ ?…ë¡œ??/span>
                      <span className="text-xs text-neutral-400">PDF, JPG, PNG, ZIP Â· ìµœë? 50MB</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.zip"
                    onChange={(e) => setResultFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>

              {/* ?ëŸ¬ */}
              {resultError && (
                <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{resultError}</p>
              )}

              {/* ?œì¶œ ë²„íŠ¼ */}
              <button onClick={submitResult} disabled={resultSubmitting}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2">
                {resultSubmitting && <Loader2 size={16} className="animate-spin" />}
                {resultSubmitting ? "?œì¶œ ì¤?.." : "ê²°ê³¼ë¬??œì¶œ?˜ê¸°"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ?€?€ ?°ì´??ì°¾ê¸° ???€?€ */}
      {activeTab === "browse" && (
        <>
          {/* ?˜ì´ì§€ ?¤ë” + ?„í„° */}
          <div className="bg-white border-b border-neutral-100">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
              <h1 className="text-3xl font-bold text-neutral-900 mb-1">?°ì´???ìƒ‰</h1>
              <p className="text-neutral-500 text-sm">
                ê²€ì¦ëœ {datasets.length}ê°??°ì´?°ì…‹???ìƒ‰?˜ê³  ?´ìš© ? ì²­?˜ì„¸??
              </p>

              {/* ?ëŸ¬ */}
              {fetchError && (
                <div className="mt-4 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{fetchError}</div>
              )}

              {/* ?„í„° ??*/}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 flex-wrap">
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select value={year} onChange={(e) => setYear(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {YEARS.map((y) => <option key={y}>{y}</option>)}
                </select>
                <select value={fileType} onChange={(e) => setFileType(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {FILE_TYPES.map((f) => <option key={f}>{f}</option>)}
                </select>

                {/* ê²€?‰ì°½ */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                  <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="ê²€?‰ì–´ë¥??…ë ¥?˜ì„¸??"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>

                {/* ? íƒ ?°ì´???´ê¸° */}
                <button onClick={addSelectedToCart} disabled={selected.size === 0}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                    ${selected.size > 0 ? "bg-brand-600 text-white hover:bg-brand-700 shadow-brand active:scale-95" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"}`}>
                  <CheckSquare size={15} />
                  ? íƒ ?°ì´???´ê¸°
                  {selected.size > 0 && (
                    <span className="bg-white text-brand-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{selected.size}</span>
                  )}
                </button>

                {/* ?¥ë°”êµ¬ë‹ˆ ë²„íŠ¼ */}
                <button onClick={() => setActiveTab("cart")}
                  className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-neutral-200 bg-white hover:border-brand-300 transition-colors">
                  <ShoppingCart size={15} className="text-neutral-500" />
                  ?¥ë°”êµ¬ë‹ˆ
                  {cart.size > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                      {cart.size}
                    </span>
                  )}
                </button>

                {/* ë·??„í™˜ */}
                <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
                  <button onClick={() => setView("grid")}
                    className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-white text-brand-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"}`}>
                    <Grid3X3 size={16} />
                  </button>
                  <button onClick={() => setView("list")}
                    className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-white text-brand-600 shadow-sm" : "text-neutral-400 hover:text-neutral-600"}`}>
                    <List size={16} />
                  </button>
                </div>
              </div>

              {/* ?œì„± ?„í„° ì¹?*/}
              {hasFilter && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-neutral-500">?„í„°:</span>
                  {category !== "?„ì²´" && (
                    <button onClick={() => setCategory("?„ì²´")} className="flex items-center gap-1 text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full hover:bg-brand-100">
                      {category} <X size={10} />
                    </button>
                  )}
                  {year !== "?„ì²´ ?°ë„" && (
                    <button onClick={() => setYear("?„ì²´ ?°ë„")} className="flex items-center gap-1 text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full hover:bg-brand-100">
                      {year} <X size={10} />
                    </button>
                  )}
                  {fileType !== "?„ì²´ ?•ì‹" && (
                    <button onClick={() => setFileType("?„ì²´ ?•ì‹")} className="flex items-center gap-1 text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full hover:bg-brand-100">
                      {fileType} <X size={10} />
                    </button>
                  )}
                  {query && (
                    <button onClick={() => setQuery("")} className="flex items-center gap-1 text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full hover:bg-brand-100">
                      &ldquo;{query}&rdquo; <X size={10} />
                    </button>
                  )}
                  <button onClick={() => { setCategory("?„ì²´"); setYear("?„ì²´ ?°ë„"); setFileType("?„ì²´ ?•ì‹"); setQuery(""); }}
                    className="text-xs text-neutral-400 hover:text-neutral-600">ì´ˆê¸°??/button>
                </div>
              )}
            </div>
          </div>

          {/* ê²°ê³¼ ëª©ë¡ */}
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            <p className="text-sm text-neutral-500 mb-6">
              ì´?<span className="font-semibold text-neutral-900">{filtered.length}</span>ê°??°ì´?°ì…‹
              {selected.size > 0 && <span className="ml-2 text-brand-600 font-medium">{selected.size}ê°?? íƒ??/span>}
            </p>

            {/* ?°ì´???†ìŒ */}
            {filtered.length === 0 ? (
              <div className="text-center py-24 text-neutral-400">
                <Search size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-base font-medium">
                  {datasets.length === 0 ? "?±ë¡???°ì´?°ì…‹???†ìŠµ?ˆë‹¤." : "ê²€??ê²°ê³¼ê°€ ?†ìŠµ?ˆë‹¤."}
                </p>
                <p className="text-sm mt-1">
                  {datasets.length === 0 ? "ê´€ë¦¬ìê°€ ?°ì´?°ì…‹???±ë¡?˜ë©´ ?´ê³³???œì‹œ?©ë‹ˆ??" : "?¤ë¥¸ ?¤ì›Œ?œë‚˜ ?„í„°ë¥??œë„?´ë³´?¸ìš”."}
                </p>
              </div>
            ) : view === "grid" ? (
              // ?€?€ ê·¸ë¦¬??ë·??€?€
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((ds) => {
                  const isSelected = selected.has(ds.id);
                  const inCart = cart.has(ds.id);
                  const isLocal = ds.category === "ì§€???…ì²´ ?°ì´??;
                  const isLocked = isLocal && !localDataApproved;
                  return (
                    <div key={ds.id}
                      className={`group bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden
                        ${isLocked ? "border-orange-200" : isSelected ? "border-brand-400 ring-2 ring-brand-200 shadow-brand" : "border-neutral-100 hover:border-brand-200 hover:shadow-brand"}`}>

                      {/* ? ê¸ˆ ë°°ë„ˆ */}
                      {isLocked && (
                        <div className="bg-orange-50 border-b border-orange-100 px-3 py-1.5 flex items-center gap-1.5">
                          <Lock size={11} className="text-orange-500 flex-shrink-0" />
                          <span className="text-[10px] text-orange-600 font-medium">?‘ê·¼ ê¶Œí•œ ?„ìš”</span>
                        </div>
                      )}

                      {/* ì²´í¬ë°•ìŠ¤ + ë°°ì? */}
                      <div className="flex items-start justify-between px-4 pt-4 pb-2">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(ds.id)}
                          disabled={isLocked}
                          className="w-4 h-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-400 cursor-pointer mt-0.5 disabled:opacity-30" />
                        {new Date().getTime() - new Date(ds.created_at).getTime() < 7 * 24 * 60 * 60 * 1000 ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-500 text-white">? ê·œ</span>
                        ) : <span />}
                      </div>

                      {/* ?„ì´ì½?+ ?•ë³´ */}
                      <div className="flex flex-col items-center px-4 pb-3 flex-1">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-lg font-bold relative ${iconColor[ds.category] ?? "bg-neutral-100 text-neutral-500"} ${isLocked ? "opacity-50" : ""}`}>
                          {isLocked ? <Lock size={22} /> : ds.category[0]}
                        </div>
                        <p className="text-[10px] text-neutral-400 mb-1">{ds.category}</p>
                        <h3 className={`font-semibold text-sm leading-snug mb-1.5 text-center transition-colors line-clamp-2 ${isLocked ? "text-neutral-400" : "text-neutral-900 group-hover:text-brand-700"}`}>
                          {ds.title}
                        </h3>
                        <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-2 text-center">{ds.description}</p>
                      </div>

                      {/* ?œê·¸ + ?¤ìš´ë¡œë“œ ??*/}
                      <div className="px-4 pb-2 flex items-center justify-between">
                        <div className="flex gap-1 flex-wrap">
                          {ds.tags?.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded font-mono">{t}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-0.5 text-[10px] text-neutral-400">
                          <Download size={10} /> {ds.downloads?.toLocaleString()}
                        </div>
                      </div>

                      {/* ?¡ì…˜ ë²„íŠ¼ */}
                      <div className="border-t border-neutral-100 px-4 py-3 flex items-center gap-2">
                        {isLocked ? (
                          // ? ê¸ˆ ?íƒœ: ?‘ê·¼ ê¶Œí•œ ? ì²­ ë²„íŠ¼
                          <button
                            onClick={() => user ? setShowAccessModal(true) : window.location.href = "/login"}
                            className="flex-1 text-center text-xs font-semibold flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors active:scale-95 bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            {alreadyRequested ? (
                              <><CheckSquare size={12} /> ? ì²­ ?„ë£Œ (?€ê¸°ì¤‘)</>
                            ) : (
                              <><Lock size={12} /> ?‘ê·¼ ê¶Œí•œ ? ì²­</>
                            )}
                          </button>
                        ) : (
                          <>
                            <button title="?¤ëª…?ë£Œ ?´ë ¤ë°›ê¸°" onClick={() => downloadDescription(ds)}
                              className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors">
                              <FileText size={14} />
                            </button>
                            <button title="?¥ë°”êµ¬ë‹ˆ ?´ê¸°" onClick={() => addToCart(ds.id)}
                              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors
                                ${inCart ? "bg-brand-100 text-brand-600" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-500"}`}>
                              <ShoppingCart size={14} />
                            </button>
                            <Link href={`/datasets/${ds.id}`} title="ë¯¸ë¦¬ë³´ê¸°"
                              className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors">
                              <Eye size={14} />
                            </Link>
                            <Link href={`/datasets/${ds.id}`}
                              className="flex-1 text-center text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 py-2 rounded-lg transition-colors active:scale-95">
                              ? ì²­?˜ê¸°
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // ?€?€ ë¦¬ìŠ¤??ë·??€?€
              <div className="flex flex-col gap-2">
                {filtered.map((ds) => {
                  const isSelected = selected.has(ds.id);
                  const inCart = cart.has(ds.id);
                  return (
                    <div key={ds.id}
                      className={`group bg-white rounded-2xl border transition-all duration-200 flex items-center gap-4 px-5 py-4
                        ${isSelected ? "border-brand-400 ring-2 ring-brand-200" : "border-neutral-100 hover:border-brand-200 hover:shadow-brand"}`}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(ds.id)}
                        className="w-4 h-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-400 cursor-pointer flex-shrink-0" />
                      <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm ${iconColor[ds.category] ?? "bg-neutral-100 text-neutral-500"}`}>
                        {ds.category[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-neutral-400 mb-0.5">{ds.category}</p>
                        <h3 className="font-semibold text-sm text-neutral-900 group-hover:text-brand-700 transition-colors truncate">{ds.title}</h3>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">{ds.description}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                        {ds.tags?.map((t) => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded font-mono">{t}</span>
                        ))}
                      </div>
                      <div className="hidden md:flex items-center gap-1 text-xs text-neutral-400 flex-shrink-0 w-16 justify-end">
                        <Download size={11} /> {ds.downloads?.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* ?¤ëª…?ë£Œ ?´ë ¤ë°›ê¸°: ë¦¬ìŠ¤??ë·?*/}
                        <button title="?¤ëª…?ë£Œ ?´ë ¤ë°›ê¸°" onClick={() => downloadDescription(ds)} className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors"><FileText size={14} /></button>
                        <button title="?¥ë°”êµ¬ë‹ˆ" onClick={() => addToCart(ds.id)}
                          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${inCart ? "bg-brand-100 text-brand-600" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-500"}`}>
                          <ShoppingCart size={14} />
                        </button>
                        <Link href={`/datasets/${ds.id}`} title="ë¯¸ë¦¬ë³´ê¸°"
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition-colors">
                          <Eye size={14} />
                        </Link>
                        <Link href={`/datasets/${ds.id}`}
                          className="text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg transition-colors active:scale-95">
                          ? ì²­?˜ê¸°
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
