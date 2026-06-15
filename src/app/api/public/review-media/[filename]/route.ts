import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_ROOT = path.join(
  process.cwd(),
  "public",
  "sarjan-assets",
  "review-uploads",
);

function contentType(filename: string) {
  if (/\.webp$/i.test(filename)) return "image/webp";
  if (/\.jpe?g$/i.test(filename)) return "image/jpeg";
  if (/\.png$/i.test(filename)) return "image/png";
  if (/\.mp4$/i.test(filename)) return "video/mp4";
  if (/\.mov$/i.test(filename)) return "video/quicktime";
  if (/\.webm$/i.test(filename)) return "video/webm";
  return "application/octet-stream";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  const safe = path.basename(filename ?? "");
  if (!safe || safe !== filename) {
    return new Response("Not found", { status: 404 });
  }

  const candidate = path.join(UPLOAD_ROOT, safe);
  try {
    await stat(candidate);
    const stream = createReadStream(candidate);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": contentType(safe),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
