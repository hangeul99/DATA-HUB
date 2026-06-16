"use client";

import { useRef, useEffect } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const FONTS = [
  { label: "기본체",  value: "Arial, sans-serif" },
  { label: "명조체",  value: "Georgia, serif" },
  { label: "고정폭",  value: "'Courier New', monospace" },
  { label: "손글씨",  value: "cursive" },
];

export default function RichTextEditor({ value, onChange, placeholder = "내용을 입력하세요." }: Props) {
  const editorRef   = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Set initial HTML on mount only (value is already loaded by parent before rendering)
  useEffect(() => {
    if (!initialized.current && editorRef.current) {
      editorRef.current.innerHTML = value || "";
      initialized.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sync = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val ?? "");
    sync();
  };

  const applyFontSize = (pt: string) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    const hasSelection = sel && sel.rangeCount > 0 && !sel.isCollapsed;
    document.execCommand("fontSize", false, "7");
    if (hasSelection) {
      editorRef.current?.querySelectorAll("font[size='7']").forEach(el => {
        const span = document.createElement("span");
        span.style.fontSize = pt;
        while (el.firstChild) span.appendChild(el.firstChild);
        el.parentNode?.replaceChild(span, el);
      });
    }
    sync();
  };

  const isEmpty = !value || value.replace(/<[^>]*>/g, "").trim() === "";

  type BtnProps = { title: string; onClick: () => void; children: React.ReactNode; className?: string };
  const Btn = ({ title, onClick, children, className = "" }: BtnProps) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`px-2 py-1 text-xs rounded hover:bg-neutral-200 active:bg-neutral-300 transition-colors select-none ${className}`}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-1 px-3 py-2 bg-neutral-50 border-b border-neutral-200">

        <select
          onMouseDown={e => e.stopPropagation()}
          onChange={e => exec("fontName", e.target.value)}
          defaultValue=""
          className="text-xs border border-neutral-200 rounded px-1.5 py-1 bg-white focus:outline-none cursor-pointer"
        >
          <option value="" disabled>글자체</option>
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        <select
          onMouseDown={e => e.stopPropagation()}
          onChange={e => applyFontSize(e.target.value)}
          defaultValue=""
          className="text-xs border border-neutral-200 rounded px-1.5 py-1 bg-white focus:outline-none cursor-pointer"
        >
          <option value="" disabled>크기</option>
          <option value="10px">소</option>
          <option value="14px">중</option>
          <option value="20px">대</option>
          <option value="28px">특대</option>
        </select>

        <span className="w-px h-4 bg-neutral-300" />

        <Btn title="굵게" onClick={() => exec("bold")} className="font-bold">B</Btn>
        <Btn title="기울기" onClick={() => exec("italic")} className="italic">I</Btn>
        <Btn title="밑줄" onClick={() => exec("underline")} className="underline">U</Btn>
        <Btn title="취소선" onClick={() => exec("strikeThrough")} className="line-through">S</Btn>

        <span className="w-px h-4 bg-neutral-300" />

        <label title="글자 색" className="inline-flex items-center gap-0.5 cursor-pointer px-2 py-1 text-xs hover:bg-neutral-200 rounded transition-colors select-none">
          A
          <input
            type="color"
            className="w-4 h-4 border-0 p-0 rounded cursor-pointer bg-transparent"
            onMouseDown={e => e.stopPropagation()}
            onChange={e => exec("foreColor", e.target.value)}
          />
        </label>

        <span className="w-px h-4 bg-neutral-300" />

        <Btn title="번호 목록" onClick={() => exec("insertOrderedList")}>1.</Btn>
        <Btn title="글머리 목록" onClick={() => exec("insertUnorderedList")}>•</Btn>

        <span className="w-px h-4 bg-neutral-300" />

        <Btn title="왼쪽 정렬" onClick={() => exec("justifyLeft")}>
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 13 13">
            <rect x="0" y="1"   width="13" height="2" rx="1"/>
            <rect x="0" y="5.5" width="8"  height="2" rx="1"/>
            <rect x="0" y="10"  width="13" height="2" rx="1"/>
          </svg>
        </Btn>
        <Btn title="가운데 정렬" onClick={() => exec("justifyCenter")}>
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 13 13">
            <rect x="0"   y="1"   width="13" height="2" rx="1"/>
            <rect x="2.5" y="5.5" width="8"  height="2" rx="1"/>
            <rect x="0"   y="10"  width="13" height="2" rx="1"/>
          </svg>
        </Btn>
        <Btn title="오른쪽 정렬" onClick={() => exec("justifyRight")}>
          <svg width="13" height="13" fill="currentColor" viewBox="0 0 13 13">
            <rect x="0" y="1"   width="13" height="2" rx="1"/>
            <rect x="5" y="5.5" width="8"  height="2" rx="1"/>
            <rect x="0" y="10"  width="13" height="2" rx="1"/>
          </svg>
        </Btn>

        <span className="w-px h-4 bg-neutral-300" />

        <Btn title="서식 제거" onClick={() => exec("removeFormat")}>✕</Btn>
      </div>

      {/* Editable area */}
      <div className="relative">
        {isEmpty && (
          <p className="absolute top-3 left-4 text-sm text-neutral-400 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          className="px-4 py-3 text-sm focus:outline-none"
          style={{ minHeight: "260px" }}
        />
      </div>
    </div>
  );
}
