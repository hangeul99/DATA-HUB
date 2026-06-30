import DOMPurify from "dompurify";

// ── 게시판 본문(HTML) 소독 ─────────────────────────────────────────
// 리치텍스트 에디터가 만든 HTML에는 사용자가 직접 넣은 위험 코드
// (<script>, onerror= 등)가 섞일 수 있다. 그대로 화면에 그리면(XSS)
// 다른 사용자·관리자의 로그인 정보가 탈취될 수 있으므로,
// 저장·표시 양쪽에서 이 함수로 위험 태그/속성을 제거한다.
//
// 에디터가 쓰는 서식 태그(b/i/u/s/span/font/목록/정렬)는 살리고,
// <script>, 이벤트 핸들러(onClick 등), javascript: 링크만 차단한다.
export function sanitizeHtml(dirty: string): string {
  // 서버 렌더 단계(window 없음)에서는 원본을 그대로 두고,
  // 실제 표시는 클라이언트에서 다시 소독되므로 안전하다.
  if (typeof window === "undefined") return dirty;

  return DOMPurify.sanitize(dirty, {
    // 에디터에서 실제로 생성되는 서식 태그만 허용
    ALLOWED_TAGS: [
      "p", "div", "span", "br", "b", "strong", "i", "em", "u", "s",
      "ul", "ol", "li", "font", "a",
    ],
    // 글자 크기/색/정렬을 위한 style·color·face 속성 허용 (href는 링크용)
    ALLOWED_ATTR: ["style", "color", "face", "size", "align", "href", "target", "rel"],
    // javascript: 같은 위험 프로토콜 차단
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  });
}
