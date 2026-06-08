"use client";

import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import {
  buildGoogleFontsUrl,
  CMS_FONT_FAMILIES,
  CMS_FONT_SIZES,
  CMS_TEXT_COLORS,
  normalizeLegacyFontHtml,
} from "@/lib/cms-html-editor-utils";
import { FontSize } from "@/lib/tiptap-font-size";

type Props = {
  value: string;
  onChange: (html: string) => void;
  rows?: number;
  placeholder?: string;
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
}: Props) {
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [source, setSource] = useState(value);
  const [activeFont, setActiveFont] = useState("");
  const [activeSize, setActiveSize] = useState("");
  const [activeColor, setActiveColor] = useState("#111111");
  const minHeightPx = Math.max(140, rows * 36);

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
    onUpdate: ({ editor: current }) => {
      const html = normalizeEditorOutput(current.getHTML());
      setSource(html);
      onChange(html);
    },
    onSelectionUpdate: ({ editor: current }) => {
      const attrs = current.getAttributes("textStyle");
      setActiveFont(attrs.fontFamily || "");
      setActiveSize(attrs.fontSize || "");
      setActiveColor(attrs.color || "#111111");
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
    const next = normalizeEditorInput(value);
    const current = normalizeEditorOutput(editor.getHTML());
    if (next !== current) {
      editor.commands.setContent(next || "<p></p>", { emitUpdate: false });
      setSource(next);
    }
  }, [value, editor, mode]);

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
    const html = normalizeEditorOutput(editor.getHTML());
    setSource(html);
    onChange(html);
  };

  return (
    <div className="sarjan-html-editor sarjan-tiptap-editor">
      <div className="sarjan-html-editor-toolbar sarjan-tiptap-toolbar">
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

        <select
          value={activeSize}
          onChange={(event) => {
            const size = event.target.value;
            if (!size || !editor) return;
            runCommand((chain) => chain.setFontSize(size), true);
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
            if (!font || !editor) return;
            runCommand((chain) => chain.setFontFamily(font), true);
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
            if (!color || !editor) return;
            runCommand((chain) => chain.setColor(color), true);
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
            /^#[0-9a-fA-F]{6}$/.test(activeColor) ? activeColor : "#111111"
          }
          onChange={(event) => {
            if (!editor) return;
            runCommand((chain) => chain.setColor(event.target.value), true);
          }}
          aria-label="Custom text color"
          className="sarjan-html-editor-color"
          title="Custom color"
        />

        <button
          type="button"
          onClick={() =>
            runCommand((chain) => chain.unsetAllMarks().clearNodes(), true)
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

      {mode === "visual" ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          className="sarjan-html-editor-source"
          rows={Math.max(rows + 2, 8)}
          style={{ minHeight: `${minHeightPx}px` }}
          value={source}
          placeholder={placeholder}
          onChange={(event) => {
            const next = event.target.value;
            setSource(next);
            onChange(next);
            if (editor) {
              editor.commands.setContent(
                normalizeEditorInput(next) || "<p></p>",
                { emitUpdate: false },
              );
            }
          }}
        />
      )}

      <p className="sarjan-html-editor-hint">
        Select text, then pick size, font, or color from the toolbar. No
        selection applies formatting to the whole field. Use HTML tab for raw
        markup.
      </p>
    </div>
  );
}
