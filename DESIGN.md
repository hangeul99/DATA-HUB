# DESIGN.md - DataHub 디자인 시스템

> 방향: 라이트 에디토리얼 (Linear / Vercel 계열). 공공·대학 데이터 플랫폼의 신뢰감이 최우선.
> 다이얼: DESIGN_VARIANCE 5 / MOTION_INTENSITY 4 / VISUAL_DENSITY 5
> 테마 잠금: **라이트 단일 테마**. 섹션 단위 반전 금지 (브랜드 색 밴드 1회만 허용).

## 1. 색 (globals.css 토큰만 사용)

| 역할 | 토큰 | 값 |
|---|---|---|
| 페이지 배경 | `bg-neutral-50` | #F8F9FB |
| 표면(카드·패널) | `bg-white` | #FFFFFF (테두리와 함께만 사용) |
| 본문 텍스트 | `text-neutral-600` | #4B5563 |
| 제목 텍스트 | `text-neutral-900` | #111827 |
| 보조 텍스트 | `text-neutral-500` | #6B7280 |
| 헤어라인 | `border-neutral-200` | #E2E6EC |
| 악센트(유일) | `brand-600` | #0B6063 |
| 악센트 hover | `brand-700` | #094D50 |
| 악센트 배경 틴트 | `brand-50` | #E6F4F4 |
| 경고 / 위험 | `amber-*` / `red-*` | 상태 표시에만 |

- 악센트는 **brand 하나**. 페이지 어디서든 다른 포인트 색을 섞지 않는다.
- 그라디언트 텍스트, 네온 글로우, 블러 블롭 배경 금지.
- 순검정 `#000` 금지. 다크 표면이 필요하면 `neutral-900`.

## 2. 타이포그래피

폰트: Pretendard Variable (한글 최적화, 이미 로드됨). 숫자는 `tabular-nums`.

| 용도 | 클래스 |
|---|---|
| 페이지 H1 | `text-4xl md:text-5xl lg:text-[3.5rem] font-semibold tracking-tight leading-[1.1]` |
| 섹션 H2 | `text-3xl md:text-4xl font-semibold tracking-tight` |
| 소제목 H3 | `text-lg font-medium text-neutral-900` |
| 본문 | `text-base text-neutral-600 leading-relaxed max-w-[60ch]` |
| 캡션/메타 | `text-sm text-neutral-500` |
| 큰 숫자 | `text-4xl md:text-5xl font-semibold tabular-nums tracking-tight` |

- 위계는 **굵기와 색**으로 만든다. 크기만 키워서 소리 지르지 않는다.
- 섹션 위 영문 대문자 eyebrow(`uppercase tracking-widest`)는 **3섹션당 최대 1개**. 기본은 없음.
- 강조는 같은 글꼴의 색(brand-600) 또는 굵기로. 다른 글꼴 섞지 않는다.
- 줄표(—, –) 사용 금지. 마침표·쉼표·괄호로 문장을 나눈다.

## 3. 간격 (base unit 4px = Tailwind 1)

| 용도 | 값 |
|---|---|
| 섹션 세로 패딩 | `py-20 md:py-24` |
| 히어로 상단 (고정 nav 64px 포함) | `pt-24 md:pt-28` |
| 컨테이너 | `max-w-7xl mx-auto px-6 lg:px-8` |
| 카드 내부 | `p-6` |
| 그리드 간격 | `gap-4` (타일) / `gap-12` (컬럼) |
| 제목 → 본문 | `mt-4` |
| 본문 → CTA | `mt-8` |

## 4. 형태 잠금

- 모서리: **`rounded-xl` (12px) 단일 스케일**. 카드·입력·버튼 전부 동일. pill 금지 (뱃지만 `rounded-md`).
- 그림자: 브랜드 틴트 그림자만. `shadow-tinted` (globals.css). 검정 drop shadow 금지.
- 카드는 **위계가 필요할 때만**. 나머지는 헤어라인(`border-t`)과 여백으로 구분.
- 긴 목록의 각 행에 `border-t`와 `border-b`를 동시에 쓰지 않는다. `border-t`만.

## 5. 버튼 & 인터랙션

| 종류 | 클래스 |
|---|---|
| Primary | `bg-brand-600 text-white hover:bg-brand-700 rounded-xl px-5 py-3 text-sm font-medium` |
| Secondary | `bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-100 rounded-xl px-5 py-3 text-sm font-medium` |
| Ghost | `text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl px-3 py-2 text-sm` |

- 모든 버튼: `transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2`
- `transition-all` 금지 (성능). 속성을 명시한다.
- CTA 라벨 잠금 (같은 의도 = 같은 문구):
  - 데이터 둘러보기 → **"데이터 탐색하기"**
  - 회원가입 → **"시작하기"**
  - 로그인 → **"로그인"**
- CTA는 데스크톱에서 한 줄. 히어로에는 Primary 1개 + 검색만.

## 6. 모션

- 이징: `ease-out-expo` = `cubic-bezier(0.16, 1, 0.3, 1)` (globals.css 토큰)
- 진입: `opacity 0→1, y 16→0`, 0.5s, 스태거 60ms. `whileInView` + `viewport={{ once: true, amount: 0.3 }}`
- UI 반응(hover·press): 150ms 이하. 키보드 조작은 애니메이션 없음.
- `prefers-reduced-motion`: `useReducedMotion()`으로 이동 애니메이션 제거, 색/투명도만 유지.
- `window.addEventListener('scroll')` 금지. IntersectionObserver 또는 framer `useInView`.
- 무한 루프 애니메이션은 페이지당 최대 1개(로고 롤링 등), 실제 의미가 있을 때만.

## 7. 레이아웃 원칙

- 홈 섹션은 서로 다른 레이아웃 가족을 쓴다: 비대칭 분할 히어로 / 숫자 스트립 / 벤토 / 원장(ledger) 목록 / 좌측 고정 타임라인 / 색 밴드.
- 같은 크기 카드 3개·4개 가로 나열 금지.
- 벤토는 항목 수 = 셀 수. 빈 셀 금지. 셀 중 최소 2개는 틴트·패턴으로 시각 변화.
- 히어로: 제목 2줄 이내, 부제 20단어 이내, CTA는 스크롤 없이 보임. 상단 여백 `pt-28` 이하.
- 가짜 스크린샷(div로 그린 UI) 금지. 실데이터 컴포넌트(Supabase) 또는 실제 이미지만.
- 장식용 색 점, 섹션 번호, "Scroll" 큐, 위치·시간 스트립 금지.

## 8. 폼

- 라벨은 입력 위에. placeholder를 라벨 대신 쓰지 않는다 (시각적으로 숨길 땐 `sr-only`).
- 오류 문구는 입력 아래 `text-sm text-red-600`.
- 입력: `rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400`

## 9. 아이콘

- `lucide-react` 단일 패밀리 (프로젝트 기존 의존성). `strokeWidth={1.75}` 통일. SVG 직접 그리지 않는다.
