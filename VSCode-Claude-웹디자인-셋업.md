# VS Code Claude 웹디자인 셋업 가이드

VS Code의 Claude Code 확장에 웹디자인용 스킬 3개와 MCP 2개를 설치하고, 디자인 시스템 파일(DESIGN.md)을 넣는 방법입니다.

---

## 0. 준비

- **Node.js v22.20 이상**이 필요합니다. 터미널에서 `node -v`로 확인하세요. 버전이 낮으면 https://nodejs.org 에서 LTS를 설치합니다.
- VS Code에서 **작업할 프로젝트 폴더**(예: 모기제로 웹사이트)를 연 다음, 아래 명령은 모두 **VS Code 터미널(Ctrl + `)** 에서 그 폴더 기준으로 실행합니다.
- `claude` 명령이 안 된다면 `npm install -g @anthropic-ai/claude-code`로 설치합니다.

---

## 방법 A. Claude에게 통째로 맡기기 (추천)

VS Code의 Claude 채팅창에 아래 내용을 그대로 붙여넣으세요.

```
이 프로젝트 폴더에 웹디자인 작업 환경을 세팅해줘. 아래 순서대로 터미널 명령을 실행하고, 각 단계 결과를 알려줘.

1. node -v 로 버전 확인 (22.20 미만이면 멈추고 알려줘)
2. 스킬 설치
   npx --yes skills@latest add emilkowalski/skills --skill "emil-design-eng" --agent claude-code --yes --copy
   npx --yes impeccable@latest install --providers=claude --scope=project
   npx --yes skills@latest add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend" --agent claude-code --yes --copy
3. MCP 설치 (프로젝트 공유용 .mcp.json에 저장)
   claude mcp add --scope project playwright -- npx @playwright/mcp@latest
   claude mcp add --scope project --transport http figma https://mcp.figma.com/mcp
4. claude mcp list 로 두 MCP가 등록됐는지 확인
5. .claude/skills 폴더에 스킬 3개가 들어갔는지 확인
6. CLAUDE.md가 없으면 만들고, 아래 "디자인 규칙" 블록을 추가

## 디자인 규칙
- UI 작업 전에 반드시 루트의 DESIGN.md를 읽고 그 토큰(색·타이포·간격)만 사용한다.
- 간격은 DESIGN.md의 base unit 배수로만 쓴다.
- 작업 후 playwright MCP로 데스크톱/모바일(375px) 화면을 캡처해 스스로 검수한다.
- 디자인 기준은 emil-design-eng, AI 티 점검은 impeccable, 레이아웃 참고는 design-taste-frontend 스킬을 쓴다.

모두 끝나면 "Claude Code를 재시작하라"고 알려줘.
```

설치가 끝나면 **VS Code를 재시작**한 뒤 아래 "3. 설치 후 할 일"을 진행하세요.

---

## 방법 B. 직접 설치하기

### 1) 스킬 3개

| 스킬 | 역할 |
|---|---|
| emil-design-eng | 타이포·간격·레이아웃·애니메이션 기준 |
| impeccable | "AI가 만든 티"를 규칙으로 잡아냄 |
| design-taste-frontend | 잘 만든 실제 사이트의 구조와 분위기를 참고해 적용 |

```bash
npx --yes skills@latest add emilkowalski/skills --skill "emil-design-eng" --agent claude-code --yes --copy
npx --yes impeccable@latest install --providers=claude --scope=project
npx --yes skills@latest add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend" --agent claude-code --yes --copy
```

### 2) MCP 2개

| MCP | 역할 |
|---|---|
| playwright | Claude가 브라우저를 열어 화면을 캡처하고 검사 |
| figma | 피그마 파일의 색·간격 읽기 (피그마를 안 쓰면 생략해도 됩니다) |

```bash
claude mcp add --scope project playwright -- npx @playwright/mcp@latest
claude mcp add --scope project --transport http figma https://mcp.figma.com/mcp
claude mcp list
```

> `--scope project`를 넣으면 설정이 `.mcp.json`에 저장되어, 같은 폴더를 쓰는 팀원도 같은 설정을 쓸 수 있습니다. 나만 쓸 거라면 빼도 됩니다.

---

## 3. 설치 후 할 일

1. **VS Code를 재시작**합니다.
2. Claude 채팅에서 `/mcp`를 입력하고 **figma → Authenticate**를 눌러 피그마 계정을 연결합니다.
3. Claude 채팅에서 `/impeccable init`을 실행해 디자인 기준 파일을 만듭니다.
4. **DESIGN.md를 넣습니다** (Refero Styles, 무료·로그인 불필요).
   - https://styles.refero.design 에 들어갑니다.
   - 분위기 칩으로 고릅니다. 업종이 아니라 **분위기**가 비슷한 사이트를 고르세요.
   - **DESIGN.md 탭 → Extended → Copy**를 누르고, 프로젝트 루트에 `DESIGN.md`로 저장합니다.
   - 컨텍스트가 길다는 경고가 나오면 Compact판으로 바꿉니다.
   - 한 프로젝트에는 파일 하나만 둡니다. 두 브랜드를 섞으면 규칙이 충돌합니다.

---

## 4. 사용 예시 프롬프트

**새 페이지 만들기**
```
DESIGN.md를 읽고 그 토큰만 사용해서 [페이지 설명] 랜딩 페이지를 만들어줘.
스타일: Illustration — 따뜻한 손그림 일러스트, 둥근 산세리프, 여백 넉넉하게.
완성 후 playwright로 데스크톱·모바일 화면을 캡처해서 impeccable 기준으로 점검해줘.
```

**기존 화면 고치기**
```
DESIGN.md를 읽고, 현재 [파일명]의 색·폰트·간격을 DESIGN.md 규칙에 맞게 고쳐줘.
구조와 기능은 그대로 두고 스타일만 바꿔줘.
```

### 스타일 키워드 (프롬프트에 붙이면 AI가 한 번에 알아듣는 것)

| 업종 | 추천 키워드 |
|---|---|
| 공공·비영리·교육 (모기제로) | Illustration, Minimal Design, Playful Design |
| 병원·법률 등 전문직 | Minimal Design |
| 스타트업·IT | Clean SaaS, Frosted Glass, Dark Mode |
| 뷰티·패션 | Editorial Type, Monochrome UI, Mesh Gradient |
| 디자인 스튜디오 | Swiss Modern, Bold Typography |

### 참고 사이트 (UI·애니메이션)

- anime.js: https://animejs.com (애니메이션 라이브러리)
- motion.dev: https://motion.dev (인터랙션·모션 예제)
- kokonut ui: https://kokonutui.com (복사해서 쓰는 UI 컴포넌트)
- bklit UI: https://bklit.com
- manus: https://manus.im

---

## 5. 문제 해결

| 증상 | 해결 |
|---|---|
| `npx` 오류, 버전 오류 | Node 22.20 이상으로 업데이트 |
| 스킬이 안 먹힘 | VS Code 재시작, `.claude/skills` 폴더 확인 |
| MCP가 안 보임 | `claude mcp list` 확인 → 재시작 → `/mcp` |
| 결과가 밋밋함 | 프롬프트에 "DESIGN.md를 읽고"를 직접 적기 |
| 색은 맞는데 싸 보임 | "간격은 base unit 배수로만" 지시 추가 |
| Windows에서 playwright 실행 오류 | `claude mcp add --scope project playwright -- cmd /c npx @playwright/mcp@latest` 로 다시 등록 |

---

*출처: lazyowen.com Claude 디자이너 가이드, Refero Styles 노션 가이드, 디자인 키워드 20 노션, 바이브 코딩 사이트 5개 노션. 확인하지 못한 페이지: 「UI 10」 노션 (보안 확인 화면에 막힘).*
