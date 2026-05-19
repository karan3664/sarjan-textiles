import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import {
  contentTypeForProductFile,
  resolveAiStudioPublicRoot,
} from "@/lib/ai-product-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves approved AI studio images from the writable public-root directory.
 * On Vercel this is under /tmp (see resolveAiStudioPublicRoot); locally it mirrors public/uploads/ai-products.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  if (!segments?.length) {
    return new Response("Not found", { status: 404 });
  }

  const base = path.resolve(resolveAiStudioPublicRoot());
  const candidate = path.resolve(path.join(base, ...segments));

  if (!candidate.startsWith(base + path.sep)) {
    return new Response("Invalid path", { status: 400 });
  }

  try {
    await stat(candidate);
    const stream = createReadStream(candidate);
    const rel = segments.join("/");
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": contentTypeForProductFile(rel),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
