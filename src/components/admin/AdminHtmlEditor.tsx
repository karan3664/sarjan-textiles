"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  applyCmsEditorInlineStyle,
  buildGoogleFontsUrl,
  CMS_FONT_FAMILIES,
  CMS_FONT_SIZES,
  CMS_TEXT_COLORS,
  detectEditorContentStyle,
  isSelectionWithinEditor,
  normalizeLegacyFontHtml,
  resolveEditorToolbarStyle,
  type CmsEditorStyleProperty,
} from "@/lib/cms-html-editor-utils";

const GOOGLE_FONTS_URL = buildGoogleFontsUrl();

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
  rows = 6,
  placeholder,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const isInternalUpdateRef = useRef(false);
  const lastHtmlRef = useRef(value);
  const instanceId = useId();
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [source, setSource] = useState(value);
  const [activeFont, setActiveFont] = useState("");
  const [activeSize, setActiveSize] = useState("");
  const [activeColor, setActiveColor] = useState("#ffffff");

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

  const refreshToolbar = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const selection = window.getSelection();
    setActiveFont(
      resolveEditorToolbarStyle(editor, "fontFamily", selection) ||
        detectEditorContentStyle(editor, "fontFamily"),
    );
    setActiveSize(
      resolveEditorToolbarStyle(editor, "fontSize", selection) ||
        detectEditorContentStyle(editor, "fontSize"),
    );
    setActiveColor(
      resolveEditorToolbarStyle(editor, "color", selection) ||
        detectEditorContentStyle(editor, "color") ||
        "#ffffff",
    );
    if (isSelectionWithinEditor(editor, selection) && selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  const syncEditorHtml = useCallback(
    (html: string) => {
      if (!editorRef.current || mode !== "visual") {
        return;
      }
      const normalized = normalizeLegacyFontHtml(html || "");
      if (editorRef.current.innerHTML !== normalized) {
        editorRef.current.innerHTML = normalized;
      }
      requestAnimationFrame(() => refreshToolbar());
    },
    [mode, refreshToolbar],
  );

  useLayoutEffect(() => {
    setSource(value);
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      lastHtmlRef.current = value;
      requestAnimationFrame(() => refreshToolbar());
      return;
    }
    if (value !== lastHtmlRef.current) {
      lastHtmlRef.current = value;
      syncEditorHtml(value);
    }
  }, [value, mode, syncEditorHtml, refreshToolbar]);

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
    if (html === lastHtmlRef.current) {
      return;
    }
    lastHtmlRef.current = html;
    isInternalUpdateRef.current = true;
    onChange(html);
    setSource(html);
  }, [onChange]);

  useEffect(() => {
    if (mode !== "visual") {
      return;
    }
    const onSelectionChange = () => {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!isSelectionWithinEditor(editor, selection)) {
        return;
      }
      refreshToolbar();
    };
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

  const applyTextStyle = (
    property: CmsEditorStyleProperty,
    nextValue: string,
  ) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const selection = window.getSelection();
    const saved = savedRangeRef.current;
    const hasTextSelection =
      saved &&
      !saved.collapsed &&
      editor.contains(saved.commonAncestorContainer);

    applyCmsEditorInlineStyle(editor, property, nextValue, saved, {
      applyToAll: !hasTextSelection,
    });

    if (property === "fontFamily") {
      setActiveFont(nextValue);
    } else if (property === "fontSize") {
      setActiveSize(nextValue);
    } else {
      setActiveColor(nextValue);
    }

    syncVisual();
    requestAnimationFrame(() => refreshToolbar());
  };

  const handleToolbarPointerDown = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest("select, input[type='color']")) {
      saveSelection();
      return;
    }
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
            applyTextStyle("fontSize", size);
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
            applyTextStyle("fontFamily", font);
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
        <select
          value={
            CMS_TEXT_COLORS.some((item) => item.value === activeColor)
              ? activeColor
              : ""
          }
          onChange={(event) => {
            const color = event.target.value;
            if (!color) {
              return;
            }
            applyTextStyle("color", color);
          }}
          aria-label="Text color preset"
          className="sarjan-html-editor-color-preset"
        >
          <option value="">Color</option>
          {CMS_TEXT_COLORS.map((color) => (
            <option value={color.value} key={color.value}>
              {color.label}
            </option>
          ))}
        </select>
        <input
          type="color"
          value={
            /^#[0-9a-fA-F]{6}$/.test(activeColor) ? activeColor : "#ffffff"
          }
          onChange={(event) => applyTextStyle("color", event.target.value)}
          aria-label="Custom text color"
          className="sarjan-html-editor-color"
          title="Custom color"
        />
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
          }}
          onBlur={(event) => {
            const related = event.relatedTarget as Node | null;
            const root = event.currentTarget.closest(".sarjan-html-editor");
            if (related && root?.contains(related)) {
              saveSelection();
            }
            syncVisual();
          }}
          onFocus={refreshToolbar}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
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
            lastHtmlRef.current = event.target.value;
            isInternalUpdateRef.current = true;
            onChange(event.target.value);
          }}
        />
      )}
      <p className="sarjan-html-editor-hint">
        Click inside a field and pick font, size, or color — applies to the
        whole field. Select part of the text to format only that portion. Use
        HTML tab for advanced markup.
      </p>
    </div>
  );
}
