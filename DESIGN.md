# DESIGN.md - DataHub 디자인 시스템 (v9, 2026-10)

> 방향: 짙은 남색 바탕의 "데이터로 읽는 김해" 히어로 + 밝은 작업 화면. 공공·대학 데이터 플랫폼의 신뢰감이 최우선.
> 색은 **남색(brand) 하나 + 앰버(accent) 하나**. 다른 포인트 색을 섞지 않는다.
> 토큰은 전부 `src/app/globals.css`의 `@theme`에 있다. 여기 없는 색·크기는 쓰지 않는다.

## 1. 색 (globals.css 토큰만 사용)

| 역할 | 토큰 | 값 |
|---|---|---|
| 페이지 배경 | `bg-neutral-50` | #F8F9FB |
| 표면(카드·패널) | `bg-white` + `border-neutral-200` | #FFFFFF / #E2E6EC |
| 제목 | `text-neutral-900` | #111827 |
| 본문 | `text-neutral-600` ~ `700` | #4B5563 / #374151 |
| 보조 | `text-neutral-500` | #6B7280 (흰 바탕에서 더 옅게 쓰지 않는다) |
| 기본색(버튼·링크·선택) | `brand-500` / hover `brand-600` | #2E4A6E / #1F3755 |
| 기본색 틴트 | `brand-50` / `brand-100` | #F1F4F8 / #E0E7EF |
| 강조색(어두운 배경 위, 배지, 단위) | `accent-400` / `accent-300` | #E4B84E / #F0CF7A |
| 강조색 틴트·글자 | `accent-50` / `accent-100` / `accent-700` | #FDF8EA / #FAEFCB / #8A5A12 |
| 어두운 배경 | `navy-900` | #0A1626 (히어로는 #05080F→#08101D→#0A1626 그라디언트) |
| 상태 | `emerald-*` 승인 / `amber-*` 검토 중 / `red-*` 반려 | 상태 표시에만 |

- 흰 바탕에서 앰버는 **글자색으로 쓰지 않는다** (대비 부족). 배지 바탕 `accent-50` + 글자 `accent-700`, 또는 버튼 바탕 `accent-400` + 글자 `navy-900`만 허용.
- 앰버 버튼은 어두운 배경 위에서만. 흰 바탕의 기본 버튼은 남색.
- 그라디언트 텍스트, 네온 글로우, 블러 블롭, 순검정 `#000` 금지.
- 차트 색: 남색 → 앰버 → 연남색 순 (`#2E4A6E`, `#D4A032`, `#6580A1`, `#0E253C`, `#E4B84E`, `#97AAC2`, `#8A5A12`).

## 2. 타이포그래피

본문 글꼴 Pretendard(기본 16px, 줄간격 1.65, `word-break: keep-all`). 홈 히어로 제목만 명조 **Hahmlet** (`font-[family-name:var(--font-hahmlet)]`). 숫자는 `tabular-nums`.

| 용도 | 클래스 (globals.css `@layer components`) |
|---|---|
| 홈 대표 문장 | `.t-display` (40~76px, 800) |
| 페이지 제목 | `.t-h1` (28~42px, 800) |
| 섹션 제목 | `.t-h2` (28~48px, 800) |
| 소제목 | `.t-h3` (20px, 800) |
| 본문 | `.t-body` (17px / 1.75) |
| 보조 | `.t-caption` (14px, neutral-600) |

- 위계는 굵기와 색으로. 보조 글자는 13px 아래로 내리지 않는다.
- 줄표(—) 금지. 영문 대문자 eyebrow는 홈 히어로 1곳만.

## 3. 레이아웃

| 화면 | 폭 | 정렬 |
|---|---|---|
| 홈 | `max-w-[1200px]` | 히어로는 왼쪽 글 / 오른쪽 그림 2단 |
| 데이터 탐색·분석 | `max-w-[1680px]` | 왼쪽 정렬. 넓은 화면에서 카드 5열(`2xl:grid-cols-5`) |
| 정책·조사·게시판·상세 | `max-w-[1400px]` | 왼쪽 정렬 |
| 설문·글쓰기 폼 | `max-w-6xl` 이하 | 읽기 폭 유지 |

- **페이지 머리 공통**: 흰 바탕 + `border-b`, 안에 `.t-h1` 제목 → 설명(`text-neutral-600`, `max-w-[60ch]`) → (있으면) 밑줄 탭. 제목·필터·목록이 같은 왼쪽 선에서 시작한다.
- 작업 화면(목록·대시보드)은 가운데 정렬 금지. 가운데 정렬은 홈 섹션 제목만.
- 좌우 여백 `px-4 sm:px-6`. 섹션 세로 `py-28 md:py-36`(홈), 페이지 본문 `pt-6 pb-20`.
- 게시판처럼 종류가 여러 개면 **왼쪽 세로 메뉴**(`220px` + 본문). 휴대폰에서는 가로 줄로.
- 가짜 UI 그림 금지. 실제 화면 캡처(`public/images/home/screen-*.png`)나 실데이터 컴포넌트만.

