import DOMPurify from "dompurify";

// target="_blank" 링크에 rel="noopener noreferrer" 강제 적용 (탭내빙 방어)
// DOMPurify 훅은 전역 싱글턴이므로 최초 1회만 등록한다.
let _hookRegistered = false;
function ensureHook() {
  if (_hookRegistered || typeof window === "undefined") return;
  DOMPurify.addHook("afterSanitizeAttributes", (node: Element) => {
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  _hookRegistered = true;
}

export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") return dirty;
  ensureHook();

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p", "div", "span", "br", "b", "strong", "i", "em", "u", "s",
      "ul", "ol", "li", "font", "a",
    ],
    ALLOWED_ATTR: ["style", "color", "face", "size", "align", "href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  });
}
