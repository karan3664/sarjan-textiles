import { createReadStream } from "fs";
import { stat, writeFile } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import {
  contentTypeForCmsUpload,
  resolveCmsUploadsRoot,
} from "@/lib/cms-uploads-path";
import { emailSiteOrigin } from "@/lib/email-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchLiveCmsUpload(rel: string): Promise<Response | null> {
  if (process.env.NODE_ENV !== "development") return null;
  const origin = emailSiteOrigin();
  try {
    const res = await fetch(`${origin}/uploads/cms/${rel}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return new Response(bytes, {
      headers: {
        "Content-Type":
          res.headers.get("content-type") ?? contentTypeForCmsUpload(rel),
        "Cache-Control": "public, max-age=300",
        "X-Sarjan-Upload-Source": "live-fallback",
      },
    });
  } catch {
    return null;
  }
}

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

  const rel = segments.join("/");

  try {
    const info = await stat(candidate);
    if (!info.isFile()) {
      return new Response("Not found", { status: 404 });
    }
    const stream = createReadStream(candidate);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": contentTypeForCmsUpload(rel),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    const live = await fetchLiveCmsUpload(rel);
    if (live) {
      // Cache on disk so the next request is local (best-effort).
      try {
        const bytes = Buffer.from(await live.clone().arrayBuffer());
        await writeFile(candidate, bytes);
      } catch {
        // Ignore cache write errors (read-only FS, etc.).
      }
      return live;
    }
    return new Response("Not found", { status: 404 });
  }
}
