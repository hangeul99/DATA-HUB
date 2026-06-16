"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Trash2, Loader2 } from "lucide-react";

const BOARD_LABELS: Record<string, string> = {
  free: "자유게시판",
  feedback: "요구 및 개선사항",
};

interface Post {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string;
  views: number;
  user_id: string | null;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const id = params.id as string;
  const label = BOARD_LABELS[type] ?? "게시판";

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("posts").select("*").eq("id", id).eq("is_active", true).single(),
      supabase.auth.getUser(),
    ]).then(async ([{ data: postData }, { data: { user } }]) => {
      if (!postData) { router.replace(`/board/${type}`); return; }
      setPost(postData as Post);
      await supabase.from("posts").update({ views: postData.views + 1 }).eq("id", id);

      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles").select("role").eq("id", user.id).single();
        setIsAdmin(profile?.role === "admin");
      }
      setLoading(false);
    });
  }, [id, type, router]);

  const handleDelete = async () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    setDeleting(true);
    await createClient().from("posts").update({ is_active: false }).eq("id", id);
    router.replace(`/board/${type}`);
  };

  const canDelete = post && currentUserId && (currentUserId === post.user_id || isAdmin);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-16">
        <div className="bg-white border-b border-neutral-100">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <Link href={`/board/${type}`}
              className="text-xs text-neutral-400 hover:text-brand-600 mb-3 inline-flex items-center gap-1 transition-colors">
              <ChevronLeft size={12} /> {label}
            </Link>
            <p className="text-brand-600 font-semibold text-sm uppercase tracking-widest mb-3">Board</p>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">{label}</h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={24} className="animate-spin text-brand-400" />
            </div>
          ) : post ? (
            <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
              <div className="px-7 py-6 border-b border-neutral-100">
                <h2 className="text-xl font-bold text-neutral-900 mb-3">{post.title}</h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    <span>{post.author_name}</span>
                    <span>·</span>
                    <span>{new Date(post.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span>
                    <span>·</span>
                    <span>조회 {post.views}</span>
                  </div>
                  {canDelete && (
                    <button onClick={handleDelete} disabled={deleting}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                      {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      삭제
                    </button>
                  )}
                </div>
              </div>
              <div className="px-7 py-8 min-h-[200px]">
                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <Link href={`/board/${type}`}
              className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-600 transition-colors">
              <ChevronLeft size={14} /> 목록으로
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
