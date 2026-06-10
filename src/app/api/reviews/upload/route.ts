import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const imageMaxBytes = 6 * 1024 * 1024;
const videoMaxBytes = 40 * 1024 * 1024;
const uploadDir = path.join(
  process.cwd(),
  "public",
  "sarjan-assets",
  "review-uploads",
);

function isImage(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name)
  );
}

function isVideo(file: File) {
  return (
    file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(file.name)
  );
}

export async function POST(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const { client } = auth;

  const limit = rateLimit(
    rateLimitKey(request, "review-upload", client.email),
    12,
    60_000,
  );
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "File required" }, { status: 400 });
  }

  const kind = String(formData.get("kind") ?? "image");
  const buffer = Buffer.from(await file.arrayBuffer());

  if (kind === "video" || isVideo(file)) {
    if (buffer.byteLength > videoMaxBytes) {
      return Response.json(
        { error: "Video must be under 40 MB." },
        { status: 400 },
      );
    }
    await mkdir(uploadDir, { recursive: true });
    const filename = `${client.id}-${Date.now()}.mp4`;
    await writeFile(path.join(uploadDir, filename), buffer);
    return Response.json({
      url: `/sarjan-assets/review-uploads/${filename}`,
      kind: "video",
    });
  }

  if (!isImage(file)) {
    return Response.json(
      { error: "Image or video file required." },
      { status: 400 },
    );
  }
  if (buffer.byteLength > imageMaxBytes) {
    return Response.json(
      { error: "Image must be under 6 MB." },
      { status: 400 },
    );
  }

  await mkdir(uploadDir, { recursive: true });
  const filename = `${client.id}-${Date.now()}.webp`;
  const output = await sharp(buffer)
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  await writeFile(path.join(uploadDir, filename), output);

  return Response.json({
    url: `/sarjan-assets/review-uploads/${filename}`,
    kind: "image",
  });
}
