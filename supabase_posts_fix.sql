-- ================================================================
-- posts 테이블 점검/보정 — Supabase SQL Editor에서 전체 실행
-- (이미 적용된 부분은 안전하게 무시됩니다)
-- ================================================================

-- 첨부파일 컬럼 (없으면 추가)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS attachment_path TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- is_active 기본값 보정 (NULL로 들어가면 조회 RLS에서 걸러져 "등록 실패"로 보임)
ALTER TABLE public.posts ALTER COLUMN is_active SET DEFAULT TRUE;
UPDATE public.posts SET is_active = TRUE WHERE is_active IS NULL;

-- board_type 체크 제약에 resources 포함 여부 확인 (제약이 있다면 재생성)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'posts' AND column_name = 'board_type'
  ) THEN
    ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_board_type_check;
    ALTER TABLE public.posts ADD CONSTRAINT posts_board_type_check
      CHECK (board_type IN ('free', 'feedback', 'resources'));
  END IF;
END $$;

-- RLS 재정비
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts: 전체 공개 조회" ON public.posts;
CREATE POLICY "posts: 전체 공개 조회" ON public.posts
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "posts: 로그인 등록" ON public.posts;
CREATE POLICY "posts: 로그인 등록" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts: 본인 수정" ON public.posts;
CREATE POLICY "posts: 본인 수정" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts: 관리자 수정" ON public.posts;
CREATE POLICY "posts: 관리자 수정" ON public.posts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- post-attachments 스토리지 버킷 (없으면 생성)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-attachments', 'post-attachments', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage post-attachments: 본인 업로드" ON storage.objects;
CREATE POLICY "storage post-attachments: 본인 업로드" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-attachments' AND auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "storage post-attachments: 전체 다운로드" ON storage.objects;
CREATE POLICY "storage post-attachments: 전체 다운로드" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-attachments');
