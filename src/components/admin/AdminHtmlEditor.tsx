"use client";

import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  buildGoogleFontsUrl,
  CMS_FONT_FAMILIES,
  CMS_FONT_SIZES,
  CMS_TEXT_COLORS,
  normalizeCmsEditorColor,
  normalizeLegacyFontHtml,
  resolveTiptapToolbarStyles,
} from "@/lib/cms-html-editor-utils";
import { FontSize } from "@/lib/tiptap-font-size";

type Props = {
  value: string;
  onChange: (html: string) => void;
  rows?: number;
  placeholder?: string;
  compact?: boolean;
};

function emptyEditorHtml(html: string) {
  const trimmed = html.trim();
  return !trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>";
}

function normalizeEditorOutput(html: string) {
  return emptyEditorHtml(html) ? "" : html;
}

function normalizeEditorInput(value: string) {
  const normalized = normalizeLegacyFontHtml(value || "");
  return emptyEditorHtml(normalized) ? "" : normalized;
}

export function AdminHtmlEditor({
  value,
  onChange,
  rows = 6,
  placeholder,
  compact = false,
}: Props) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const skipExternalSyncRef = useRef(false);
  const lastEmittedValueRef = useRef(normalizeEditorInput(value));
  const instanceId = useId();
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [source, setSource] = useState(value);
  const [activeFont, setActiveFont] = useState("");
  const [activeSize, setActiveSize] = useState("");
  const [activeColor, setActiveColor] = useState("#ffffff");
  const minHeightPx = compact
    ? Math.max(72, rows * 28)
    : Math.max(120, rows * 32);

  const refreshToolbar = useCallback((current: Editor | null) => {
    const styles = resolveTiptapToolbarStyles(current);
    setActiveFont(styles.font);
    setActiveSize(styles.size);
    setActiveColor(styles.color);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      FontFamily.configure({
        types: ["textStyle"],
      }),
      FontSize,
    ],
    content: normalizeEditorInput(value),
    editorProps: {
      attributes: {
        class: "sarjan-tiptap-surface",
        style: `min-height:${minHeightPx}px`,
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onCreate: ({ editor: current }) => {
      refreshToolbar(current);
    },
    onFocus: ({ editor: current }) => {
      refreshToolbar(current);
    },
    onUpdate: ({ editor: current }) => {
      const html = normalizeEditorOutput(current.getHTML());
      skipExternalSyncRef.current = true;
      lastEmittedValueRef.current = html;
      setSource(html);
      onChange(html);
      refreshToolbar(current);
    },
    onSelectionUpdate: ({ editor: current }) => {
      refreshToolbar(current);
    },
  });

  useEffect(() => {
    if (document.getElementById("sarjan-cms-google-fonts")) {
      return;
    }
    const link = document.createElement("link");
    link.id = "sarjan-cms-google-fonts";
    link.rel = "stylesheet";
    link.href = buildGoogleFontsUrl();
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!editor || mode !== "visual") {
      return;
    }
    if (skipExternalSyncRef.current) {
      skipExternalSyncRef.current = false;
      return;
    }
    // Never reset the document while the user is typing — avoids cursor jump / scroll to top.
    if (editor.isFocused) {
      return;
    }
    const next = normalizeEditorInput(value);
    if (next === lastEmittedValueRef.current) {
      return;
    }
    const current = normalizeEditorOutput(editor.getHTML());
    if (next !== current) {
      editor.commands.setContent(next || "<p></p>", { emitUpdate: false });
      lastEmittedValueRef.current = next;
      setSource(next);
      refreshToolbar(editor);
    }
  }, [value, editor, mode, refreshToolbar]);

  const runCommand = (
    build: (
      chain: ReturnType<NonNullable<typeof editor>["chain"]>,
    ) => ReturnType<NonNullable<typeof editor>["chain"]>,
    applyToAllIfCollapsed = false,
  ) => {
    if (!editor) return;
    let chain = editor.chain().focus();
    if (
      applyToAllIfCollapsed &&
      editor.state.selection.empty &&
      editor.state.doc.textContent.trim()
    ) {
      chain = chain.selectAll();
    }
    build(chain).run();
    refreshToolbar(editor);
    const html = normalizeEditorOutput(editor.getHTML());
    skipExternalSyncRef.current = true;
    lastEmittedValueRef.current = html;
    setSource(html);
    onChange(html);
  };

  const applyColor = (color: string) => {
    setActiveColor(color);
    runCommand(
      (chain) => chain.extendMarkRange("textStyle").setColor(color),
      true,
    );
  };

  const colorValue = (() => {
    const normalized = normalizeCmsEditorColor(activeColor);
    return /^#[0-9a-fA-F]{6}$/i.test(normalized) ? normalized : "#ffffff";
  })();

  return (
    <div
      className={`sarjan-html-editor sarjan-tiptap-editor${compact ? " is-compact" : ""}`}
      data-html-editor={instanceId}
    >
      <div className="sarjan-tiptap-toolbar">
        <div className="sarjan-editor-toolbar-row">
          <div className="sarjan-editor-tool-group">
            <span className="sarjan-editor-tool-label">Style</span>
            <div className="sarjan-editor-tool-controls">
              <button
                type="button"
                className={editor?.isActive("bold") ? "active" : ""}
                onClick={() => runCommand((chain) => chain.toggleBold())}
                title="Bold"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                className={editor?.isActive("italic") ? "active" : ""}
                onClick={() => runCommand((chain) => chain.toggleItalic())}
                title="Italic"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                className={editor?.isActive("underline") ? "active" : ""}
                onClick={() => runCommand((chain) => chain.toggleUnderline())}
                title="Underline"
              >
                <u>U</u>
              </button>
            </div>
          </div>

          <div className="sarjan-editor-tool-group">
            <span className="sarjan-editor-tool-label">Font</span>
            <div className="sarjan-editor-tool-controls">
              <select
                value={activeSize}
                onMouseDown={(event) => event.preventDefault()}
                onChange={(event) => {
                  const size = event.target.value;
                  if (!size || !editor) return;
                  setActiveSize(size);
                  runCommand(
                    (chain) =>
                      chain.extendMarkRange("textStyle").setFontSize(size),
                    true,
                  );
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
                onMouseDown={(event) => event.preventDefault()}
                onChange={(event) => {
                  const font = event.target.value;
                  if (!font || !editor) return;
                  setActiveFont(font);
                  runCommand(
                    (chain) =>
                      chain.extendMarkRange("textStyle").setFontFamily(font),
                    true,
                  );
                }}
                aria-label="Font family"
                className="sarjan-html-editor-font"
              >
                <option value="">Family</option>
                {CMS_FONT_FAMILIES.map((font) => (
                  <option value={font} key={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sarjan-editor-tool-group sarjan-editor-tool-group--end">
            <span className="sarjan-editor-tool-label">View</span>
            <div className="sarjan-editor-tool-controls">
              <button
                type="button"
                onClick={() =>
                  runCommand(
                    (chain) => chain.unsetAllMarks().clearNodes(),
                    true,
                  )
                }
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
                  if (mode === "visual" && editor) {
                    const html = normalizeEditorOutput(editor.getHTML());
                    setSource(html);
                  }
                  setMode("source");
                }}
              >
                HTML
              </button>
            </div>
          </div>
        </div>

        <div className="sarjan-editor-toolbar-row sarjan-editor-color-row">
          <span className="sarjan-editor-tool-label">Text color</span>
          <div className="sarjan-editor-color-swatches">
            {CMS_TEXT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`sarjan-editor-color-swatch${colorValue === color.value ? " is-active" : ""}`}
                style={{ backgroundColor: color.value }}
                title={color.label}
                aria-label={`${color.label} text color`}
                onClick={() => applyColor(color.value)}
              />
            ))}
            <button
              type="button"
              className="sarjan-editor-color-custom"
              onClick={() => colorInputRef.current?.click()}
              title="Pick custom color"
            >
              <span
                className="sarjan-editor-color-preview"
                style={{ backgroundColor: colorValue }}
              />
              <span>Custom</span>
            </button>
            <input
              ref={colorInputRef}
              type="color"
              value={colorValue}
              className="sarjan-editor-color-input-hidden"
              onChange={(event) => applyColor(event.target.value)}
              aria-label="Custom text color"
            />
            <span className="sarjan-editor-color-hex">{colorValue}</span>
          </div>
        </div>
      </div>

      <div className="sarjan-tiptap-body">
        {mode === "visual" ? (
          <EditorContent editor={editor} />
        ) : (
          <textarea
            className="sarjan-html-editor-source"
            rows={compact ? Math.max(rows, 4) : Math.max(rows + 2, 6)}
            style={{ minHeight: `${minHeightPx}px` }}
            value={source}
            placeholder={placeholder}
            onChange={(event) => {
              const next = event.target.value;
              skipExternalSyncRef.current = true;
              lastEmittedValueRef.current = normalizeEditorInput(next);
              setSource(next);
              onChange(next);
              if (editor) {
                editor.commands.setContent(
                  lastEmittedValueRef.current || "<p></p>",
                  { emitUpdate: false },
                );
              }
            }}
          />
        )}
      </div>

      {!compact ? (
        <p className="sarjan-html-editor-hint">
          Text select karke ya bina select kiye — size, font, color lagao. Color
          dots se quick pick; Custom se exact shade.
        </p>
      ) : null}
    </div>
  );
}