## 4. 부품

| 부품 | 규칙 |
|---|---|
| 기본 버튼 | `press h-10~12 rounded-full bg-brand-500 text-white font-bold hover:bg-brand-600` |
| 보조 버튼 | `rounded-full border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50` |
| 어두운 배경 위 강조 버튼 | `rounded-full bg-accent-400 text-navy-900 hover:bg-accent-300` |
| 아이콘 버튼 | `h-10 w-10 rounded-full border border-neutral-200` |
| 카드 | `rounded-[18px] border border-neutral-200 bg-white p-[18px]`, hover 시 `-translate-y-0.5` + 옅은 그림자. 카드 안 카드 금지 |
| 목록 행 | 카드와 같은 내용을 한 줄로. `border-b` 로 구분, 마지막 줄은 없음 |
| 밑줄 탭 | 글자 `font-bold`, 선택은 `border-b-2 border-brand-500 text-neutral-900`, 나머지 `text-neutral-500` |
| 칩(필터) | `h-9 rounded-full border`, 선택은 `bg-navy-900 text-white`, 건수는 `accent-300` |
| 드롭다운 | `.ds-select` (높이 50px, 화살표 직접 그림) |
| 검색창 | `h-[50px] rounded-[14px] border`, 포커스 `border-brand-500 ring-[3px] ring-brand-100` |
| 배지 | 잠금 `bg-accent-50 text-accent-700 border-accent-100`, 신규 `bg-accent-400 text-navy-900`, 관리자 `bg-accent-400 text-navy-900` |
| 상태 배지 | 검토 중 `bg-amber-50 text-amber-800` / 승인 `bg-emerald-50 text-emerald-700` / 반려 `bg-red-50 text-red-700` |
| 떠 있는 선택 막대 | `fixed bottom-5 rounded-full bg-navy-900 text-white` + 앰버 버튼 |
| 빈 상태 | 카드 안에 굵은 한 줄 + 다음 행동 안내 한 줄 |

- 모서리: 카드·입력 `rounded-[14px]~[18px]`, 버튼·칩 `rounded-full`, 배지 `rounded-md`.
- 그림자는 hover와 떠 있는 요소에만. `rgba(10,22,38,.35)` 남색 틴트.

## 5. 모션 (에밀 코왈스키 원칙)

- **transform과 opacity만** 애니메이션. blur·clip-path·mask·backdrop-filter·width/height 애니메이션 금지.
- 이징 토큰: `--ease-out`, `--ease-in-out`, `--ease-expo` (globals.css).
- 진입: `.enter` (흐림+아래에서, `--i`로 70ms 스태거). 스크롤 진입: `.reveal` + `useReveal()` (IntersectionObserver). `window.addEventListener('scroll')` 금지.
- 숫자: `useCountUp()`. 캔버스는 **한 번만 그리고** 반짝임·맥박은 CSS로 (매 프레임 다시 그리지 않는다).
- 홈 히어로 움직임: 별 반짝임, 점지도 차오르기(1회), 강조점 맥박, 숫자 카드 떠다님, 마우스 스프링, 검색창 빛 1회. 밑줄 긋기 효과는 쓰지 않는다(사용자 반려).
- `prefers-reduced-motion`: 모든 애니메이션 정지, 완성된 모습만 보여 준다 (globals.css 끝 블록에 추가).
- 무한 루프는 페이지당 최소한으로 (마퀴, 별, 맥박). hover 시 마퀴는 멈추지 말고 느려지게.

## 6. 폼

- 라벨은 입력 위. placeholder를 라벨 대신 쓰지 않는다 (숨길 땐 `sr-only`).
- 입력 `h-11~12 rounded-[12px] border border-neutral-200 focus:border-brand-500 focus:ring-[3px] focus:ring-brand-100`.
- 오류는 입력 아래 `text-sm text-red-600`. `alert()`·`confirm()` 대신 화면 안 문구·모달.
- 모달은 Esc로 닫히고, 공용 부품은 `src/components/`에 둔다 (예: AccessRequestModal).

## 7. 아이콘·이미지

- `lucide-react` 단일 패밀리, 장식 아이콘은 `aria-hidden`. 의미 있는 이미지는 alt를 문장으로.
- 사진은 `next/image`, 출처 표시(사진 xiquinhosilva, CC BY 4.0 등)를 작게.
- 링크 미리보기 `public/og.png` 1200×630.

## 8. 검수

- PC 1440·1680, 휴대폰 390 폭을 Playwright로 캡처해 확인. 가로 스크롤(`scrollWidth > 폭`) 금지.
- 글자 대비: 흰 바탕 보조 글자는 `neutral-500` 이상. 앰버 글자는 흰 바탕에서 `accent-700`만.
- 디자인 변경은 라이브 수정 전에 시안(아티팩트)으로 먼저 보여 주고 승인 후 구현.
