import { mkdir, readFile, unlink, writeFile } from "fs/promises";

import { assertClientAvatarContentAllowed } from "@/lib/client-avatar-moderation";
import {
  clientAvatarFilePath,
  resolveClientAvatarsRoot,
} from "@/lib/client-avatars-path";
import { clientStatusAuthError } from "@/lib/client-approved-session";
import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { getClient, publicClient, updateClient } from "@/lib/local-db";
import { readAvatarUploadBody } from "@/lib/avatar-upload-body";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

async function deleteLocalAvatarFile(clientId: string) {
  await unlink(clientAvatarFilePath(clientId)).catch(() => null);
}

/** Serve uploaded avatars via API — runtime uploads are not always reachable as static files. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id?.trim()) {
    return new Response(null, { status: 400 });
  }

  try {
    const data = await readFile(clientAvatarFilePath(id.trim()));
    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

async function authorizeAvatarRequest(request: Request, id: string) {
  const session = await verifyClientToken(bearerToken(request));
  if (!session || session.clientId !== id) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const row = await getClient(id);
  if (!row) {
    return {
      error: Response.json({ error: "Client not found" }, { status: 404 }),
    };
  }
  const blocked = clientStatusAuthError(row.status);
  if (blocked) {
    return { error: Response.json({ error: blocked }, { status: 403 }) };
  }

  return { session, row };
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await authorizeAvatarRequest(request, id);
  if ("error" in auth && auth.error) return auth.error;

  await deleteLocalAvatarFile(id);

  const client = await updateClient(id, { avatarUrl: "" });
  return Response.json({ client: publicClient(client) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await authorizeAvatarRequest(request, id);
    if ("error" in auth && auth.error) return auth.error;

    const limit = await rateLimit(
      rateLimitKey(request, "avatar-upload", id),
      5,
      60 * 60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const upload = await readAvatarUploadBody(request);
    if (upload instanceof Response) {
      return upload;
    }
    const input = upload.buffer;
    let webp: Buffer;
    try {
      webp = await sharp(input)
        .rotate()
        .resize({ width: 512, height: 512, fit: "cover" })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
    } catch {
      return Response.json(
        { error: "Could not read image file" },
        { status: 400 },
      );
    }

    try {
      await assertClientAvatarContentAllowed(webp);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "AVATAR_CONTENT_REJECTED"
      ) {
        return Response.json(
          {
            error:
              "This image was blocked: use a professional headshot (with shirt) or company logo only — shirtless, nude, and suggestive photos are not allowed.",
          },
          { status: 422 },
        );
      }
      if (
        error instanceof Error &&
        error.message === "AVATAR_MODERATION_DISABLED"
      ) {
        return Response.json(
          {
            error:
              "Image safety checks are disabled on this server. Contact support.",
          },
          { status: 503 },
        );
      }
      return Response.json(
        {
          error:
            "Could not verify image content. Try another image or retry in a moment.",
        },
        { status: 503 },
      );
    }

    const avatarUrl = `/sarjan-assets/client-avatars/${id}.webp?v=${Date.now()}`;
    try {
      await mkdir(resolveClientAvatarsRoot(), { recursive: true });
      await writeFile(clientAvatarFilePath(id), webp);
    } catch (error) {
      console.error("[avatar-upload] file save failed:", error);
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Avatar save failed",
        },
        { status: 500 },
      );
    }

    try {
      const client = await updateClient(id, { avatarUrl });
      return Response.json({ client: publicClient(client) });
    } catch (error) {
      await deleteLocalAvatarFile(id).catch(() => null);
      console.error("[avatar-upload] db update failed:", error);
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not save profile photo",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[avatar-upload] unexpected failure:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Profile photo upload failed",
      },
      { status: 500 },
    );
  }
}
