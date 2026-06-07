"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  buildGoogleFontsUrl,
  CMS_FONT_FAMILIES,
  CMS_FONT_SIZES,
  isSelectionWithinEditor,
  matchCmsFontFamily,
  normalizeFontFamily,
} from "@/lib/cms-html-editor-utils";

const GOOGLE_FONTS_URL = buildGoogleFontsUrl();

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function detectStyleAtSelection(
  editor: HTMLDivElement | null,
  property: "fontFamily" | "fontSize",
): string {
  const selection = window.getSelection();
  if (!editor || !isSelectionWithinEditor(editor, selection)) {
    return "";
  }
  let node: Node | null = selection!.anchorNode;
  if (!node) {
    return "";
  }
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }
  while (node && node !== editor) {
    if (node instanceof HTMLElement) {
      const inline = node.style[property];
      if (inline) {
        return property === "fontFamily" ? normalizeFontFamily(inline) : inline;
      }
      const computed = window.getComputedStyle(node)[property];
      if (property === "fontFamily") {
        const match = matchCmsFontFamily(computed);
        if (match) {
          return match;
        }
      } else if (computed && computed !== "16px") {
        return computed;
      }
    }
    node = node.parentElement;
  }
  return "";
}

function applyInlineStyle(
  editor: HTMLDivElement | null,
  property: "fontFamily" | "fontSize",
  value: string,
  savedRange: Range | null,
) {
  if (!editor) {
    return;
  }
  editor.focus();
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  if (savedRange) {
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }
  if (!selection.rangeCount) {
    return;
  }
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer) || range.collapsed) {
    return;
  }

  const span = document.createElement("span");
  if (property === "fontFamily") {
    span.style.fontFamily = `'${value}', sans-serif`;
  } else {
    span.style.fontSize = value;
  }

  try {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
    selection.removeAllRanges();
    const next = document.createRange();
    next.selectNodeContents(span);
    selection.addRange(next);
  } catch {
    const css =
      property === "fontFamily"
        ? `font-family: '${value}', sans-serif`
        : `font-size: ${value}`;
    exec("insertHTML", `<span style="${css}">${range.toString()}</span>`);
  }
}

type Props = {
  value: string;
  onChange: (html: string) => void;
  rows?: number;
  placeholder?: string;
};

