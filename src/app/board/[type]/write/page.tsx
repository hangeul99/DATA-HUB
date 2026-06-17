"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Loader2, Paperclip, X } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

const BOARD_LABELS: Record<string, string> = {
  free:      "자유게시판",
  feedback:  "요구 및 개선사항",
  resources: "자료 게시판",
};

export default function WritePostPage() {
  const params = useParams();
  const router = useRouter();
  const type   = params.type as string;
  const label  = BOARD_LABELS[type];

  const [title,       setTitle]       = useState("");
  const [content,     setContent]     = useState("");
  const [file,        setFile]        = useState<File | null>(null);
  const [dragging,    setDragging]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!label) { router.replace("/board"); return; }
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
      else setAuthChecked(true);
    });
  }, [label, router]);

  const pickFile = (f: File | undefined | null) => {
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError("제목을 입력해주세요."); return; }
    const textOnly = content.replace(/<[^>]*>/g, "").trim();
    if (!textOnly && type !== "resources") { setError("내용을 입력해주세요."); return; }
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles").select("name").eq("id", user.id).single();

    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;

    if (type === "resources" && file) {
      const ext = file.name.split(".").pop() ?? "bin";
      const storagePath = `${user.id}/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("post-attachments")
        .upload(storagePath, file);
      if (uploadErr) {
        setError(`파일 업로드에 실패했습니다. ${uploadErr.message}`);
        setSubmitting(false);
        return;
      }
      attachmentPath = uploadData.path;
      attachmentName = file.name;
    }

    const { data: post, error: err } = await supabase.from("posts").insert({
      board_type: type,
      title: title.trim(),
      content,
      user_id: user.id,
      author_name: profile?.name ?? user.email?.split("@")[0] ?? "익명",
      attachment_path: attachmentPath,
      attachment_name: attachmentName,
    }).select("id").single();

    if (err || !post) {
      setError(`글 등록에 실패했습니다. ${err?.message ?? ""}`);
      setSubmitting(false);
      return;
    }
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

              {/* 자료 게시판 전용 파일 첨부 */}
              {type === "resources" && (
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">파일 첨부</label>
                  {file ? (
                    <div className="flex items-center gap-2 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                      <Paperclip size={14} className="text-brand-500 flex-shrink-0" />
                      <span className="text-sm text-neutral-700 flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-neutral-400">
                        {(file.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                      <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                        className="text-neutral-400 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={e => {
                        e.preventDefault();
                        setDragging(false);
                        pickFile(e.dataTransfer.files?.[0]);
                      }}
                      className={`flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                        dragging
                          ? "border-brand-400 bg-brand-50 text-brand-600"
                          : "border-neutral-300 text-neutral-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50"
                      }`}
                    >
                      <Paperclip size={20} />
                      <p className="text-sm font-medium">파일을 드래그하거나 클릭해서 선택하세요</p>
                      <p className="text-xs text-neutral-400">PPT, PDF, Excel, Word 등 모든 파일 형식</p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" className="hidden"
                    onChange={e => pickFile(e.target.files?.[0])} />
                </div>
              )}

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
