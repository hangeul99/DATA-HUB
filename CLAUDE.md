@AGENTS.md

---

# 인제대학교 데이터거버넌스센터 — DataHub

> 연구자·기업·지자체·일반인을 위한 데이터 플랫폼

## 프로젝트 현황

```
✅ 완료된 것들:
- 홈 / 데이터 탐색 / 데이터 분석 / 정책 / 로그인 / 마이페이지
- 관리자 페이지 (/admin) — role='admin' 인 사용자만 접근 가능
- Supabase Auth (이메일+비밀번호, 구글 OAuth)
- GitHub 연결 + Vercel 자동 배포 (push → 자동 재배포)
- 소속기관 입력 모달 (첫 구글 로그인 시, 개인정보 동의 포함)
- 데이터 분석기 (CSV/Excel → 차트 자동 생성, 산점도/버블/히트맵 포함)
- 분석 로그 / 다운로드 로그 / 신청 로그 (관리자 이용 현황)
- 개인정보처리방침 (/privacy) + 이용약관 (/terms) 페이지
- 회원가입 동의 체크박스 (개인정보+이용약관+만14세 확인)
- 회원탈퇴 기능 (마이페이지 → API route → Supabase admin 삭제)
- 지역/업체 데이터 접근 권한 시스템 (잠금 카드 + 신청 모달 + 관리자 승인)
- RLS 설정 완료 (profiles, datasets, applications, download_logs, analysis_logs, access_requests)
- 쿠키 안내 배너 (하단 고정, localStorage로 닫기 상태 유지)

🔜 향후 과제:
- 보유기간 자동 파기 (Supabase pg_cron 설정 필요, 현재 수동 관리)
- 대규모 트래픽 시 Supabase Pro 플랜 업그레이드
```

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| 데이터베이스 | Supabase (PostgreSQL) |
| 인증 | Supabase Auth (이메일/구글) |
| 차트 | Recharts |
| 배포 | Vercel |
| 지도 | Leaflet (동적 import) |

---

## Supabase 테이블 구조

```
profiles         — 사용자 프로필 (id, name, email, organization, role, user_type)
datasets         — 데이터셋 목록 (title, category, is_active, ...)
applications     — 데이터 신청 (user_id, dataset_id, status, ...)
download_logs    — 다운로드 기록 (user_id, dataset_id, ...)
analysis_logs    — 분석 도구 사용 기록 (user_id, user_email, file_name, organization, ...)
```

---

## Phase 3: 백엔드 — 완료 ✅

이 프로젝트는 Supabase를 백엔드로 사용하며 이미 연동 완료.

### 환경변수 (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ydisrobaalxpvkrxfjlr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

### 보안 규칙

- API 키는 절대 코드에 직접 입력 금지
- .env 파일은 .gitignore에 포함되어 있음 (GitHub에 올라가지 않음)
- Supabase RLS(행 수준 보안) 각 테이블에 적용 필요

---

## Phase 4: 배포

### 현재 상태

```
Vercel 배포: ✅ 완료
GitHub 연결: 🔜 진행 예정
```

### GitHub 연결 방법

**👤 사용자가 할 일:**
```
1. https://github.com → 로그인
2. "+" → "New repository"
3. 이름: datahub (Private 권장)
4. README/gitignore 체크 없이 "Create repository"
5. 생성된 URL 알려주기: https://github.com/[username]/datahub
```

**🤖 Claude Code가 할 일:**
```bash
git add . && git commit -m "feat: 데이터거버넌스센터 DataHub"
git remote add origin [URL] && git push -u origin master
```

### Vercel 환경변수 등록

```
Vercel → Settings → Environment Variables
NEXT_PUBLIC_SUPABASE_URL = [값]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [값]
→ 저장 후 Redeploy
```

### 코드 수정 후 배포 방법

```bash
# 방법 1: Vercel CLI (현재 사용 중)
npx vercel --prod

# 방법 2: GitHub 연결 후 자동 배포
git add . && git commit -m "수정 내용" && git push
# → Vercel이 push 감지하여 자동 재배포
```

---

## Phase 5: 관리자 페이지 — 완료 ✅

`/admin` 경로에 구현 완료. `profiles.role = 'admin'` 인 사용자만 접근 가능.

### 관리자 탭 구성

| 탭 | 기능 |
|-----|------|
| 이용 현황 | 분석 로그 목록, 이메일 마스킹, 파일명, 소속, 엑셀 내보내기 |
| 데이터 신청 | 신청 목록, 승인/거절, 어떤 데이터셋 신청했는지 표시 |
| 데이터셋 관리 | 데이터셋 등록/수정/삭제 |

### 이메일 마스킹 규칙

```
lhg9449@gmail.com → lhg****@gmail.com
(끝 4자리 → ****)
```

---

## 🔒 보안 체크리스트

| 영역 | 항목 | 상태 |
|------|------|------|
| **인증** | Supabase Auth (bcrypt 해시) | ✅ |
| **통신** | HTTPS (Vercel 자동 적용) | ✅ |
| **데이터 암호화** | Supabase 저장 데이터 암호화 | ✅ |
| **구글 로그인** | OAuth (비밀번호 저장 없음) | ✅ |
| **이메일 마스킹** | 관리자 화면에서 처리 | ✅ |
| **RLS** | 각 테이블 행 수준 보안 | ✅ |
| **개인정보처리방침** | /privacy 페이지 상시 게시 | ✅ |
| **이용약관** | /terms 페이지 상시 게시 | ✅ |
| **만 14세 제한** | 회원가입 체크박스 명시 | ✅ |
| **쿠키 고지** | 하단 배너 (필수 쿠키만 사용) | ✅ |
| **관리자 접근 제한** | role=admin 서버 검증 | ✅ |
| **API 키 보호** | .env + .gitignore | ✅ |

### 수집하는 개인정보 항목

```
이름, 이메일, 소속기관, 사용자 유형
→ 개인정보처리방침 페이지에 고지 필요 (한국 개인정보보호법)
```

---

## ⚠️ 개발 규칙

### 절대 금지

- `transition-all` 사용 금지
- Tailwind 기본 blue/indigo 메인 색상 사용 금지 (brand-xxx 사용)
- API 키를 코드에 직접 입력 금지
- .env 파일을 GitHub에 커밋 금지
- `getSession()` 사용 금지 → `getUser()` 사용 (proxy.ts 보안)

### 반드시 할 것

- 모든 버튼에 hover/focus/active 상태 스타일 적용
- 환경변수는 .env.local 파일에만 저장
- Supabase 쿼리 실패해도 UX에 영향 없도록 try/catch 처리
- 서버 컴포넌트에서 auth는 `getUser()` 사용
- **모든 코드/파일 변경 후 반드시 git push (GitHub에 올리기)**
  ```bash
  git add [파일명] && git commit -m "설명" && git push
  ```
- 새 기능 완성 후 `npx vercel --prod` 로 배포 (또는 git push → Vercel 자동 배포)

### 색상 시스템

```
브랜드 색: brand-600 (#0D7377 계열)
네이비: navy-900
텍스트: neutral-700 / neutral-800
보조: neutral-100 ~ neutral-400
경고: amber-xxx
위험: red-xxx
```
