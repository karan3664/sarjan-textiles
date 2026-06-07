"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  applyCmsEditorInlineStyle,
  buildGoogleFontsUrl,
  CMS_FONT_FAMILIES,
  CMS_FONT_SIZES,
  isSelectionWithinEditor,
  matchCmsFontFamily,
  normalizeFontFamily,
  normalizeLegacyFontHtml,
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
      if (node.tagName === "FONT") {
        const face = node.getAttribute("face");
        if (face && property === "fontFamily") {
          return matchCmsFontFamily(face) || normalizeFontFamily(face);
        }
      }
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
  const isInternalUpdateRef = useRef(false);
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
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    if (mode === "visual" && editorRef.current) {
      const normalized = normalizeLegacyFontHtml(value || "");
      if (editorRef.current.innerHTML !== normalized) {
        editorRef.current.innerHTML = normalized;
      }
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
    isInternalUpdateRef.current = true;
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
    saveSelection();
    editorRef.current?.focus();
    exec(command, formatValue);
    syncVisual();
    refreshToolbar();
  };

  const applyFontStyle = (
    property: "fontFamily" | "fontSize",
    nextValue: string,
  ) => {
    applyCmsEditorInlineStyle(
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
    refreshToolbar();
  };

  const handleToolbarPointerDown = () => {
    saveSelection();
  };

  return (
    <div className="sarjan-html-editor" data-html-editor={instanceId}>
      <div
        className="sarjan-html-editor-toolbar"
        onMouseDown={handleToolbarPointerDown}
      >
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
          onBlur={(event) => {
            const related = event.relatedTarget as Node | null;
            const root = event.currentTarget.closest(".sarjan-html-editor");
            if (related && root?.contains(related)) {
              saveSelection();
            }
            syncVisual();
          }}
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
            isInternalUpdateRef.current = true;
            onChange(event.target.value);
          }}
        />
      )}
      <p className="sarjan-html-editor-hint">
        Select text (or click inside field) then pick font/size — each field
        keeps its own formatting. Use HTML tab for advanced markup.
      </p>
    </div>
  );
}
