"use client";

/* ============================================================
   게시글 보기 (/board/[type]/[id]) — 시안 v9

   왼쪽 메뉴(BoardShell) + 오른쪽: 제목·작성자·날짜·조회 → 본문 → 첨부파일 상자 → 댓글
   기능은 그대로: 조회수 증가, 본인·관리자만 수정·삭제, 첨부는 로그인 없이 받고 기록 남김, 댓글은 회원만
============================================================ */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sanitizeHtml } from "@/lib/sanitize";
import { ChevronLeft, Trash2, Pencil, Loader2, Download, Send, FileText } from "lucide-react";
import BoardShell, { BOARD_LABELS, maskName, fmtDate, AdminBadge } from "@/components/board/BoardShell";

interface Post {
  id: string; created_at: string; title: string;
  content: string; author_name: string; views: number; user_id: string | null;
  attachment_path?: string | null; attachment_name?: string | null;
}
interface Comment { id: string; created_at: string; content: string; author_name: string; user_id: string }

// 비로그인 사용자 식별 ID — localStorage에 저장해 같은 브라우저면 동일한 번호 유지
function getGuestId(): string {
  const key = "dh_guest_id";
  let id = localStorage.getItem(key);
  if (!id) { id = String(Math.floor(1000 + Math.random() * 9000)); localStorage.setItem(key, id); }
  return id;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const id = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentSubmit, setCommentSubmit] = useState(false);
  const [authorName, setAuthorName] = useState("");

  const loadComments = async () => {
    const { data } = await createClient().from("comments").select("*").eq("post_id", id).eq("is_active", true).order("created_at", { ascending: true });
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
      await supabase.rpc("increment_post_views", { post_id: id });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type, router]);

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    if (!currentUserId) { router.push("/login"); return; }
    setCommentSubmit(true);
    const { error: err } = await createClient().from("comments").insert({ post_id: id, user_id: currentUserId, author_name: authorName, content: commentInput.trim() });
    if (!err) { setCommentInput(""); await loadComments(); }
    setCommentSubmit(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    await createClient().from("comments").update({ is_active: false }).eq("id", commentId);
    await loadComments();
  };

  const handleDelete = async () => {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;
    setDeleting(true); setDeleteError(null);
    const { error: err } = await createClient().from("posts").update({ is_active: false }).eq("id", id);
    if (err) { setDeleteError(`삭제 실패: ${err.message}`); setDeleting(false); return; }
    router.replace(`/board/${type}`);
  };

  const canEdit = post && currentUserId && (currentUserId === post.user_id || isAdmin);

  const handleDownload = async () => {
    if (!post?.attachment_path || !post?.attachment_name) return;
    setDownloadError(null);
    const supabase = createClient();
    const { data } = supabase.storage.from("post-attachments").getPublicUrl(post.attachment_path);
    if (!data?.publicUrl) return;
    try {
      const res = await fetch(data.publicUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = post.attachment_name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch {
      setDownloadError("파일을 내려받지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    // 비로그인 포함 다운로드 기록
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("board_download_logs").insert({
        post_id: post.id, post_title: post.title, file_name: post.attachment_name, board_type: type,
        user_id: user?.id ?? null, user_email: user?.email ?? `게스트-${getGuestId()}`,
      });
    } catch { /* 기록 실패는 다운로드에 영향 없음 */ }
  };

  return (
    <BoardShell type={type}>
      <Link href={`/board/${type}`} className="mb-3.5 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
        <ChevronLeft size={15} aria-hidden="true" /> {BOARD_LABELS[type] ?? "게시판"} 목록
      </Link>

      {loading ? (
        <div className="flex justify-center rounded-[20px] border border-neutral-200 bg-white py-20"><Loader2 size={24} className="animate-spin text-brand-400" /></div>
      ) : post ? (
        <article className="rounded-[20px] border border-neutral-200 bg-white px-5 py-6 sm:px-8 sm:py-8">
          <h2 className="text-[24px] font-extrabold leading-[1.3] tracking-[-.02em] text-neutral-900 sm:text-[26px]">{post.title}</h2>
          <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-4">
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-neutral-500 tabular-nums">
              {post.author_name === "관리자" ? <AdminBadge /> : <span className="font-semibold text-neutral-700">{maskName(post.author_name)}</span>}
              <span>{fmtDate(post.created_at)}</span>
              <span>조회 {post.views}</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <Link href={`/board/${type}/${id}/edit`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"><Pencil size={13} /> 수정</Link>
                <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50">
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} 삭제
                </button>
              </div>
            )}
          </div>
          {deleteError && <p className="mb-4 text-sm text-red-600">{deleteError}</p>}

          {/* 본문 — 표시 직전 sanitizeHtml 로 소독해 악성 스크립트 차단 */}
          <div className="min-h-[160px] max-w-[72ch] text-[16px] leading-[1.8] text-neutral-800 [&_b]:font-bold [&_em]:italic [&_i]:italic [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_s]:line-through [&_strong]:font-bold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }} />

          {/* 첨부파일 */}
          {post.attachment_path && post.attachment_name && (
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[14px] border border-neutral-200 bg-neutral-50 px-4 py-3.5">
              <FileText size={22} className="flex-none text-neutral-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold text-neutral-900">{post.attachment_name}</p>
                <p className="text-[12.5px] text-neutral-500">첨부파일 · 로그인 없이 받을 수 있습니다</p>
              </div>
              <button type="button" onClick={handleDownload} className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-500 px-4 text-[13px] font-bold text-white hover:bg-brand-600"><Download size={14} /> 내려받기</button>
              {downloadError && <p className="w-full text-sm text-red-600">{downloadError}</p>}
            </div>
          )}

          {/* 댓글 */}
          <section className="mt-7 border-t border-neutral-200 pt-6" aria-labelledby="cmt-title">
            <h3 id="cmt-title" className="mb-3 text-base font-extrabold text-neutral-900">댓글 {comments.length}</h3>
            <div className="mb-4 space-y-1">
              {comments.length === 0 ? (
                <p className="py-3 text-sm text-neutral-500">아직 댓글이 없습니다.</p>
              ) : comments.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-3 border-b border-neutral-100 py-3 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2 text-[13px] text-neutral-500">
                      {c.author_name === "관리자" ? <AdminBadge /> : <span className="font-semibold text-neutral-700">{maskName(c.author_name)}</span>}
                      <span className="tabular-nums">{fmtDate(c.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[15px] text-neutral-800">{c.content}</p>
                  </div>
                  {(currentUserId === c.user_id || isAdmin) && (
                    <button type="button" onClick={() => handleDeleteComment(c.id)} aria-label="댓글 삭제" className="mt-0.5 flex-none text-neutral-400 hover:text-red-600"><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
            </div>
            {currentUserId ? (
              <div className="flex gap-2">
                <label htmlFor="cmt-input" className="sr-only">댓글 입력</label>
                <input id="cmt-input" type="text" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder="댓글을 입력하세요" className="h-11 flex-1 rounded-[12px] border border-neutral-200 px-4 text-[15px] outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-100" />
                <button type="button" onClick={handleAddComment} disabled={commentSubmit || !commentInput.trim()} aria-label="댓글 등록"
                  className="press grid h-11 w-11 place-items-center rounded-[12px] bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50">
                  {commentSubmit ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-dashed border-neutral-300 px-4 py-3.5 text-[14.5px] text-neutral-600">
                로그인 후 댓글을 쓸 수 있습니다.
                <Link href="/login" className="press inline-flex h-9 items-center rounded-full border border-neutral-200 bg-white px-3.5 text-[13px] font-bold text-neutral-900 hover:bg-neutral-50">로그인</Link>
              </div>
            )}
          </section>
        </article>
      ) : null}
    </BoardShell>
  );
}
