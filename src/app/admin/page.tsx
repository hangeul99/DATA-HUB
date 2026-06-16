"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Database, BarChart2, FileText, Download, Upload,
  Trash2, CheckCircle, TrendingUp, Plus, X, Loader2, AlertTriangle, Lock,
} from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";

// ?Ä?Ä ??Î™©Î°ù ??"?§Ïö¥Î°úÎìú Î°úÍ∑∏"??"?¥Ïö© ?ÑÌô©"???µÌï© ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
const ADMIN_TABS = ["?§Ï†Å ?ÑÌô©", "?†Ï≤≠??Î™©Î°ù", "Í≤∞Í≥ºÎ¨?Í≤Ä??, "?∞Ïù¥??Í¥ÄÎ¶?, "?åÏõê Í¥ÄÎ¶?, "?¥Ïö© ?ÑÌô©", "?ëÍ∑º Í∂åÌïú Í¥ÄÎ¶?];

// ?Ä?Ä Ïπ¥ÌÖåÍ≥†Î¶¨ Î™©Î°ù ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
const CATS = ["?µÍ≥Ñ/Í≥µÍ≥µ ?∞Ïù¥??, "?∞Íµ¨/?ôÏà† ?∞Ïù¥??, "Í∏àÏúµ/Í≤ΩÏ†ú ?∞Ïù¥??, "ÏßÄ???ÖÏ≤¥ ?∞Ïù¥??];

// ?Ä?Ä ?Ä???ïÏùò ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
interface UtilRow {
  id: string; title: string; category: string;
  applications: number; downloads: number; submissions: number;
}
interface AppRow {
  id: string; created_at: string; institution: string; field: string; status: string;
  profiles: { name: string; email: string } | null;
  datasets: { title: string } | null;
}
interface ResultRow {
  id: string; created_at: string; summary: string;
  file_name: string | null; file_path: string | null;
  profiles: { name: string } | null;
  datasets: { title: string } | null;
}
interface DatasetRow {
  id: string; title: string; category: string; year: string;
  file_size: number | null; is_active: boolean; created_at: string;
}
interface MemberRow {
  id: string; name: string; email: string; role: string; created_at: string;
  applicationCount?: number;
}
interface ActivityRow {
  no: number; datetime: string; organization: string; email: string; feature: string; fileName?: string;
  downloaded?: boolean; appStatus?: string;
}
interface AccessRequestRow {
  id: string; created_at: string; status: string; reason: string; user_id: string;
  profiles: { name: string; email: string; organization: string | null } | null;
}
interface Summary {
  datasets: number; applications: number; downloads: number; submissions: number;
}

