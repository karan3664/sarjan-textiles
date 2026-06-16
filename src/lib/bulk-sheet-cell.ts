/** Normalize Excel / CSV cell values (hyperlinks, rich text) to plain strings. */
export function extractSheetCellText(value: unknown): string {
  if (value == null) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim();
  }
  if (typeof value !== "object") return String(value).trim();

  const record = value as {
    hyperlink?: string;
    text?: unknown;
    richText?: Array<{ text?: string }>;
    result?: unknown;
  };

  if (typeof record.hyperlink === "string") {
    const chunks = [record.hyperlink];
    const text = extractSheetCellText(record.text);
    if (text) chunks.push(text);
    return dedupeCommaList(chunks.join("\n"));
  }

  if (Array.isArray(record.richText)) {
    return record.richText
      .map((part) => part.text ?? "")
      .join("")
      .trim();
  }

  if (record.text != null) return extractSheetCellText(record.text);
  if (record.result != null) return extractSheetCellText(record.result);

  return String(value).trim();
}

function dedupeCommaList(raw: string): string {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of raw.split(/[\n,]+/)) {
    const trimmed = part.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    items.push(trimmed);
  }
  return items.join(",");
}

export function splitSheetList(value: unknown): string[] {
  const text = extractSheetCellText(value);
  if (!text) return [];
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function splitSheetImageUrls(value: unknown): string[] {
  const text = extractSheetCellText(value);
  if (!text) return [];
  return text
    .split(/[\n,]+/)
    .map((item) => item.trim().replace(/[.,;]+$/, ""))
    .filter((item) => /^https?:\/\//i.test(item) || item.startsWith("/"));
}
