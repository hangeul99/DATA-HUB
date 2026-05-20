-- ================================================================
-- 인제대학교 데이터거버넌스센터 DB 스키마
-- Supabase SQL Editor에서 전체 실행
-- ================================================================

-- ── 1. 프로필 테이블 (OAuth 로그인 후 자동 생성) ────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 신규 유저 로그인 시 profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. 데이터셋 테이블 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.datasets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  category     TEXT NOT NULL,
  year         TEXT NOT NULL,
  description  TEXT,
  tags         TEXT[] DEFAULT '{}',
  file_path    TEXT,          -- Supabase Storage 경로
  file_size    BIGINT,        -- bytes
  downloads    INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. 신청서 테이블 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id      UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  institution     TEXT NOT NULL,   -- 소속기관
  contact         TEXT NOT NULL,   -- 연락처
  purpose         TEXT NOT NULL,   -- 이용목적
  field           TEXT NOT NULL,   -- 활용분야
  period          TEXT NOT NULL,   -- 활용기간
  project_name    TEXT,            -- 프로젝트명 (선택)
  pledge_agreed   BOOLEAN NOT NULL DEFAULT FALSE,  -- 보안서약 동의
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, dataset_id)      -- 동일 데이터셋 중복 신청 방지
);

-- ── 4. 다운로드 로그 테이블 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.download_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id    UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  ip_address    TEXT,
  user_agent    TEXT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. 분석 로그 테이블 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analysis_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name    TEXT,
  organization TEXT,
  user_type    TEXT,
  session_type TEXT,
  file_name    TEXT,
  file_type    TEXT,
  row_count    INTEGER,
  col_count    INTEGER
);

-- ── 6. 결과물 제출 테이블 ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.results (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id   UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  summary      TEXT NOT NULL,     -- 활용 내역 요약
  file_path    TEXT,              -- Storage 경로
  file_name    TEXT,              -- 원본 파일명
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- RLS (Row Level Security) 정책
-- ================================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results       ENABLE ROW LEVEL SECURITY;

-- ── profiles ────────────────────────────────────────────────────
-- 본인 프로필만 조회/수정
CREATE POLICY "profiles: 본인 조회" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: 본인 수정" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 관리자: 전체 조회
CREATE POLICY "profiles: 관리자 전체 조회" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── datasets ────────────────────────────────────────────────────
-- 누구나 활성 데이터셋 조회 가능 (비로그인 포함)
CREATE POLICY "datasets: 전체 공개 조회" ON public.datasets
  FOR SELECT USING (is_active = TRUE);

-- 관리자만 등록/수정/삭제
CREATE POLICY "datasets: 관리자 등록" ON public.datasets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "datasets: 관리자 수정" ON public.datasets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "datasets: 관리자 삭제" ON public.datasets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── applications ────────────────────────────────────────────────
-- 본인 신청서만 조회
CREATE POLICY "applications: 본인 조회" ON public.applications
  FOR SELECT USING (auth.uid() = user_id);

-- 로그인한 유저만 신청 가능
CREATE POLICY "applications: 본인 등록" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 관리자: 전체 조회
CREATE POLICY "applications: 관리자 전체 조회" ON public.applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── download_logs ───────────────────────────────────────────────
-- 본인 로그만 조회
CREATE POLICY "downloads: 본인 조회" ON public.download_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 신청한 데이터셋만 로그 기록 가능
CREATE POLICY "downloads: 신청자만 등록" ON public.download_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.applications WHERE user_id = auth.uid() AND dataset_id = download_logs.dataset_id)
  );

-- 관리자: 전체 조회
CREATE POLICY "downloads: 관리자 전체 조회" ON public.download_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── results ─────────────────────────────────────────────────────
-- 본인 결과물만 조회
CREATE POLICY "results: 본인 조회" ON public.results
  FOR SELECT USING (auth.uid() = user_id);

-- 신청한 데이터셋만 결과물 제출 가능
CREATE POLICY "results: 신청자만 등록" ON public.results
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.applications WHERE user_id = auth.uid() AND dataset_id = results.dataset_id)
  );

-- 관리자: 전체 조회
CREATE POLICY "results: 관리자 전체 조회" ON public.results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ================================================================
-- Storage 버킷 생성
-- ================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('datasets', 'datasets', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('results', 'results', FALSE)
ON CONFLICT (id) DO NOTHING;

-- datasets 버킷: 관리자만 업로드, 신청자만 다운로드
CREATE POLICY "storage datasets: 관리자 업로드" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'datasets' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "storage datasets: 신청자 다운로드" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'datasets' AND
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.datasets d ON d.id = a.dataset_id
      WHERE a.user_id = auth.uid() AND d.file_path = storage.objects.name
    )
  );

CREATE POLICY "storage datasets: 관리자 삭제" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'datasets' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- results 버킷: 본인만 업로드/조회
CREATE POLICY "storage results: 본인 업로드" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'results' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "storage results: 본인 조회" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'results' AND
    (auth.uid())::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "storage results: 관리자 조회" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'results' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
