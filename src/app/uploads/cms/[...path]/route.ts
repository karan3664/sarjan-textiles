import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import {
  contentTypeForCmsUpload,
  resolveCmsUploadsRoot,
} from "@/lib/cms-uploads-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves CMS uploads written at runtime (admin → /api/admin/uploads).
 * Next.js standalone only bundles public/ files from build time; new uploads need this route.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  if (!segments?.length) {
    return new Response("Not found", { status: 404 });
  }

  const base = path.resolve(resolveCmsUploadsRoot());
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
        "Content-Type": contentTypeForCmsUpload(rel),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
