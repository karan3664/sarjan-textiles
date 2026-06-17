import sanitizeHtml from "sanitize-html";

const CMS_ALLOWED_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "br",
  "p",
  "span",
  "font",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "small",
  "sub",
  "sup",
  "ul",
  "ol",
  "li",
];

function looksLikeHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}

function escapeHtmlText(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isCmsHtmlContent(value: string): boolean {
  return looksLikeHtml(value?.trim() ?? "");
}

function plainTextLinesToHtmlBlock(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "";

  const bulletLines = lines.filter((line) => /^[-•*]\s+/.test(line));
  if (bulletLines.length >= 1 && bulletLines.length === lines.length) {
    const items = lines.map((line) => line.replace(/^[-•*]\s+/, ""));
    return `<ul>${items.map((item) => `<li>${escapeHtmlText(item)}</li>`).join("")}</ul>`;
  }

  const numberedLines = lines.filter((line) => /^\d+[.)]\s+/.test(line));
  if (numberedLines.length >= 1 && numberedLines.length === lines.length) {
    const items = lines.map((line) => line.replace(/^\d+[.)]\s+/, ""));
    return `<ol>${items.map((item) => `<li>${escapeHtmlText(item)}</li>`).join("")}</ol>`;
  }

  if (lines.length > 1) {
    return lines.map((line) => `<p>${escapeHtmlText(line)}</p>`).join("");
  }

  return `<p>${escapeHtmlText(text.trim())}</p>`;
}

/** Plain CMS text → safe HTML (preserves line breaks and bullet lists). */
export function plainTextToCmsHtml(value: string): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) return "";
  if (looksLikeHtml(normalized)) return normalized;

  const paragraphs = splitCmsTextParagraphs(normalized);
  if (!paragraphs.length) return "";
  return paragraphs.map((part) => plainTextLinesToHtmlBlock(part)).join("");
}

/** Plain text → TipTap / CMS editor HTML with one `<p>` per paragraph. */
export function plainTextToEditorHtml(value: string): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  if (looksLikeHtml(raw)) return raw;

  const paragraphs = splitCmsTextParagraphs(raw);
  if (!paragraphs.length) return "";
  return paragraphs.map((part) => `<p>${escapeHtmlText(part)}</p>`).join("");
}

/** Split plain CMS copy into separate paragraphs (blank lines or single newlines). */
export function splitCmsTextParagraphs(value: string): string[] {
  const normalized = value?.trim() ?? "";
  if (!normalized) return [];
  if (looksLikeHtml(normalized)) return [normalized];

  const byBlankLine = normalized
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (byBlankLine.length > 1) return byBlankLine;

  return normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function sanitizeCmsHtml(value: string): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  const html = looksLikeHtml(raw) ? raw : plainTextToCmsHtml(raw);
  return sanitizeHtml(html, {
    allowedTags: CMS_ALLOWED_TAGS,
    allowedAttributes: {
      "*": ["style", "class"],
      font: ["face", "size", "color"],
      a: ["href", "target", "rel"],
    },
    allowedStyles: {
      "*": {
        color: [
          /^#[0-9a-fA-F]{3,8}$/i,
          /^rgb\(/i,
          /^rgba\(/i,
          /^hsl\(/i,
          /^hsla\(/i,
        ],
        "background-color": [/^#[0-9a-fA-F]{3,8}$/i, /^rgb\(/i, /^rgba\(/i],
        "font-size": [/^\d+(?:\.\d+)?(?:px|rem|em|%|pt)$/],
        "font-family": [/.*/],
        "font-weight": [/^\d{3}$/, /^bold$/, /^normal$/],
        "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
        "line-height": [/^\d+(?:\.\d+)?(?:px|rem|em|%)?$/],
      },
    },
  });
}
