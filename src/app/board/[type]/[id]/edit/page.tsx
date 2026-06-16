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

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const type   = params.type as string;
  const id     = params.id as string;
  const label  = BOARD_LABELS[type];

  const [title,      setTitle]      = useState("");
  const [content,    setContent]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!label) { router.replace("/board"); return; }
    const supabase = createClient();
    Promise.all([
      supabase.from("posts").select("*").eq("id", id).eq("is_active", true).single(),
      supabase.auth.getUser(),
    ]).then(async ([{ data: post }, { data: { user } }]) => {
      if (!post || !user) { router.replace(`/board/${type}`); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      const isAdmin = profile?.role === "admin";
      if (post.user_id !== user.id && !isAdmin) {
        router.replace(`/board/${type}/${id}`);
        return;
      }
      setTitle(post.title);
      setContent(post.content);
      setLoading(false);
    });
  }, [id, type, label, router]);

  const handleSubmit = async () => {
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    const textOnly = content.replace(/<[^>]*>/g, "").trim();
    if (!textOnly) { setError("내용을 입력해주세요."); return; }
    setSubmitting(true);
    setError(null);

    const { error: err } = await createClient()
      .from("posts")
      .update({ title: title.trim(), content })
      .eq("id", id);

    if (err) { setError("수정에 실패했습니다."); setSubmitting(false); return; }
    router.replace(`/board/${type}/${id}`);
  };

  if (loading) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-20">
        <div className="bg-white border-b border-neutral-100">
          <div className="max-w-4xl mx-auto px-6 py-10">
            <Link href={`/board/${type}/${id}`}
              className="text-xs text-neutral-400 hover:text-brand-600 mb-3 inline-flex items-center gap-1 transition-colors">
              <ChevronLeft size={12} /> 게시글로 돌아가기
            </Link>
            <h1 className="text-2xl font-bold text-neutral-900">글 수정</h1>
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
              <Link href={`/board/${type}/${id}`}
                className="flex-1 py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-medium text-neutral-700 transition-colors text-center">
                취소
              </Link>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 active:scale-95">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? "저장 중..." : "수정 완료"}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
