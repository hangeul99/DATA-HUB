"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Loader2 } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

const BOARD_LABELS: Record<string, string> = {
  free: "자유게시판",
  feedback: "요구 및 개선사항",
};

export default function WritePostPage() {
  const params = useParams();
  const router = useRouter();
  const type   = params.type as string;
  const label  = BOARD_LABELS[type];

  const [title,       setTitle]       = useState("");
  const [content,     setContent]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!label) { router.replace("/board"); return; }
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
      else setAuthChecked(true);
    });
  }, [label, router]);

  const handleSubmit = async () => {
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    const textOnly = content.replace(/<[^>]*>/g, "").trim();
    if (!textOnly) { setError("내용을 입력해주세요."); return; }
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles").select("name").eq("id", user.id).single();

    const { data: post, error: err } = await supabase.from("posts").insert({
      board_type: type,
      title: title.trim(),
      content,
      user_id: user.id,
      author_name: profile?.name ?? user.email?.split("@")[0] ?? "익명",
    }).select("id").single();

    if (err || !post) { setError("글 등록에 실패했습니다."); setSubmitting(false); return; }
    router.replace(`/board/${type}/${post.id}`);
  };

  if (!authChecked) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-20">
        <div className="bg-white border-b border-neutral-100">
          <div className="max-w-4xl mx-auto px-6 py-10">
            <Link href={`/board/${type}`}
              className="text-xs text-neutral-400 hover:text-brand-600 mb-3 inline-flex items-center gap-1 transition-colors">
              <ChevronLeft size={12} /> {label}
            </Link>
            <h1 className="text-2xl font-bold text-neutral-900">글쓰기</h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 md:p-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">제목</label>
                <input
                  type="text" placeholder="제목을 입력하세요." value={title}
                  onChange={e => { setTitle(e.target.value); setError(null); }}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">내용</label>
                <RichTextEditor
                  value={content}
                  onChange={v => { setContent(v); setError(null); }}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <Link href={`/board/${type}`}
                className="flex-1 py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-medium text-neutral-700 transition-colors text-center">
                취소
              </Link>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 active:scale-95">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
