import { mkdir, writeFile } from "fs/promises";
import sharp from "sharp";
import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { validateReviewVideoBuffer } from "@/lib/file-magic";
import { reviewMediaPublicUrl } from "@/lib/review-media-path";
import { persistReviewMediaFile } from "@/lib/review-media-store";
import { readReviewUploadBody } from "@/lib/review-upload-body";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  try {
    if (kind === "video") {
      if (!validateReviewVideoBuffer(buffer)) {
        return Response.json({ error: "Invalid video file." }, { status: 400 });
      }
      const filename = `${client.id}-${Date.now()}.mp4`;
      await persistReviewMediaFile(filename, buffer, "video/mp4");
      return Response.json({
        url: reviewMediaPublicUrl(filename),
        kind: "video",
      });
    }

    const filename = `${client.id}-${Date.now()}.webp`;
    const output = await sharp(buffer)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    await persistReviewMediaFile(filename, output, "image/webp");

    return Response.json({
      url: reviewMediaPublicUrl(filename),
      kind: "image",
    });
  } catch (error) {
    console.error(
      "[review-upload]",
      error instanceof Error ? error.message : error,
    );
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save review media.",
      },
      { status: 500 },
    );
  }
}