export function AdminHtmlEditor({
  value,
  onChange,
  rows = 6,
  placeholder,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const instanceId = useId();
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [source, setSource] = useState(value);
  const [activeFont, setActiveFont] = useState("");
  const [activeSize, setActiveSize] = useState("");

  const minHeightPx = Math.max(140, rows * 36);

  useEffect(() => {
    if (document.getElementById("sarjan-cms-google-fonts")) {
      return;
    }
    const link = document.createElement("link");
    link.id = "sarjan-cms-google-fonts";
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    setSource(value);
    if (
      mode === "visual" &&
      editorRef.current &&
      editorRef.current.innerHTML !== value
    ) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value, mode]);

  const saveSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const syncVisual = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    onChange(html);
    setSource(html);
  }, [onChange]);

  const refreshToolbar = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!isSelectionWithinEditor(editor, selection)) {
      return;
    }
    setActiveFont(detectStyleAtSelection(editor, "fontFamily"));
    setActiveSize(detectStyleAtSelection(editor, "fontSize"));
    saveSelection();
  }, [saveSelection]);

  useEffect(() => {
    if (mode !== "visual") {
      return;
    }
    const onSelectionChange = () => refreshToolbar();
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, [mode, refreshToolbar]);

  const applyFormat = (command: string, formatValue?: string) => {
    editorRef.current?.focus();
    exec(command, formatValue);
    syncVisual();
    refreshToolbar();
  };

  const applyFontStyle = (
    property: "fontFamily" | "fontSize",
    nextValue: string,
  ) => {
    applyInlineStyle(
      editorRef.current,
      property,
      nextValue,
      savedRangeRef.current,
    );
    if (property === "fontFamily") {
      setActiveFont(nextValue);
    } else {
      setActiveSize(nextValue);
    }
    saveSelection();
    syncVisual();
  };

  return (
    <div className="sarjan-html-editor" data-html-editor={instanceId}>
      <div className="sarjan-html-editor-toolbar">
        <button type="button" onClick={() => applyFormat("bold")} title="Bold">
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => applyFormat("italic")}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => applyFormat("underline")}
          title="Underline"
        >
          <u>U</u>
        </button>
        <select
          value={activeSize}
          onPointerDown={() => saveSelection()}
          onChange={(event) => {
            const size = event.target.value;
            if (!size) {
              return;
            }
            applyFontStyle("fontSize", size);
          }}
          aria-label="Font size"
          className="sarjan-html-editor-size"
        >
          <option value="">Size</option>
          {CMS_FONT_SIZES.map((size) => (
            <option value={size.value} key={size.value}>
              {size.label}
            </option>
          ))}
        </select>
        <select
          value={activeFont}
          onPointerDown={() => saveSelection()}
          onChange={(event) => {
            const font = event.target.value;
            if (!font) {
              return;
            }
            applyFontStyle("fontFamily", font);
          }}
          aria-label="Font family"
          className="sarjan-html-editor-font"
        >
          <option value="">Font</option>
          {CMS_FONT_FAMILIES.map((font) => (
            <option value={font} key={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => applyFormat("insertLineBreak")}
          title="Line break"
        >
          ↵
        </button>
        <button
          type="button"
          onClick={() => applyFormat("removeFormat")}
          title="Clear formatting"
        >
          Clear
        </button>
        <button
          type="button"
          className={mode === "visual" ? "active" : ""}
          onClick={() => setMode("visual")}
        >
          Visual
        </button>
        <button
          type="button"
          className={mode === "source" ? "active" : ""}
          onClick={() => {
            if (mode === "visual") {
              syncVisual();
            }
            setMode("source");
          }}
        >
          HTML
        </button>
      </div>
      {mode === "visual" ? (
        <div
          ref={editorRef}
          className="sarjan-html-editor-surface"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          style={{ minHeight: `${minHeightPx}px` }}
          onInput={() => {
            syncVisual();
            refreshToolbar();
          }}
          onBlur={syncVisual}
          onKeyUp={refreshToolbar}
          onMouseUp={refreshToolbar}
          onFocus={refreshToolbar}
        />
      ) : (
        <textarea
          className="sarjan-html-editor-source"
          rows={Math.max(rows + 2, 8)}
          style={{ minHeight: `${minHeightPx}px` }}
          value={source}
          placeholder={placeholder}
          onChange={(event) => {
            setSource(event.target.value);
            onChange(event.target.value);
          }}
        />
      )}
      <p className="sarjan-html-editor-hint">
        Select text, then pick font/size — each field keeps its own formatting.
        Use HTML tab for advanced markup.
      </p>
      <style>{`
        .sarjan-html-editor { display: grid; gap: 10px; }
        .sarjan-html-editor-toolbar {
          display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
          padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 10px;
          background: #fafafa;
        }
        .sarjan-html-editor-toolbar button,
        .sarjan-html-editor-toolbar select {
          border: 1px solid #d1d5db; background: #fff; border-radius: 8px;
          padding: 6px 10px; font-size: 13px; cursor: pointer;
        }
        .sarjan-html-editor-toolbar button.active {
          background: #111; color: #fff; border-color: #111;
        }
        .sarjan-html-editor-font { min-width: 168px; max-width: 220px; }
        .sarjan-html-editor-size { min-width: 92px; }
        .sarjan-html-editor-surface,
        .sarjan-html-editor-source {
          width: 100%; border: 1px solid #d1d5db; border-radius: 12px;
          padding: 14px 16px; font-size: 15px; line-height: 1.6;
          background: #fff; resize: vertical;
        }
        .sarjan-html-editor-surface {
          font-family: "Kumbh Sans", Arial, sans-serif;
        }
        .sarjan-html-editor-surface:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
        .sarjan-html-editor-source {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13px;
        }
        .sarjan-html-editor-hint {
          margin: 0; font-size: 12px; color: #6b7280; line-height: 1.45;
        }
      `}</style>
    </div>
  );
}
