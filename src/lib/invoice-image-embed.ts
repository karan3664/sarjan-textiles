import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { stripSameOriginAbsoluteUrl } from "@/lib/cms-media-url";
import { contentTypeForCmsUpload } from "@/lib/cms-uploads-path";
import { emailSiteOrigin } from "@/lib/email-template";

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
    case "svg":
      return "image/svg+xml";
    default:
      return contentTypeForCmsUpload(filePath);
  }
}

export function normalizeInvoiceImagePath(value: string): string {
  const raw = stripSameOriginAbsoluteUrl(value.trim());
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/** Public site URL for invoice HTML (browser / fetch fallback). */
export function absoluteInvoiceImageUrl(value: string): string {
  const relative = normalizeInvoiceImagePath(value);
  if (!relative) return "";
  if (/^https?:\/\//i.test(relative)) return relative;
  const base = emailSiteOrigin().replace(/\/$/, "");
  return `${base}${relative}`;
}

function localPublicFilePath(relativePath: string): string | null {
  const normalized = normalizeInvoiceImagePath(relativePath);
  if (!normalized || /^https?:\/\//i.test(normalized)) return null;
  if (!normalized.startsWith("/")) return null;
  return path.join(process.cwd(), "public", normalized.slice(1));
}

/** Inline image bytes for Chromium PDF / email attachments (no network fetch in headless). */
export async function invoiceImageToDataUrl(src: string): Promise<string> {
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("data:")) return trimmed;

  const localPath = localPublicFilePath(trimmed);
  if (localPath) {
    try {
      const bytes = await readFile(localPath);
      const mime = mimeFromPath(localPath);
      return `data:${mime};base64,${bytes.toString("base64")}`;
    } catch {
      // Fall through to HTTP fetch (ai-products API paths, missing local copy, etc.).
    }
  }

  const url = absoluteInvoiceImageUrl(trimmed);
  if (!url) return "";

  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const bytes = Buffer.from(await response.arrayBuffer());
    const headerMime = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim();
    const mime =
      headerMime && headerMime.startsWith("image/")
        ? headerMime
        : mimeFromPath(url);
    if (!mime.startsWith("image/")) return "";
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return "";
  }
}
