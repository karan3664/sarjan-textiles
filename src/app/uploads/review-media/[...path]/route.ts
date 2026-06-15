import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import {
  contentTypeForReviewMedia,
  resolveLegacyReviewMediaRoot,
  resolveReviewMediaRoot,
} from "@/lib/review-media-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves review photos/videos from the persistent uploads volume.
 * Same pattern as /uploads/cms/* — survives Coolify redeploys.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  if (!segments?.length) {
    return new Response("Not found", { status: 404 });
  }

  const base = path.resolve(resolveReviewMediaRoot());
  const candidate = path.resolve(path.join(base, ...segments));

  if (!candidate.startsWith(`${base}${path.sep}`) && candidate !== base) {
    return new Response("Invalid path", { status: 400 });
  }

  try {
    const info = await stat(candidate);
    if (!info.isFile()) {
      return new Response("Not found", { status: 404 });
    }
    const stream = createReadStream(candidate);
    const rel = segments.join("/");
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": contentTypeForReviewMedia(rel),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
