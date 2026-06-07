"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
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
  rows = 5,
  placeholder,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [source, setSource] = useState(value);

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

  const applyFormat = (command: string, formatValue?: string) => {
    editorRef.current?.focus();
    exec(command, formatValue);
    syncVisual();
  };

  return (
    <div className="sarjan-html-editor">
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
          defaultValue=""
          onChange={(event) => {
            const size = event.target.value;
            if (size) applyFormat("fontSize", size);
            event.target.value = "";
          }}
          aria-label="Font size"
        >
          <option value="">Size</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">XL</option>
          <option value="6">XXL</option>
        </select>
        <select
          defaultValue=""
          onChange={(event) => {
            const font = event.target.value;
            if (font) applyFormat("fontName", font);
            event.target.value = "";
          }}
          aria-label="Font family"
        >
          <option value="">Font</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times</option>
          <option value="Courier New">Courier</option>
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
            if (mode === "visual") syncVisual();
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
          style={{ minHeight: `${rows * 1.55}rem` }}
          onInput={syncVisual}
          onBlur={syncVisual}
        />
      ) : (
        <textarea
          className="sarjan-html-editor-source"
          rows={rows}
          value={source}
          placeholder={placeholder}
          onChange={(event) => {
            setSource(event.target.value);
            onChange(event.target.value);
          }}
        />
      )}
      <p className="sarjan-html-editor-hint">
        Bold, font size, line breaks, and inline HTML supported. Use HTML tab
        for advanced styling.
      </p>
      <style>{`
        .sarjan-html-editor { display: grid; gap: 8px; }
        .sarjan-html-editor-toolbar {
          display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
        }
        .sarjan-html-editor-toolbar button,
        .sarjan-html-editor-toolbar select {
          border: 1px solid #e5e7eb; background: #fff; border-radius: 6px;
          padding: 4px 8px; font-size: 12px; cursor: pointer;
        }
        .sarjan-html-editor-toolbar button.active {
          background: #111; color: #fff; border-color: #111;
        }
        .sarjan-html-editor-surface,
        .sarjan-html-editor-source {
          width: 100%; border: 1px solid #e5e7eb; border-radius: 8px;
          padding: 10px 12px; font-size: 14px; line-height: 1.5;
          background: #fff;
        }
        .sarjan-html-editor-surface:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
        .sarjan-html-editor-hint {
          margin: 0; font-size: 11px; color: #6b7280;
        }
      `}</style>
    </div>
  );
}
