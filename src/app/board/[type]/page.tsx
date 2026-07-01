"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const BOARDS = [
  { type: "free",      label: "자유게시판" },
  { type: "feedback",  label: "요구 및 개선사항" },
  { type: "resources", label: "자료 게시판" },
];

const BOARD_LABELS: Record<string, string> = {
  free:      "자유게시판",
  feedback:  "요구 및 개선사항",
  resources: "자료 게시판",
};

const PER_PAGE = 10;

const maskName = (name: string) => name === "관리자" ? "관리자" : (name ? name[0] + "**" : "-");

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, "-").replace(/\.$/, "");

interface Post { id: string; created_at: string; title: string; author_name: string; views: number; }

export default function BoardListPage() {
  const params  = useParams();
  const router  = useRouter();
  const type    = params.type as string;
  const label   = BOARD_LABELS[type];

  const [posts,      setPosts]      = useState<Post[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [loggedIn,   setLoggedIn]   = useState(false);
  const [page,       setPage]       = useState(1);
  const [inputVal,   setInputVal]   = useState("");
  const [query,      setQuery]      = useState("");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("posts")
      .select("id, created_at, title, author_name, views", { count: "exact" })
      .eq("board_type", type).eq("is_active", true)
      .order("created_at", { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
    if (query) q = q.ilike("title", `%${query}%`);
    const { data, count } = await q;
    setPosts((data as Post[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [type, page, query]);

  useEffect(() => {
    if (!label) { router.replace("/board/free"); return; }
    fetchPosts();
    createClient().auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
  }, [fetchPosts, label, router]);

  useEffect(() => { setPage(1); setInputVal(""); setQuery(""); }, [type]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const startNo    = total - (page - 1) * PER_PAGE;

  const handleSearch = () => { setPage(1); setQuery(inputVal); };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-20">
        {/* 모바일: 상단 탭 */}
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

          {/* ── 왼쪽 사이드바 (데스크탑만) ── */}
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

          {/* ── 오른쪽 본문 ── */}
          <div className="flex-1 min-w-0">

            {/* 총게시물 + 검색 */}
            {/* 모바일: 세로 스택 / sm 이상: 가로 정렬 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2 sm:gap-4">
              <p className="text-xs text-neutral-500">
                총게시물 : <strong className="text-neutral-800">{total}</strong>
                {" / "}페이지 : <strong className="text-neutral-800">{page} / {totalPages}</strong>
              </p>
              <div className="flex items-center gap-1.5">
                <select className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white flex-shrink-0">
                  <option>제목</option>
                </select>
                <input
                  type="text" value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="검색어 입력"
                  className="text-xs border border-neutral-200 rounded-l-lg px-3 py-1.5 w-full sm:w-36 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button onClick={handleSearch}
                  className="bg-neutral-700 hover:bg-neutral-800 text-white px-3 py-1.5 rounded-r-lg transition-colors -ml-px flex-shrink-0">
                  <Search size={13} />
                </button>
              </div>
            </div>

            {/* 목록 테이블 */}
            <div className="bg-white rounded-2xl border border-neutral-100 overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-brand-400" />
                </div>
              ) : posts.length === 0 ? (
                <div className="py-16 text-center text-neutral-400 text-sm">
                  {query ? "검색 결과가 없습니다." : "아직 게시글이 없습니다. 첫 글을 남겨보세요!"}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-500 w-14">번호</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-neutral-500">제목</th>
                      {/* 저가치 열은 모바일에서 숨기고 sm+에서 복원 */}
                      <th className="hidden sm:table-cell px-4 py-3 text-center text-xs font-semibold text-neutral-500 w-20">작성자</th>
                      <th className="hidden sm:table-cell px-4 py-3 text-center text-xs font-semibold text-neutral-500 w-24">작성일</th>
                      <th className="hidden sm:table-cell px-4 py-3 text-center text-xs font-semibold text-neutral-500 w-14">조회수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {posts.map((p, i) => (
                      <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3 text-center text-xs text-neutral-400">{startNo - i}</td>
                        <td className="px-4 py-3">
                          <Link href={`/board/${type}/${p.id}`}
                            className="text-sm text-neutral-800 hover:text-brand-600 transition-colors">
                            {p.title}
                          </Link>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-center text-xs text-neutral-500">{maskName(p.author_name)}</td>
                        <td className="hidden sm:table-cell px-4 py-3 text-center text-xs text-neutral-400">{fmtDate(p.created_at)}</td>
                        <td className="hidden sm:table-cell px-4 py-3 text-center text-xs text-neutral-400">{p.views}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 페이지네이션 + 글쓰기 */}
            <div className="flex items-center justify-between mt-4 gap-2">
              {/* 번호 버튼이 많아도 좁은 화면에서 넘치지 않도록 가로 스크롤 허용 */}
              <div className="flex items-center gap-1 overflow-x-auto min-w-0">
                {totalPages > 1 && <>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg text-neutral-400 hover:bg-white hover:text-neutral-700 disabled:opacity-30 transition-colors flex-shrink-0">
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors flex-shrink-0 ${
                        p === page ? "bg-brand-600 text-white" : "text-neutral-500 hover:bg-white"
                      }`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-neutral-400 hover:bg-white hover:text-neutral-700 disabled:opacity-30 transition-colors flex-shrink-0">
                    <ChevronRight size={15} />
                  </button>
                </>}
              </div>
              <Link href={loggedIn ? `/board/${type}/write` : "/login"}
                className="bg-neutral-700 hover:bg-neutral-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors active:scale-95 flex-shrink-0">
                글쓰기
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
