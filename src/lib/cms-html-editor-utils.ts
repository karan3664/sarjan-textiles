export const CMS_FONT_FAMILIES = [
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

export const CMS_TEXT_COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Black", value: "#111111" },
  { label: "Maroon", value: "#8b1f2d" },
  { label: "Gold", value: "#c9a227" },
  { label: "Cream", value: "#f5f0e8" },
  { label: "Gray", value: "#6b7280" },
  { label: "Red", value: "#dc2626" },
  { label: "Green", value: "#16a34a" },
  { label: "Blue", value: "#2563eb" },
] as const;

export type CmsEditorStyleProperty = "fontFamily" | "fontSize" | "color";

export const CMS_FONT_SIZES = [
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

export function normalizeFontFamily(value: string) {
  return value.replace(/['"]/g, "").split(",")[0]?.trim() ?? "";
}

export function matchCmsFontFamily(computed: string) {
  const normalized = normalizeFontFamily(computed);
  if (!normalized) {
    return "";
  }
  return (
    CMS_FONT_FAMILIES.find(
      (font) =>
        normalized.toLowerCase().includes(font.toLowerCase()) ||
        font.toLowerCase().includes(normalized.toLowerCase()),
    ) ?? ""
  );
}

export function isSelectionWithinEditor(
  editor: HTMLElement | null,
  selection: Selection | null,
) {
  if (!editor || !selection?.anchorNode) {
    return false;
  }
  return editor.contains(selection.anchorNode);
}

export function buildGoogleFontsUrl() {
  const systemFonts = new Set([
    "Arial",
    "Helvetica",
    "Verdana",
    "Tahoma",
    "Trebuchet MS",
    "Georgia",
    "Times New Roman",
    "Courier New",
    "Palatino Linotype",
  ]);
  const families = CMS_FONT_FAMILIES.filter((font) => !systemFonts.has(font))
    .map((font) => `${font.replace(/ /g, "+")}:wght@400;500;600;700`)
    .join("&family=");
  return `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
}

/** Convert legacy `<font face="...">` markup to inline span styles. */
export function normalizeLegacyFontHtml(html: string): string {
  if (!html || !/<font[\s>/]/i.test(html)) {
    return html;
  }

  if (typeof document === "undefined") {
    let next = html;
    let pass = 0;
    while (/<font[\s>/]/i.test(next) && pass < 8) {
      pass += 1;
      next = next.replace(
        /<font\s([^>]*)>([\s\S]*?)<\/font>/gi,
        (_match, attrs: string, inner: string) => {
          const styleParts: string[] = [];
          const face =
            attrs.match(/face\s*=\s*["']([^"']+)["']/i)?.[1] ??
            attrs.match(/face\s*=\s*([^\s>]+)/i)?.[1];
          const color =
            attrs.match(/color\s*=\s*["']([^"']+)["']/i)?.[1] ??
            attrs.match(/color\s*=\s*([^\s>]+)/i)?.[1];
          if (face) {
            styleParts.push(`font-family: '${face.trim()}', sans-serif`);
          }
          if (color) {
            styleParts.push(`color: ${color.trim()}`);
          }
          const style =
            styleParts.length > 0 ? ` style="${styleParts.join("; ")}"` : "";
          return `<span${style}>${inner}</span>`;
        },
      );
    }
    return next.replace(/<\/?font[^>]*>/gi, "");
  }

  const root = document.createElement("div");
  root.innerHTML = html;
  let changed = true;
  while (changed) {
    changed = false;
    root.querySelectorAll("font").forEach((font) => {
      changed = true;
      const span = document.createElement("span");
      const face = font.getAttribute("face");
      const color = font.getAttribute("color");
      if (face) {
        span.style.fontFamily = `'${face.trim()}', sans-serif`;
      }
      if (color) {
        span.style.color = color;
      }
      while (font.firstChild) {
        span.appendChild(font.firstChild);
      }
      font.replaceWith(span);
    });
  }
  return root.innerHTML;
}

function unwrapFontElements(container: ParentNode) {
  container.querySelectorAll("font").forEach((font) => {
    const span = document.createElement("span");
    while (font.firstChild) {
      span.appendChild(font.firstChild);
    }
    font.replaceWith(span);
  });
}

function normalizeEditorColor(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.startsWith("#") && trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return trimmed;
}

function readInlineStyleFromNode(
  node: Node | null,
  editor: HTMLElement,
  property: CmsEditorStyleProperty,
): string {
  let current: Node | null = node;
  if (current?.nodeType === Node.TEXT_NODE) {
    current = current.parentElement;
  }
  while (current && current !== editor) {
    if (current instanceof HTMLElement) {
      if (current.tagName === "FONT") {
        if (property === "fontFamily") {
          const face = current.getAttribute("face");
          if (face) {
            return matchCmsFontFamily(face) || normalizeFontFamily(face);
          }
        }
        if (property === "color") {
          const color = current.getAttribute("color");
          if (color) {
            return normalizeEditorColor(color);
          }
        }
      }
      const inline = current.style[property];
      if (inline) {
        if (property === "fontFamily") {
          return normalizeFontFamily(inline);
        }
        if (property === "color") {
          return normalizeEditorColor(inline);
        }
        return inline;
      }
    }
    current = current.parentElement;
  }
  return "";
}

/** Dominant inline font/size on editor content (ignores surface default CSS). */
export function detectEditorContentStyle(
  editor: HTMLDivElement | null,
  property: CmsEditorStyleProperty,
): string {
  if (!editor || typeof document === "undefined") {
    return "";
  }

  const values = new Set<string>();
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let textNode: Node | null;
  while ((textNode = walker.nextNode())) {
    if (!textNode.textContent?.trim()) {
      continue;
    }
    const style = readInlineStyleFromNode(textNode, editor, property);
    if (style) {
      values.add(style);
    }
  }

  if (values.size === 1) {
    return [...values][0] ?? "";
  }
  return "";
}

export function resolveEditorToolbarStyle(
  editor: HTMLDivElement | null,
  property: CmsEditorStyleProperty,
  selection: Selection | null,
): string {
  if (!editor) {
    return "";
  }
  if (isSelectionWithinEditor(editor, selection) && selection?.rangeCount) {
    const range = selection.getRangeAt(0);
    const atCaret = readInlineStyleFromNode(
      range.commonAncestorContainer,
      editor,
      property,
    );
    if (atCaret) {
      return atCaret;
    }
    if (!range.collapsed) {
      const start = readInlineStyleFromNode(
        range.startContainer,
        editor,
        property,
      );
      const end = readInlineStyleFromNode(range.endContainer, editor, property);
      if (start && start === end) {
        return start;
      }
    }
  }
  return detectEditorContentStyle(editor, property);
}

function selectEntireEditor(editor: HTMLDivElement, selection: Selection) {
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.removeAllRanges();
  selection.addRange(range);
  return range;
}

function cssForEditorStyle(property: CmsEditorStyleProperty, value: string) {
  if (property === "fontFamily") {
    return `font-family: '${value}', sans-serif`;
  }
  if (property === "fontSize") {
    return `font-size: ${value}`;
  }
  return `color: ${value}`;
}

export function applyCmsEditorInlineStyle(
  editor: HTMLDivElement | null,
  property: CmsEditorStyleProperty,
  value: string,
  savedRange: Range | null,
  options?: { applyToAll?: boolean },
) {
  if (!editor || typeof document === "undefined") {
    return;
  }

  editor.focus();
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  let range: Range | null = null;

  if (options?.applyToAll) {
    range = selectEntireEditor(editor, selection);
  } else if (
    savedRange &&
    editor.contains(savedRange.commonAncestorContainer)
  ) {
    selection.removeAllRanges();
    selection.addRange(savedRange.cloneRange());
    range = selection.getRangeAt(0);
  } else if (selection.rangeCount) {
    const candidate = selection.getRangeAt(0);
    if (editor.contains(candidate.commonAncestorContainer)) {
      range = candidate;
    }
  }

  if (!range) {
    range = selectEntireEditor(editor, selection);
  }

  if (range.collapsed) {
    range = selectEntireEditor(editor, selection);
    if (!range.toString().trim() && !editor.textContent?.trim()) {
      const css = cssForEditorStyle(property, value);
      editor.innerHTML = `<span style="${css}"><br></span>`;
      const next = document.createRange();
      next.selectNodeContents(editor);
      next.collapse(false);
      selection.removeAllRanges();
      selection.addRange(next);
      return;
    }
  }

  const span = document.createElement("span");
  if (property === "fontFamily") {
    span.style.fontFamily = `'${value}', sans-serif`;
  } else if (property === "fontSize") {
    span.style.fontSize = value;
  } else {
    span.style.color = value;
  }

  try {
    const fragment = range.extractContents();
    unwrapFontElements(fragment);
    span.appendChild(fragment);
    range.insertNode(span);
    selection.removeAllRanges();
    const next = document.createRange();
    next.selectNodeContents(span);
    selection.addRange(next);
  } catch {
    const css = cssForEditorStyle(property, value);
    document.execCommand(
      "insertHTML",
      false,
      `<span style="${css}">${range.toString()}</span>`,
    );
  }
}
