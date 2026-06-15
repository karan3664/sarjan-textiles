import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import {
  contentTypeForReviewMedia,
  legacyReviewMediaFilePath,
  reviewMediaFilePath,
} from "@/lib/review-media-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fallback for reviews saved before the persistent uploads path (pre-v1.0.86). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  const safe = (filename ?? "").trim();
  if (!safe || safe.includes("/") || safe.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const candidates = [
    reviewMediaFilePath(safe),
    legacyReviewMediaFilePath(safe),
  ];

  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (!info.isFile()) continue;
      const stream = createReadStream(candidate);
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        headers: {
          "Content-Type": contentTypeForReviewMedia(safe),
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch {
      /* try next root */
    }
  }

  return new Response("Not found", { status: 404 });
}
