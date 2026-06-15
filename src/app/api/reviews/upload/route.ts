import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { validateReviewVideoBuffer } from "@/lib/file-magic";
import { readReviewUploadBody } from "@/lib/review-upload-body";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const uploadDir = path.join(
  process.cwd(),
  "public",
  "sarjan-assets",
  "review-uploads",
);

export async function POST(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const { client } = auth;

  const limit = await rateLimit(
    rateLimitKey(request, "review-upload", client.email),
    12,
    60_000,
  );
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const upload = await readReviewUploadBody(request);
  if (upload instanceof Response) {
    return upload;
  }

  const { buffer, kind } = upload;

  if (kind === "video") {
    if (!validateReviewVideoBuffer(buffer)) {
      return Response.json({ error: "Invalid video file." }, { status: 400 });
    }
    await mkdir(uploadDir, { recursive: true });
    const filename = `${client.id}-${Date.now()}.mp4`;
    await writeFile(path.join(uploadDir, filename), buffer);
    return Response.json({
      url: `/sarjan-assets/review-uploads/${filename}`,
      kind: "video",
    });
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
