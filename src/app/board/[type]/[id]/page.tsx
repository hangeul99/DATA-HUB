"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import { ChevronLeft, Trash2, Pencil, Loader2, Download, Send } from "lucide-react";

const BOARDS = [
  { type: "free",      label: "자유게시판" },
  { type: "feedback",  label: "요구 및 개선사항" },
  { type: "resources", label: "자료 게시판" },
];

interface Post {
  id: string; created_at: string; title: string;
  content: string; author_name: string; views: number; user_id: string | null;
  attachment_path?: string | null; attachment_name?: string | null;
}

interface Comment {
  id: string; created_at: string; content: string;
  author_name: string; user_id: string;
}

const maskName = (name: string) => `${name[0]}**`;

const AdminBadge = () => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-600 text-white leading-none">
    관리자
  </span>
);

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
  const [deleteError,   setDeleteError]   = useState<string | null>(null);

  const [comments,      setComments]      = useState<Comment[]>([]);
  const [commentInput,  setCommentInput]  = useState("");
  const [commentSubmit, setCommentSubmit] = useState(false);
  const [authorName,    setAuthorName]    = useState("");

  const loadComments = async () => {
    const { data } = await createClient()
      .from("comments").select("*").eq("post_id", id).eq("is_active", true)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) ?? []);
  };

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
        const { data: profile } = await supabase.from("profiles").select("role, name").eq("id", user.id).single();
        const admin = profile?.role === "admin";
        setIsAdmin(admin);
        setAuthorName(admin ? "관리자" : (profile?.name ?? user.email?.split("@")[0] ?? "익명"));
      }
      await loadComments();
      setLoading(false);
    });
  }, [id, type, router]);

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    if (!currentUserId) { router.push("/login"); return; }
    setCommentSubmit(true);
    const { error: err } = await createClient().from("comments").insert({
      post_id: id,
      user_id: currentUserId,
      author_name: authorName,
      content: commentInput.trim(),
    });
    if (!err) {
      setCommentInput("");
      await loadComments();
    }
    setCommentSubmit(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    await createClient().from("comments").update({ is_active: false }).eq("id", commentId);
    await loadComments();
  };

  const handleDelete = async () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    setDeleting(true);
    setDeleteError(null);
    const { error: err } = await createClient().from("posts").update({ is_active: false }).eq("id", id);
    if (err) {
      setDeleteError(`삭제 실패: ${err.message}`);
      setDeleting(false);
      return;
    }
    router.replace(`/board/${type}`);
  };

  const canDelete = post && currentUserId && (currentUserId === post.user_id || isAdmin);

  const handleDownload = async () => {
    if (!post?.attachment_path || !post?.attachment_name) return;
    const { data } = createClient().storage
      .from("post-attachments")
      .getPublicUrl(post.attachment_path);
    if (!data?.publicUrl) return;
    const res  = await fetch(data.publicUrl);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = post.attachment_name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-20">

        {/* 모바일 상단 탭 */}
        <div className="md:hidden px-4 pt-6">
          <div className="flex bg-white rounded-xl border border-neutral-100 overflow-hidden">
            {BOARDS.map(b => (
              <Link key={b.type} href={`/board/${b.type}`}
                // 모바일에서 긴 라벨이 줄바꿈되지 않도록 글자 축소 + truncate
                className={`flex-1 text-center py-2.5 text-[11px] sm:text-xs font-medium truncate transition-colors ${
                  type === b.type ? "bg-brand-600 text-white" : "text-neutral-600 hover:bg-neutral-50"
                }`}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="w-full px-4 md:px-10 lg:px-16 py-6 md:py-10 flex flex-col md:flex-row gap-6 items-start">

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
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      {post.author_name === "관리자" ? <AdminBadge /> : <span>{maskName(post.author_name)}</span>}
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
                  {deleteError && <p className="text-xs text-red-500 mt-2">{deleteError}</p>}
                </div>

                {/* 본문 */}
                <div className="px-5 md:px-7 py-8 min-h-[240px]">
                  {/* 본문 HTML은 표시 직전 sanitizeHtml로 소독해 XSS(악성 스크립트) 차단 */}
                  <div
                    className="text-sm text-neutral-800 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_s]:line-through"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
                  />
                </div>

                {/* 첨부파일 다운로드 */}
                {post.attachment_path && post.attachment_name && (
                  <div className="px-5 md:px-7 py-4 border-t border-neutral-100">
                    <p className="text-xs text-neutral-400 mb-2">첨부파일</p>
                    <button onClick={handleDownload}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-sm font-medium transition-colors active:scale-95">
                      <Download size={14} />
                      {post.attachment_name}
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* 댓글 */}
            {post && (
              <div className="bg-white rounded-2xl border border-neutral-100 mt-4 px-5 md:px-7 py-6">
                <p className="text-sm font-bold text-neutral-800 mb-4">댓글 {comments.length}</p>

                <div className="space-y-3 mb-5">
                  {comments.length === 0 ? (
                    <p className="text-sm text-neutral-400 py-4 text-center">첫 댓글을 남겨보세요.</p>
                  ) : comments.map(c => (
                    <div key={c.id} className="flex items-start justify-between gap-3 py-2.5 border-b border-neutral-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {c.author_name === "관리자"
                            ? <AdminBadge />
                            : <span className="text-xs font-semibold text-neutral-600">{maskName(c.author_name)}</span>
                          }
                          <span className="text-[11px] text-neutral-400">
                            {new Date(c.created_at).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-800 whitespace-pre-wrap break-words">{c.content}</p>
                      </div>
                      {(currentUserId === c.user_id || isAdmin) && (
                        <button onClick={() => handleDeleteComment(c.id)}
                          className="text-neutral-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddComment()}
                    placeholder={currentUserId ? "댓글을 입력하세요." : "로그인 후 댓글을 작성할 수 있습니다."}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <button onClick={handleAddComment} disabled={commentSubmit || !commentInput.trim()}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 active:scale-95">
                    {commentSubmit ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            )}

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
