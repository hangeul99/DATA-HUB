"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { Plus, Loader2, ChevronLeft } from "lucide-react";

const BOARD_LABELS: Record<string, string> = {
  free: "자유게시판",
  feedback: "요구 및 개선사항",
};

interface Post {
  id: string;
  created_at: string;
  title: string;
  author_name: string;
  views: number;
}

export default function BoardListPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const label = BOARD_LABELS[type];

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("posts")
      .select("id, created_at, title, author_name, views")
      .eq("board_type", type)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  }, [type]);

  useEffect(() => {
    if (!label) { router.replace("/board"); return; }
    fetchPosts();
    createClient().auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
  }, [fetchPosts, label, router]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-neutral-50 pt-16">
        <div className="bg-white border-b border-neutral-100">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <Link href="/board"
              className="text-xs text-neutral-400 hover:text-brand-600 mb-3 inline-flex items-center gap-1 transition-colors">
              <ChevronLeft size={12} /> 게시판 홈
            </Link>
            <p className="text-brand-600 font-semibold text-sm uppercase tracking-widest mb-3">Board</p>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">{label}</h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex justify-end mb-4">
            {loggedIn ? (
              <Link href={`/board/${type}/write`}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors active:scale-95">
                <Plus size={15} /> 글쓰기
              </Link>
            ) : (
              <Link href="/login"
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                <Plus size={15} /> 로그인 후 글쓰기
              </Link>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="animate-spin text-brand-400" />
              </div>
            ) : posts.length === 0 ? (
              <div className="py-16 text-center text-neutral-400 text-sm">
                아직 게시글이 없습니다. 첫 글을 남겨보세요!
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-100">
                  <tr>
                    {["번호", "제목", "작성자", "작성일", "조회"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {posts.map((p, i) => (
                    <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-4 text-xs text-neutral-400 w-12">{posts.length - i}</td>
                      <td className="px-5 py-4">
                        <Link href={`/board/${type}/${p.id}`}
                          className="text-sm font-medium text-neutral-900 hover:text-brand-600 transition-colors">
                          {p.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{p.author_name}</td>
                      <td className="px-5 py-4 text-xs text-neutral-400 whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-5 py-4 text-xs text-neutral-400">{p.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
