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

export function applyCmsEditorInlineStyle(
  editor: HTMLDivElement | null,
  property: "fontFamily" | "fontSize",
  value: string,
  savedRange: Range | null,
) {
  if (!editor || typeof document === "undefined") {
    return;
  }

  editor.focus();
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  if (savedRange) {
    selection.removeAllRanges();
    selection.addRange(savedRange.cloneRange());
  }

  if (!selection.rangeCount) {
    return;
  }

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) {
    return;
  }

  if (range.collapsed) {
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
    if (!range.toString().trim() && !editor.textContent?.trim()) {
      return;
    }
  }

  const span = document.createElement("span");
  if (property === "fontFamily") {
    span.style.fontFamily = `'${value}', sans-serif`;
  } else {
    span.style.fontSize = value;
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
    const css =
      property === "fontFamily"
        ? `font-family: '${value}', sans-serif`
        : `font-size: ${value}`;
    document.execCommand(
      "insertHTML",
      false,
      `<span style="${css}">${range.toString()}</span>`,
    );
  }
}
