import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { assertClientAvatarContentAllowed } from "@/lib/client-avatar-moderation";
import { clientStatusAuthError } from "@/lib/client-approved-session";
import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { getClient, publicClient, updateClient } from "@/lib/local-db";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxBytes = 4 * 1024 * 1024;
const localAvatarDir = path.join(
  process.cwd(),
  "public",
  "sarjan-assets",
  "client-avatars",
);
const storageBucket = "cms-media";

function supabaseAdmin() {
  if (process.env.SUPABASE_ENABLED !== "true") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name)
  );
}

async function uploadAvatarToSupabase(
  clientId: string,
  buffer: Buffer,
  contentType: string,
) {
  const supabase = supabaseAdmin();
  if (!supabase) return null;

  await supabase.storage
    .createBucket(storageBucket, { public: true })
    .catch(() => null);

  const storagePath = `avatars/${clientId}.webp`;
  const { error } = await supabase.storage
    .from(storageBucket)
    .upload(storagePath, buffer, {
      cacheControl: "3600",
      contentType,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from(storageBucket)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

async function deleteAvatarFromSupabase(clientId: string) {
  const supabase = supabaseAdmin();
  if (!supabase) return;
  await supabase.storage
    .from(storageBucket)
    .remove([`avatars/${clientId}.webp`])
    .catch(() => null);
}

async function deleteLocalAvatarFile(clientId: string) {
  const filename = `${clientId}.webp`;
  await unlink(path.join(localAvatarDir, filename)).catch(() => null);
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

  await Promise.all([deleteLocalAvatarFile(id), deleteAvatarFromSupabase(id)]);

  const client = await updateClient(id, { avatarUrl: "" });
  return Response.json({ client: publicClient(client) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await authorizeAvatarRequest(request, id);
  if ("error" in auth && auth.error) return auth.error;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Image file required" }, { status: 400 });
  }
  if (!isImageFile(file)) {
    return Response.json(
      { error: "Only image uploads allowed" },
      { status: 400 },
    );
  }
  if (file.size > maxBytes) {
    return Response.json({ error: "Image must be under 4MB" }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());
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
    if (error instanceof Error && error.message === "AVATAR_CONTENT_REJECTED") {
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

  let avatarUrl: string;
  try {
    const remote = await uploadAvatarToSupabase(id, webp, "image/webp");
    if (remote) {
      avatarUrl = remote;
    } else {
      await mkdir(localAvatarDir, { recursive: true });
      const filename = `${id}.webp`;
      await writeFile(path.join(localAvatarDir, filename), webp);
      avatarUrl = `/sarjan-assets/client-avatars/${filename}`;
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Avatar save failed" },
      { status: 500 },
    );
  }

  const client = await updateClient(id, { avatarUrl });
  return Response.json({ client: publicClient(client) });
}
