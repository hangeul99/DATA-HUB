"use client";

import { useRef, useEffect, useState } from "react";

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

const PRESET_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];

export default function RichTextEditor({ value, onChange, placeholder = "내용을 입력하세요." }: Props) {
  const editorRef      = useRef<HTMLDivElement>(null);
  const initialized    = useRef(false);
  const savedRange     = useRef<Range | null>(null);
  const [sizeVal, setSizeVal] = useState("");

  useEffect(() => {
    if (!initialized.current && editorRef.current) {
      editorRef.current.innerHTML = value || "";
      initialized.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sync = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  // 드롭다운 클릭 시 contenteditable 포커스가 사라지므로, mousedown에 선택 영역 저장
  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // 저장된 선택 영역을 복원 후 포커스
  const restoreRange = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val ?? "");
    sync();
  };

  // select(글자체)용: 선택 복원 후 fontName 적용
  const applyFontName = (font: string) => {
    restoreRange();
    document.execCommand("fontName", false, font);
    sync();
  };

  // select(글자크기)용: 선택 복원 후 Range API로 span 삽입
  const applyFontSize = (px: string) => {
    restoreRange();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);

    if (!sel.isCollapsed) {
      // 선택된 텍스트를 span으로 감싸기
      const span = document.createElement("span");
      span.style.fontSize = px;
      try {
        const fragment = range.extractContents();
        span.appendChild(fragment);
        range.insertNode(span);
        // 커서를 span 뒤로 이동
        const newRange = document.createRange();
        newRange.setStartAfter(span);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } catch {
        // 선택이 여러 블록에 걸치면 execCommand 폴백
        document.execCommand("fontSize", false, "7");
        editorRef.current?.querySelectorAll("font[size='7']").forEach(el => {
          const s = document.createElement("span");
          s.style.fontSize = px;
          while (el.firstChild) s.appendChild(el.firstChild);
          el.parentNode?.replaceChild(s, el);
        });
      }
    } else {
      // 선택 없음: 빈 span 삽입 후 그 안에 커서 위치 (이후 입력에 크기 적용)
      const span = document.createElement("span");
      span.style.fontSize = px;
      span.innerHTML = "​"; // 너비 0 공백 (커서 위치용)
      range.insertNode(span);
      const newRange = document.createRange();
      newRange.setStart(span.firstChild!, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    sync();
  };

  const isEmpty = !value || value.replace(/<[^>]*>/g, "").replace(/​/g, "").trim() === "";

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
          onMouseDown={saveRange}
          onChange={e => { applyFontName(e.target.value); (e.target as HTMLSelectElement).value = ""; }}
          defaultValue=""
          className="text-xs border border-neutral-200 rounded px-1.5 py-1 bg-white focus:outline-none cursor-pointer"
        >
          <option value="" disabled>글자체</option>
          {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        {/* 글자 크기: 직접 입력 + 프리셋 드롭다운 콤보 */}
        <div className="flex items-center border border-neutral-200 rounded bg-white overflow-hidden">
          <input
            type="number"
            min={6} max={200}
            placeholder="크기"
            value={sizeVal}
            onMouseDown={saveRange}
            onFocus={saveRange}
            onChange={e => setSizeVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && sizeVal) {
                e.preventDefault();
                applyFontSize(`${sizeVal}px`);
              }
            }}
            className="w-12 text-xs px-1.5 py-1 text-center focus:outline-none bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <select
            onMouseDown={saveRange}
            onChange={e => {
              const v = e.target.value;
              if (!v) return;
              setSizeVal(v.replace("px", ""));
              applyFontSize(v);
              (e.target as HTMLSelectElement).value = "";
            }}
            defaultValue=""
            className="text-xs border-l border-neutral-200 py-1 pl-0.5 pr-1 focus:outline-none cursor-pointer bg-white text-neutral-500"
          >
            <option value="" disabled>▾</option>
            {PRESET_SIZES.map(s => <option key={s} value={`${s}px`}>{s}</option>)}
          </select>
        </div>

        <span className="w-px h-4 bg-neutral-300" />

        <Btn title="굵게"   onClick={() => exec("bold")}          className="font-bold">B</Btn>
        <Btn title="기울기" onClick={() => exec("italic")}         className="italic">I</Btn>
        <Btn title="밑줄"   onClick={() => exec("underline")}      className="underline">U</Btn>
        <Btn title="취소선" onClick={() => exec("strikeThrough")}  className="line-through">S</Btn>

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

        <Btn title="번호 목록"   onClick={() => exec("insertOrderedList")}>1.</Btn>
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
          className="px-4 py-3 text-sm focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
          style={{ minHeight: "260px" }}
        />
      </div>
    </div>
  );
}
