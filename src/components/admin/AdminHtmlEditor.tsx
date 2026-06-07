"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CMS_FONT_FAMILIES = [
  "Kumbh Sans",
  "Inter",
  "Poppins",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Raleway",
  "Nunito",
  "DM Sans",
  "Source Sans 3",
  "Oswald",
  "Playfair Display",
  "Merriweather",
  "Libre Baskerville",
  "Cormorant Garamond",
  "Georgia",
  "Times New Roman",
  "Arial",
  "Helvetica",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Courier New",
  "Palatino Linotype",
] as const;

const CMS_FONT_SIZES = [
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
  { label: "40px", value: "40px" },
  { label: "48px", value: "48px" },
  { label: "56px", value: "56px" },
  { label: "64px", value: "64px" },
] as const;

const GOOGLE_FONTS_URL = `https://fonts.googleapis.com/css2?family=${CMS_FONT_FAMILIES.filter(
  (font) =>
    ![
      "Arial",
      "Helvetica",
      "Verdana",
      "Tahoma",
      "Trebuchet MS",
      "Georgia",
      "Times New Roman",
      "Courier New",
      "Palatino Linotype",
    ].includes(font),
)
  .map((font) => `${font.replace(/ /g, "+")}:wght@400;500;600;700`)
  .join("&family=")}&display=swap`;

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function normalizeFontFamily(value: string) {
  return value.replace(/['"]/g, "").split(",")[0]?.trim() ?? "";
}

function detectStyleAtSelection(
  editor: HTMLDivElement | null,
  property: "fontFamily" | "fontSize",
): string {
  const selection = window.getSelection();
  if (!selection?.anchorNode || !editor) {
    return "";
  }
  let node: Node | null = selection.anchorNode;
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
        const normalized = normalizeFontFamily(computed);
        const match = CMS_FONT_FAMILIES.find(
          (font) =>
            normalized.toLowerCase().includes(font.toLowerCase()) ||
            font.toLowerCase().includes(normalized.toLowerCase()),
        );
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
) {
  if (!editor) {
    return;
  }
  editor.focus();
  const selection = window.getSelection();
  if (!selection?.rangeCount) {
    return;
  }
  const range = selection.getRangeAt(0);
  if (range.collapsed) {
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
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [source, setSource] = useState(value);
  const [activeFont, setActiveFont] = useState("");
  const [activeSize, setActiveSize] = useState("");

  const minHeightPx = Math.max(140, rows * 36);

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

  const syncVisual = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    onChange(html);
    setSource(html);
  }, [onChange]);

  const refreshToolbar = useCallback(() => {
    setActiveFont(detectStyleAtSelection(editorRef.current, "fontFamily"));
    setActiveSize(detectStyleAtSelection(editorRef.current, "fontSize"));
  }, []);

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

  return (
    <div className="sarjan-html-editor">
      <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
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
          onChange={(event) => {
            const size = event.target.value;
            if (!size) {
              return;
            }
            applyInlineStyle(editorRef.current, "fontSize", size);
            setActiveSize(size);
            syncVisual();
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
            applyInlineStyle(editorRef.current, "fontFamily", font);
            setActiveFont(font);
            syncVisual();
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
        Select text, then pick font/size — selection stays visible in the
        toolbar. Use HTML tab for advanced markup.
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
