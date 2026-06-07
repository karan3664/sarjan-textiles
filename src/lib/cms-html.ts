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
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "small",
  "sub",
  "sup",
];

function looksLikeHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}

/** Plain CMS text → safe HTML (preserves line breaks from legacy content). */
export function plainTextToCmsHtml(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("<br />");
}

export function sanitizeCmsHtml(value: string): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  const html = looksLikeHtml(raw) ? raw : plainTextToCmsHtml(raw);
  return sanitizeHtml(html, {
    allowedTags: CMS_ALLOWED_TAGS,
    allowedAttributes: {
      "*": ["style", "class"],
      a: ["href", "target", "rel"],
    },
  });
}
