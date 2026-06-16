"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Trash2, Pencil, Loader2 } from "lucide-react";

const BOARDS = [
  { type: "free",     label: "자유게시판" },
  { type: "feedback", label: "요구 및 개선사항" },
];

interface Post {
  id: string; created_at: string; title: string;
  content: string; author_name: string; views: number; user_id: string | null;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const type   = params.type as string;
  const id     = params.id as string;

  const [post,          setPost]          = useState<Post | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [deleting,      setDeleting]      = useState(false);

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
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
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

        {/* 모바일 상단 탭 */}
        <div className="md:hidden max-w-6xl mx-auto px-4 pt-6">
          <div className="flex bg-white rounded-xl border border-neutral-100 overflow-hidden">
            {BOARDS.map(b => (
              <Link key={b.type} href={`/board/${b.type}`}
                className={`flex-1 text-center py-3 text-sm font-medium transition-colors ${
                  type === b.type ? "bg-brand-600 text-white" : "text-neutral-600 hover:bg-neutral-50"
                }`}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 flex flex-col md:flex-row gap-6 items-start">

          {/* 왼쪽 사이드바 (데스크탑) */}
          <aside className="hidden md:block w-44 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden sticky top-24">
              <div className="bg-brand-600 px-4 py-3">
                <p className="text-white font-bold text-sm">게시판</p>
              </div>
              <nav className="py-1.5">
                {BOARDS.map(b => (
                  <Link key={b.type} href={`/board/${b.type}`}
                    className={`flex items-center px-4 py-2.5 text-sm transition-colors ${
                      type === b.type
                        ? "text-brand-700 font-semibold bg-brand-50 border-l-2 border-brand-500"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-brand-600"
                    }`}>
                    {b.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          {/* 오른쪽 본문 */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 size={24} className="animate-spin text-brand-400" />
              </div>
            ) : post ? (
              <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
                <div className="px-5 md:px-7 py-5 border-b border-neutral-100">
                  <h2 className="text-lg font-bold text-neutral-900 mb-3">{post.title}</h2>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 text-xs text-neutral-400">
                      <span>{post.author_name[0]}**</span>
                      <span>·</span>
                      <span>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span>
                      <span>·</span>
                      <span>조회 {post.views}</span>
                    </div>
                    {canDelete && (
                      <div className="flex items-center gap-1.5">
                        <Link href={`/board/${type}/${id}/edit`}
                          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-brand-600 hover:bg-brand-50 px-2.5 py-1.5 rounded-lg transition-colors">
                          <Pencil size={11} /> 수정
                        </Link>
                        <button onClick={handleDelete} disabled={deleting}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                          {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {/* 본문 */}
                <div className="px-5 md:px-7 py-8 min-h-[240px]">
                  <div
                    className="text-sm text-neutral-800 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_s]:line-through"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <Link href={`/board/${type}`}
                className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-600 transition-colors">
                <ChevronLeft size={14} /> 목록으로
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