// ?Ä?Ä ?∞Ïù¥?∞ÏÖã ?ÖÎ°ú??Î™®Îã¨ ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [form, setForm] = useState({ title: "", category: "", year: new Date().getFullYear().toString(), desc: "", tags: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleUpload = async () => {
    if (!form.title || !form.category) { setError("?úÎ™©Í≥?Ïπ¥ÌÖåÍ≥†Î¶¨???ÑÏàò?ÖÎãà??"); return; }
    setUploading(true);
    setError(null);

    const supabase = createClient();
    let filePath: string | null = null;
    let fileSize: number | null = null;

    // ?åÏùº???àÏúºÎ©?Storage???ÖÎ°ú??    if (file) {
      const ext = file.name.split(".").pop();
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const uploadPath = `uploads/${safeName}`;

      const { error: uploadErr } = await supabase
        .storage.from("datasets").upload(uploadPath, file, { upsert: false });

      if (uploadErr) {
        setError(`?åÏùº ?ÖÎ°ú???§Ìå®: ${uploadErr.message}`);
        setUploading(false);
        return;
      }
      filePath = uploadPath;
      fileSize = file.size;
    }

    // datasets ?åÏù¥Î∏îÏóê Î©îÌ??∞Ïù¥??INSERT
    const tags = form.tags
      ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const { error: dbErr } = await supabase.from("datasets").insert({
      title: form.title,
      category: form.category,
      year: form.year || new Date().getFullYear().toString(),
      description: form.desc || null,
      tags,
      file_path: filePath,
      file_size: fileSize,
      is_active: true,
    });

    if (dbErr) {
      setError(`?∞Ïù¥?∞Î≤†?¥Ïä§ ?Ä???§Ìå®: ${dbErr.message}`);
      setUploading(false);
      return;
    }

    setDone(true);
    onUploaded();
  };

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <CheckCircle size={40} className="text-brand-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">?∞Ïù¥?∞ÏÖã ?±Î°ù ?ÑÎ£å</h3>
        <p className="text-sm text-neutral-500 mb-6">?∞Ïù¥?∞ÏÖã???±Í≥µ?ÅÏúºÎ°??±Î°ù?òÏóà?µÎãà??</p>
        <button onClick={onClose} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors">?ïÏù∏</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-7 max-w-lg w-full shadow-xl my-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-neutral-900">???∞Ïù¥?∞ÏÖã ?±Î°ù</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg"><X size={16} /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
            <AlertTriangle size={14} className="flex-shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">?∞Ïù¥?∞ÏÖã ?úÎ™© <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="?? 2025 ?ÑÍµ≠ ÍµêÏú°?µÍ≥Ñ ?∞Ïù¥??
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Ïπ¥ÌÖåÍ≥†Î¶¨ <span className="text-red-500">*</span></label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="">?†ÌÉù</option>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Í∏∞Ï? ?∞ÎèÑ</label>
              <input type="text" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                placeholder="2025"
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">?∞Ïù¥???§Î™Ö</label>
            <textarea value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))}
              rows={3} placeholder="?∞Ïù¥???¥Ïö©, ?¨Ìï® ??™©, ?úÏö© Í∞Ä??Î∂ÑÏïº ?±ÏùÑ ?§Î™Ö?¥Ï£º?∏Ïöî."
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">?åÏùº ?úÍ∑∏ (?ºÌëú Íµ¨Î∂Ñ)</label>
            <input type="text" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="?? CSV, Excel, JSON"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">?∞Ïù¥???åÏùº ?ÖÎ°ú??<span className="text-neutral-400 font-normal">(?†ÌÉù)</span></label>
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-neutral-200 rounded-xl cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
              <Upload size={20} className="text-neutral-400 mb-2" />
              <span className="text-sm text-neutral-500">{file ? file.name : "?åÏùº ?¥Î¶≠ ?êÎäî ?úÎûòÍ∑??ÖÎ°ú??}</span>
              <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium py-3 rounded-xl transition-colors">Ï∑®ÏÜå</button>
          <button
            onClick={handleUpload}
            disabled={!form.title || !form.category || uploading}
            className={`flex-1 font-semibold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2
              ${form.title && form.category && !uploading ? "bg-brand-600 hover:bg-brand-700 text-white" : "bg-neutral-200 text-neutral-400 cursor-not-allowed"}`}
          >
            {uploading && <Loader2 size={14} className="animate-spin" />}
            {uploading ? "?ÖÎ°ú??Ï§?.." : "?±Î°ù"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ?Ä?Ä Í¥ÄÎ¶¨Ïûê ?òÏù¥ÏßÄ Î≥∏Ï≤¥ ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  // ?Ä?Ä ?îÏïΩ Ïπ¥Ïö¥???Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  const [summary, setSummary] = useState<Summary>({ datasets: 0, applications: 0, downloads: 0, submissions: 0 });

  // ?Ä?Ä ??≥Ñ ?∞Ïù¥???Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  const [utilRows, setUtilRows] = useState<UtilRow[]>([]);
  const [appRows, setAppRows] = useState<AppRow[]>([]);
  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [datasetRows, setDatasetRows] = useState<DatasetRow[]>([]);
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PER_PAGE = 100;
  const [accessRows, setAccessRows] = useState<AccessRequestRow[]>([]);

  const [loading, setLoading] = useState(false);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  // ?¥Ïö© ?ÑÌô© ?ëÏ? ?¥Î≥¥?¥Í∏∞
  const exportActivityExcel = () => {
    const rows = activityRows.map(r => ({
      "Î≤àÌò∏": r.no,
      "?ºÏãú": fmtDate(r.datetime),
      "?åÏÜç": r.organization,
      "?ÑÏù¥???¥Î©î??": r.email,
      "?¥Ïö©Í∏∞Îä•": r.feature,
      "?åÏùºÎ™?: r.fileName ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "?¥Ïö©?ÑÌô©");
    XLSX.writeFile(wb, `?¥Ïö©?ÑÌô©_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const fmtBytes = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  };

  // ?Ä?Ä ?îÏïΩ Ïπ¥Ïö¥??Ï°∞Ìöå ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  const fetchSummary = useCallback(async () => {
    const supabase = createClient();
    const [
      { count: d },
      { count: a },
      { count: dl },
      { count: r },
    ] = await Promise.all([
      supabase.from("datasets").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("applications").select("*", { count: "exact", head: true }),
      supabase.from("download_logs").select("*", { count: "exact", head: true }),
      supabase.from("results").select("*", { count: "exact", head: true }),
    ]);
    setSummary({ datasets: d ?? 0, applications: a ?? 0, downloads: dl ?? 0, submissions: r ?? 0 });
  }, []);

  // ?Ä?Ä ??≥Ñ ?∞Ïù¥??Ï°∞Ìöå ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  const fetchTab = useCallback(async (t: number) => {
    setLoading(true);
    const supabase = createClient();

    if (t === 0) {
      // ?∞Ïù¥?∞ÏÖãÎ≥??†Ï≤≠/?§Ïö¥Î°úÎìú/Í≤∞Í≥ºÎ¨???      const { data: ds } = await supabase
        .from("datasets")
        .select("id, title, category")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (ds) {
        const rows = await Promise.all(ds.map(async (d) => {
          const [{ count: apps }, { count: dls }, { count: subs }] = await Promise.all([
            supabase.from("applications").select("*", { count: "exact", head: true }).eq("dataset_id", d.id),
            supabase.from("download_logs").select("*", { count: "exact", head: true }).eq("dataset_id", d.id),
            supabase.from("results").select("*", { count: "exact", head: true }).eq("dataset_id", d.id),
          ]);
          return { id: d.id, title: d.title, category: d.category, applications: apps ?? 0, downloads: dls ?? 0, submissions: subs ?? 0 };
        }));
        setUtilRows(rows);
      }
    }

    if (t === 1) {
      const { data } = await supabase
        .from("applications")
        .select("id, created_at, institution, field, status, profiles(name, email), datasets(title)")
        .order("created_at", { ascending: false });
      setAppRows((data as unknown as AppRow[]) ?? []);
    }

    if (t === 2) {
      const { data } = await supabase
        .from("results")
        .select("id, created_at, summary, file_name, file_path, profiles(name), datasets(title)")
        .order("created_at", { ascending: false });
      setResultRows((data as unknown as ResultRow[]) ?? []);
    }

    if (t === 3) {
      const { data } = await supabase
        .from("datasets")
        .select("id, title, category, year, file_size, is_active, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setDatasetRows((data as DatasetRow[]) ?? []);
    }

    if (t === 4) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, role, created_at")
        .order("created_at", { ascending: false });

      if (profiles) {
        // Í∞??¨Ïö©?êÏùò ?†Ï≤≠ Í±¥Ïàò Ï°∞Ìöå
        const members = await Promise.all(profiles.map(async (p) => {
          const { count } = await supabase
            .from("applications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", p.id);
          return { ...p, applicationCount: count ?? 0 };
        }));
        setMemberRows(members);
      }
    }

    if (t === 5) {
      // ?¥Ïö© ?ÑÌô©: ?∞Ïù¥??Î∂ÑÏÑù + (?∞Ïù¥???†Ï≤≠ + ?§Ïö¥Î°úÎìú ?µÌï©) Î°úÍ∑∏
      const maskEmail = (email: string | null | undefined): string => {
        if (!email) return "-";
        const [local, domain] = email.split("@");
        if (!domain || local.length <= 4) return email;
        return `${local.slice(0, local.length - 4)}****@${domain}`;
      };

      const [{ data: logs }, { data: apps }, { data: dls }] = await Promise.all([
        supabase
          .from("analysis_logs")
          .select("id, created_at, organization, user_email, file_name")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("applications")
          .select("id, created_at, institution, user_id, dataset_id, status, profiles(email), datasets(title)")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("download_logs")
          .select("id, downloaded_at, user_id, dataset_id, profiles(email, organization), datasets(title)")
          .order("downloaded_at", { ascending: false })
          .limit(500),
      ]);

      type LogRaw = { id: string; created_at: string; organization: string | null; user_email: string | null; file_name: string | null };
      type AppRaw = { id: string; created_at: string; institution: string; user_id: string; dataset_id: string; status: string; profiles: { email: string } | { email: string }[] | null; datasets: { title: string } | null };
      type DlRaw  = { id: string; downloaded_at: string; user_id: string; dataset_id: string; profiles: { email: string; organization: string | null } | null; datasets: { title: string } | null };

      const getEmail = (p: AppRaw["profiles"]): string | undefined => {
        if (!p) return undefined;
        if (Array.isArray(p)) return p[0]?.email;
        return p.email;
      };

      // ?§Ïö¥Î°úÎìú Îß? "user_id:dataset_id" ??downloaded_at
      const dlMap = new Map<string, string>();
      ((dls ?? []) as unknown as DlRaw[]).forEach(d => {
        if (d.user_id && d.dataset_id) dlMap.set(`${d.user_id}:${d.dataset_id}`, d.downloaded_at);
      });

      // ?†Ï≤≠+?§Ïö¥Î°úÎìú Îß§Ïπ≠ Ï∂îÏ†Å (Ï§ëÎ≥µ ?úÍ±∞??
      const matchedDlKeys = new Set<string>();

      const appCombined = ((apps ?? []) as unknown as AppRaw[]).map(a => {
        const key = `${a.user_id}:${a.dataset_id}`;
        const dlAt = dlMap.get(key);
        if (dlAt) matchedDlKeys.add(key);
        return {
          datetime: a.created_at,
          organization: a.institution ?? "-",
          email: maskEmail(getEmail(a.profiles)),
          feature: dlAt ? "?†Ï≤≠+?§Ïö¥Î°úÎìú" : "?∞Ïù¥???†Ï≤≠",
          fileName: a.datasets?.title ?? undefined,
          downloaded: !!dlAt,
          appStatus: a.status,
        };
      });

      // ?†Ï≤≠ ?ÜÏù¥ ?§Ïö¥Î°úÎìúÎß??àÎäî Í≤ΩÏö∞ (?àÏô∏ ÏºÄ?¥Ïä§)
      const orphanDls = ((dls ?? []) as unknown as DlRaw[])
        .filter(d => d.user_id && d.dataset_id && !matchedDlKeys.has(`${d.user_id}:${d.dataset_id}`))
        .map(d => ({
          datetime: d.downloaded_at,
          organization: (d.profiles as { email: string; organization: string | null } | null)?.organization ?? "-",
          email: maskEmail((d.profiles as { email: string; organization: string | null } | null)?.email),
          feature: "?§Ïö¥Î°úÎìú",
          fileName: d.datasets?.title ?? undefined,
          downloaded: true,
          appStatus: undefined,
        }));

      const combined = [
        ...((logs ?? []) as unknown as LogRaw[]).map(l => ({
          datetime: l.created_at,
          organization: l.organization ?? "-",
          email: maskEmail(l.user_email),
          feature: "?∞Ïù¥??Î∂ÑÏÑù",
          fileName: l.file_name ?? undefined,
          downloaded: false,
          appStatus: undefined,
        })),
        ...appCombined,
        ...orphanDls,
      ].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

      setActivityRows(combined.map((row, i) => ({ no: i + 1, ...row })));
    }

    if (t === 6) {
      const { data } = await supabase
        .from("access_requests")
        .select("id, created_at, status, reason, user_id, profiles(name, email, organization)")
        .order("created_at", { ascending: false });
      setAccessRows((data as unknown as AccessRequestRow[]) ?? []);
    }

    setLoading(false);
  }, []);

  // ?Ä?Ä Í¥ÄÎ¶¨Ïûê Í∂åÌïú Ï≤¥ÌÅ¨ (ÎπÑÍ?Î¶¨Ïûê???àÏúºÎ°?Î¶¨Îã§?¥Î†â?? ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.replace("/"); return; }
      setAuthorized(true);
      fetchSummary();
      fetchTab(0);
    })();
  }, [router, fetchSummary, fetchTab]);

  if (!authorized) return (
    <div className="min-h-screen flex items-center justify-center text-neutral-400 text-sm">
      ?ïÏù∏ Ï§?..
    </div>
  );

  // ?Ä?Ä ???ÑÌôò ???∞Ïù¥??Î°úÎìú ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  const handleTabChange = (t: number) => {
    setTab(t);
    fetchTab(t);
  };

  // ?Ä?Ä ?∞Ïù¥?∞ÏÖã ÎπÑÌôú?±Ìôî (?åÌîÑ????†ú) ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  const deactivateDataset = async (id: string) => {
    const supabase = createClient();
    await supabase.from("datasets").update({ is_active: false }).eq("id", id);
    setDatasetRows((prev) => prev.filter((d) => d.id !== id));
    fetchSummary();
  };

  // ?Ä?Ä ?∞Ïù¥???†Ï≤≠ ?πÏù∏/Î∞òÎ†§ ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  const handleApplication = async (id: string, approve: boolean) => {
    const supabase = createClient();
    const status = approve ? "approved" : "rejected";
    await supabase.from("applications").update({ status }).eq("id", id);
    setAppRows((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
  };

  // ?Ä?Ä ÏßÄ???ÖÏ≤¥ ?ëÍ∑º Í∂åÌïú ?πÏù∏/Í±∞Ï†à ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  const handleAccessRequest = async (requestId: string, userId: string, approve: boolean) => {
    const supabase = createClient();
    const newStatus = approve ? "approved" : "rejected";
    await supabase.from("access_requests").update({ status: newStatus }).eq("id", requestId);
    if (approve) {
      await supabase.from("profiles").update({ local_data_approved: true }).eq("id", userId);
    }
    setAccessRows(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
  };

  // ?Ä?Ä Í≤∞Í≥ºÎ¨??§Ïö¥Î°úÎìú ?úÎ™Ö URL ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
  const downloadResult = async (filePath: string) => {
    const supabase = createClient();
    const { data } = await supabase.storage.from("results").createSignedUrl(filePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Í¥ÄÎ¶¨Ïûê ?§Îçî */}
      <header className="bg-neutral-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Database size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-base">?∞Ïù¥?∞Í±∞Î≤ÑÎÑå?§ÏÑº??/span>
            <span className="ml-2 text-xs bg-brand-600 px-2 py-0.5 rounded-full">Í¥ÄÎ¶¨Ïûê</span>
          </div>
        </div>
        <Link href="/" className="text-xs text-neutral-400 hover:text-white transition-colors">???¨Ïù¥?∏Î°ú ?åÏïÑÍ∞ÄÍ∏?/Link>
      </header>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">

        {/* ?îÏïΩ Ïπ¥Îìú */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "?ÑÏ≤¥ ?∞Ïù¥?∞ÏÖã",  value: summary.datasets,     icon: Database,   color: "text-brand-600 bg-brand-50" },
            { label: "Ï¥??†Ï≤≠ Í±¥Ïàò",   value: summary.applications, icon: FileText,   color: "text-blue-600 bg-blue-50" },
            { label: "Ï¥??§Ïö¥Î°úÎìú",    value: summary.downloads,    icon: Download,   color: "text-emerald-600 bg-emerald-50" },
            { label: "Í≤∞Í≥ºÎ¨??úÏ∂ú",    value: summary.submissions,  icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-neutral-100 p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-neutral-900">{value.toLocaleString()}</p>
              <p className="text-xs text-neutral-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ??*/}
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-6 overflow-x-auto">
          {ADMIN_TABS.map((t, i) => (
            <button key={t} onClick={() => handleTabChange(i)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                ${tab === i ? "bg-white text-brand-700 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Î°úÎî© */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-brand-400" />
          </div>
        )}

        {/* ?Ä?Ä Tab 0: ?§Ï†Å ?ÑÌô© ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */}
        {!loading && tab === 0 && (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900">?∞Ïù¥?∞ÏÖãÎ≥??úÏö© ?§Ï†Å</h3>
            </div>
            {utilRows.length === 0 ? <EmptyState icon={BarChart2} text="?∞Ïù¥?∞Í? ?ÜÏäµ?àÎã§." /> : (
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-100">
                  <tr>
                    {["?∞Ïù¥?∞ÏÖã", "Ïπ¥ÌÖåÍ≥†Î¶¨", "?†Ï≤≠", "?§Ïö¥Î°úÎìú", "Í≤∞Í≥ºÎ¨??úÏ∂ú"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {utilRows.map(u => (
                    <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-neutral-900">{u.title}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{u.category}</td>
                      <td className="px-5 py-4 text-sm text-neutral-700">{u.applications}</td>
                      <td className="px-5 py-4 text-sm text-neutral-700">{u.downloads}</td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-brand-600">{u.submissions}</span>
                        <span className="text-xs text-neutral-400 ml-1">Í±?/span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ?Ä?Ä Tab 1: ?†Ï≤≠??Î™©Î°ù ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */}
        {!loading && tab === 1 && (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900">?ÑÏ≤¥ ?†Ï≤≠??Î™©Î°ù</h3>
            </div>
            {appRows.length === 0 ? <EmptyState icon={FileText} text="?†Ï≤≠ ?¥Ïó≠???ÜÏäµ?àÎã§." /> : (
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-100">
                  <tr>
                    {["?†Ï≤≠??, "?¥Î©î??, "?åÏÜç", "?∞Ïù¥?∞ÏÖã", "?úÏö©Î∂ÑÏïº", "?†Ï≤≠??, "Ï≤òÎ¶¨"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {appRows.map(a => (
                    <tr key={a.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-neutral-900">{a.profiles?.name ?? "-"}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{a.profiles?.email ?? "-"}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{a.institution}</td>
                      <td className="px-5 py-4 text-sm text-neutral-700 max-w-[180px] truncate">{a.datasets?.title ?? "-"}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{a.field}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{fmtDate(a.created_at)}</td>
                      <td className="px-5 py-4">
                        {a.status === "approved" ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full w-fit">
                            <CheckCircle size={10} /> ?πÏù∏??                          </span>
                        ) : a.status === "rejected" ? (
                          <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full w-fit block">Î∞òÎ†§??/span>
                        ) : (
                          <div className="flex gap-1.5">
                            <button onClick={() => handleApplication(a.id, true)}
                              className="px-2.5 py-1 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors">
                              ?πÏù∏
                            </button>
                            <button onClick={() => handleApplication(a.id, false)}
                              className="px-2.5 py-1 text-xs font-semibold bg-neutral-100 hover:bg-red-50 text-neutral-600 hover:text-red-600 rounded-lg transition-colors">
                              Î∞òÎ†§
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ?Ä?Ä Tab 2: Í≤∞Í≥ºÎ¨?Í≤Ä???Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */}
        {!loading && tab === 2 && (
          <div className="space-y-4">
            {resultRows.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
                <EmptyState icon={Upload} text="?úÏ∂ú??Í≤∞Í≥ºÎ¨ºÏù¥ ?ÜÏäµ?àÎã§." />
              </div>
            ) : resultRows.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-neutral-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-neutral-400">{r.id.slice(0, 8)}...</span>
                      <span className="text-xs text-neutral-500">{fmtDate(r.created_at)}</span>
                    </div>
                    <p className="font-semibold text-neutral-900 text-sm">
                      {r.profiles?.name ?? "-"} ??{r.datasets?.title ?? "-"}
                    </p>
                    <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{r.summary}</p>
                    {r.file_path && (
                      <div className="mt-3 flex items-center gap-2">
                        <FileText size={13} className="text-brand-500" />
                        <span className="text-xs text-brand-600 font-medium">{r.file_name ?? r.file_path}</span>
                        <button
                          onClick={() => r.file_path && downloadResult(r.file_path)}
                          className="text-xs text-neutral-400 hover:text-neutral-600 underline"
                        >
                          ?§Ïö¥Î°úÎìú
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold flex-shrink-0">
                    <CheckCircle size={11} /> ?ëÏàò??                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ?Ä?Ä Tab 3: ?∞Ïù¥??Í¥ÄÎ¶??Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */}
        {!loading && tab === 3 && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors active:scale-95"
              >
                <Plus size={16} /> ?∞Ïù¥?∞ÏÖã ?±Î°ù
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
              {datasetRows.length === 0 ? <EmptyState icon={Database} text="?±Î°ù???∞Ïù¥?∞ÏÖã???ÜÏäµ?àÎã§." /> : (
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b border-neutral-100">
                    <tr>
                      {["?∞Ïù¥?∞ÏÖã", "Ïπ¥ÌÖåÍ≥†Î¶¨", "?∞ÎèÑ", "?åÏùº ?¨Í∏∞", "?±Î°ù??, "Í¥ÄÎ¶?].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {datasetRows.map(d => (
                      <tr key={d.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-neutral-900">{d.title}</td>
                        <td className="px-5 py-4 text-xs text-neutral-500">{d.category}</td>
                        <td className="px-5 py-4 text-xs text-neutral-500">{d.year}</td>
                        <td className="px-5 py-4 text-xs text-neutral-500">{fmtBytes(d.file_size)}</td>
                        <td className="px-5 py-4 text-xs text-neutral-500">
                          {new Date(d.created_at).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => deactivateDataset(d.id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 size={12} /> ??†ú
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ?Ä?Ä Tab 4: ?åÏõê Í¥ÄÎ¶??Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */}
        {!loading && tab === 4 && (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100">
              <h3 className="font-semibold text-neutral-900">Í∞Ä???åÏõê Î™©Î°ù ({memberRows.length}Î™?</h3>
            </div>
            {memberRows.length === 0 ? <EmptyState icon={FileText} text="Í∞Ä???åÏõê???ÜÏäµ?àÎã§." /> : (
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-100">
                  <tr>
                    {["?¥Î¶Ñ", "?¥Î©î??, "Í∂åÌïú", "Í∞Ä?ÖÏùº", "?†Ï≤≠ Í±¥Ïàò"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {memberRows.map(m => (
                    <tr key={m.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-neutral-900">{m.name}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{m.email}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${m.role === "admin" ? "bg-red-50 text-red-700" : "bg-neutral-100 text-neutral-500"}`}>
                          {m.role === "admin" ? "Í¥ÄÎ¶¨Ïûê" : "?ºÎ∞ò"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-neutral-500">
                        {new Date(m.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-700">{m.applicationCount}Í±?/td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {/* ?Ä?Ä Tab 5: ?¥Ïö© ?ÑÌô© (Î∂ÑÏÑù + ?†Ï≤≠ + ?§Ïö¥Î°úÎìú ?µÌï©) ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */}
        {!loading && tab === 5 && (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900 text-sm">?¥Ïö© ?ÑÌô© Î°úÍ∑∏ ({activityRows.length}Í±?</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">?∞Ïù¥??Î∂ÑÏÑù ¬∑ ?∞Ïù¥???†Ï≤≠ ¬∑ ?§Ïö¥Î°úÎìú ?µÌï©</span>
                <button onClick={exportActivityExcel} disabled={activityRows.length === 0}
                  className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
                  <Download size={12} /> ?ëÏ? ?¥Î≥¥?¥Í∏∞
                </button>
              </div>
            </div>
            {activityRows.length === 0 ? <EmptyState icon={BarChart2} text="?¥Ïö© Í∏∞Î°ù???ÜÏäµ?àÎã§." /> : (() => {
              const totalPages = Math.ceil(activityRows.length / ACTIVITY_PER_PAGE);
              const pageRows = activityRows.slice((activityPage - 1) * ACTIVITY_PER_PAGE, activityPage * ACTIVITY_PER_PAGE);
              return (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-neutral-50 border-b border-neutral-100">
                        <tr>
                          {["Î≤àÌò∏", "?ºÏãú", "?åÏÜç", "?ÑÏù¥???¥Î©î??", "?¥Ïö©Í∏∞Îä•", "?åÏùºÎ™?].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-neutral-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {pageRows.map(row => (
                          <tr key={row.no} className="hover:bg-neutral-50">
                            <td className="px-3 py-1.5 text-neutral-400 tabular-nums w-10">{row.no}</td>
                            <td className="px-3 py-1.5 text-neutral-600 whitespace-nowrap">
                              {new Date(row.datetime).toLocaleString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-3 py-1.5 text-neutral-700 max-w-[120px] truncate">{row.organization}</td>
                            <td className="px-3 py-1.5 font-medium text-neutral-700 font-mono">{row.email}</td>
                            <td className="px-3 py-1.5">
                              {row.feature === "?†Ï≤≠+?§Ïö¥Î°úÎìú" ? (
                                <div className="flex items-center gap-1">
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">?†Ï≤≠</span>
                                  <span className="text-neutral-300 text-[10px]">??/span>
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">?§Ïö¥Î°úÎìú</span>
                                </div>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-full font-medium ${
                                  row.feature === "?∞Ïù¥??Î∂ÑÏÑù"
                                    ? "bg-brand-50 text-brand-700"
                                    : row.feature === "?∞Ïù¥???†Ï≤≠"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}>
                                  {row.feature}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-neutral-500 max-w-[160px]">
                              {row.fileName
                                ? <span title={row.fileName}>{row.fileName.length > 20 ? row.fileName.slice(0, 18) + "?? : row.fileName}</span>
                                : <span className="text-neutral-300">-</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-neutral-100">
                      <button onClick={() => setActivityPage(p => Math.max(1, p - 1))} disabled={activityPage === 1}
                        className="px-2.5 py-1 text-xs rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition-colors">
                        ???¥Ï†Ñ
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setActivityPage(p)}
                          className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                            p === activityPage ? "bg-brand-600 text-white" : "text-neutral-500 hover:bg-neutral-100"
                          }`}>
                          {p}
                        </button>
                      ))}
                      <button onClick={() => setActivityPage(p => Math.min(totalPages, p + 1))} disabled={activityPage === totalPages}
                        className="px-2.5 py-1 text-xs rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition-colors">
                        ?§Ïùå ??                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ?Ä?Ä Tab 6: ?ëÍ∑º Í∂åÌïú Í¥ÄÎ¶??Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */}
        {!loading && tab === 6 && (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
              <Lock size={15} className="text-orange-500" />
              <h3 className="font-semibold text-neutral-900">ÏßÄ???ÖÏ≤¥ ?∞Ïù¥???ëÍ∑º Í∂åÌïú ?†Ï≤≠ ({accessRows.length}Í±?</h3>
            </div>
            {accessRows.length === 0 ? (
              <EmptyState icon={Lock} text="?ëÍ∑º Í∂åÌïú ?†Ï≤≠???ÜÏäµ?àÎã§." />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-100">
                  <tr>
                    {["?†Ï≤≠??, "?¥Î¶Ñ", "?¥Î©î??, "?åÏÜçÍ∏∞Í?", "?†Ï≤≠ ?¨Ïú†", "?ÅÌÉú", "Ï≤òÎ¶¨"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {accessRows.map(r => {
                    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                    const isPending = r.status === "pending";
                    return (
                      <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-5 py-3 text-xs text-neutral-500 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-neutral-900">{profile?.name ?? "-"}</td>
                        <td className="px-5 py-3 text-xs text-neutral-500">{profile?.email ?? "-"}</td>
                        <td className="px-5 py-3 text-xs text-neutral-500">{profile?.organization ?? "-"}</td>
                        <td className="px-5 py-3 text-xs text-neutral-600 max-w-[200px]">
                          <p className="truncate" title={r.reason}>{r.reason || "-"}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            r.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                            r.status === "rejected" ? "bg-red-50 text-red-600" :
                            "bg-amber-50 text-amber-700"
                          }`}>
                            {r.status === "approved" ? "?πÏù∏?? : r.status === "rejected" ? "Í±∞Ï†à?? : "?ÄÍ∏∞Ï§ë"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {isPending ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAccessRequest(r.id, r.user_id, true)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                              >
                                ?πÏù∏
                              </button>
                              <button
                                onClick={() => handleAccessRequest(r.id, r.user_id, false)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold transition-colors"
                              >
                                Í±∞Ï†à
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-300">Ï≤òÎ¶¨?ÑÎ£å</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ?∞Ïù¥?∞ÏÖã ?±Î°ù Î™®Îã¨ */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            fetchSummary();
            if (tab === 3) fetchTab(3);
          }}
        />
      )}
    </div>
  );
}

// ?Ä?Ä Îπ??ÅÌÉú Ïª¥Ìè¨?åÌä∏ ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="py-20 text-center text-neutral-400">
      <Icon size={36} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
