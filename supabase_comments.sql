-- ================================================================
-- 게시판 댓글 테이블 — Supabase SQL Editor에서 실행
-- ================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content     TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments: 전체 공개 조회" ON public.comments
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "comments: 로그인 등록" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments: 본인 수정/삭제" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "comments: 관리자 수정/삭제" ON public.comments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
