"use client";

/* ============================================================
   게시판 목록 (/board/[type]) — 시안 v9

   왼쪽 메뉴(BoardShell) + 오른쪽: 검색·글쓰기 → 글 목록(제목, 본문 첫 줄, 작성자, 날짜, 조회수) → 쪽 번호
   번호·표 대신 한 글에 한 줄씩. 첨부는 클립, 댓글은 개수 배지, 관리자 글은 앰버 배지.
============================================================ */

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search, Loader2, ChevronLeft, ChevronRight, Paperclip } from "lucide-react";
import BoardShell, { BOARDS, BOARD_LABELS, maskName, fmtDate, AdminBadge } from "@/components/board/BoardShell";

const PER_PAGE = 10;

interface Post { id: string; created_at: string; title: string; author_name: string; views: number; content: string | null; attachment_name: string | null; comment_count?: number }

/** 본문 HTML → 첫 줄 글자만 (목록 미리보기) */
const excerpt = (html: string | null) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);

export default function BoardListPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const label = BOARD_LABELS[type];

  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState(1);
  const [inputVal, setInputVal] = useState("");
  const [query, setQuery] = useState("");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("posts")
      .select("id, created_at, title, author_name, views, content, attachment_name", { count: "exact" })
      .eq("board_type", type).eq("is_active", true)
      .order("created_at", { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    if (query) q = q.ilike("title", `%${query}%`);
    const { data, count } = await q;
    const rows = (data as Post[]) ?? [];
    // 댓글 수 (이 쪽의 글들만)
    if (rows.length) {
      const { data: cm } = await supabase.from("comments").select("post_id").eq("is_active", true).in("post_id", rows.map((r) => r.id));
      const n: Record<string, number> = {};
      for (const c of cm ?? []) n[c.post_id] = (n[c.post_id] ?? 0) + 1;
      rows.forEach((r) => { r.comment_count = n[r.id] ?? 0; });
    }
    setPosts(rows);
    setTotal(count ?? 0);
    setLoading(false);
  }, [type, page, query]);

  // 게시판별 글 수 (왼쪽 메뉴 숫자) — 한 번만
  useEffect(() => {
    const supabase = createClient();
    Promise.all(BOARDS.map((b) => supabase.from("posts").select("id", { count: "exact", head: true }).eq("board_type", b.type).eq("is_active", true)))
      .then((rs) => setCounts(Object.fromEntries(BOARDS.map((b, i) => [b.type, rs[i].count ?? 0]))));
  }, []);

  useEffect(() => {
    if (!label) { router.replace("/board/free"); return; }
    fetchPosts();
    createClient().auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
  }, [fetchPosts, label, router]);

  useEffect(() => { setPage(1); setInputVal(""); setQuery(""); }, [type]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const handleSearch = () => { setPage(1); setQuery(inputVal.trim()); };

  return (
    <BoardShell type={type} counts={counts}>
      {/* 검색 + 글쓰기 */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <label className="flex h-[46px] min-w-[220px] flex-[1_1_280px] items-center gap-2.5 rounded-[14px] border border-neutral-200 bg-white px-4 focus-within:border-brand-500 focus-within:ring-[3px] focus-within:ring-brand-100">
          <Search size={18} className="flex-none text-neutral-400" aria-hidden="true" />
          <span className="sr-only">{label} 글 검색</span>
          <input type="search" value={inputVal} onChange={(e) => setInputVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="제목으로 검색" className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400" />
          {inputVal && <button type="button" onClick={handleSearch} className="text-sm font-bold text-brand-600">검색</button>}
        </label>
        <Link href={loggedIn ? `/board/${type}/write` : "/login"}
          className="press inline-flex h-[46px] items-center rounded-full bg-brand-500 px-5 font-bold text-white hover:bg-brand-600">글쓰기</Link>
      </div>

      {/* 글 목록 */}
      <div className="overflow-hidden rounded-[18px] border border-neutral-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-brand-400" /></div>
        ) : posts.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-[17px] font-bold text-neutral-900">{query ? "검색 결과가 없습니다" : "아직 글이 없습니다"}</p>
            <p className="mt-1 text-sm text-neutral-500">{query ? "다른 검색어로 찾아보세요." : "첫 글을 남겨 주세요. 로그인하면 글을 쓸 수 있습니다."}</p>
          </div>
        ) : posts.map((p) => {
          const sum = excerpt(p.content);
          return (
            <Link key={p.id} href={`/board/${type}/${p.id}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 border-b border-neutral-200 px-5 py-4 transition-colors last:border-b-0 hover:bg-neutral-50">
              <h3 className="flex flex-wrap items-center gap-2 text-[16.5px] font-extrabold text-neutral-900">
                {p.title}
                {p.attachment_name && <Paperclip size={14} className="text-neutral-500" aria-label="첨부파일 있음" />}
                {p.comment_count ? <span className="rounded-md bg-brand-50 px-1.5 py-px text-[12.5px] font-bold text-brand-600">댓글 {p.comment_count}</span> : null}
              </h3>
              <span className="whitespace-nowrap text-[13px] text-neutral-500 tabular-nums">{fmtDate(p.created_at)}</span>
              {sum && <p className="col-span-2 line-clamp-1 text-sm text-neutral-500">{sum}</p>}
              <div className="col-span-2 flex flex-wrap items-center gap-x-3.5 text-[13px] text-neutral-500 tabular-nums">
                {p.author_name === "관리자" ? <AdminBadge /> : <b className="font-semibold text-neutral-700">{maskName(p.author_name)}</b>}
                <span>조회 {p.views}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 쪽 번호 */}
      {totalPages > 1 && (
        <nav aria-label="쪽 이동" className="mt-4 flex items-center justify-center gap-1.5 overflow-x-auto">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="이전 쪽"
            className="grid h-9 w-9 place-items-center rounded-[10px] border border-neutral-200 bg-white text-neutral-500 disabled:opacity-30"><ChevronLeft size={16} /></button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <button key={p} type="button" onClick={() => setPage(p)} aria-current={p === page ? "page" : undefined}
              className={`h-9 w-9 rounded-[10px] border text-sm font-semibold tabular-nums ${p === page ? "border-navy-900 bg-navy-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"}`}>{p}</button>
          ))}
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="다음 쪽"
            className="grid h-9 w-9 place-items-center rounded-[10px] border border-neutral-200 bg-white text-neutral-500 disabled:opacity-30"><ChevronRight size={16} /></button>
        </nav>
      )}
      <p className="mt-3 text-center text-[13px] text-neutral-500">총 {total}건</p>
    </BoardShell>
  );
}
