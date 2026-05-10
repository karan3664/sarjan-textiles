import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const uploadDir = path.join(process.cwd(), "public", "uploads", "cms");
const storageBucket = "cms-media";
const maxUploadBytes = 30 * 1024 * 1024;
const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif"];

function extensionFromFile(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && allowedExtensions.includes(fromName)) return fromName;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type === "image/avif") return "avif";
  return "png";
}

function isImageFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return file.type.startsWith("image/") || Boolean(extension && allowedExtensions.includes(extension));
}

function supabaseAdmin() {
  if (process.env.SUPABASE_ENABLED !== "true") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

async function imageBuffer(file: File) {
  const input = Buffer.from(await file.arrayBuffer());

  try {
    const transformed = await sharp(input)
      .rotate()
      .resize({ width: 1800, withoutEnlargement: true })
      .webp({ quality: 76, effort: 4 })
      .toBuffer();

    return {
      buffer: transformed,
      extension: "webp",
      contentType: "image/webp",
    };
  } catch {
    return {
      buffer: input,
      extension: extensionFromFile(file),
      contentType: file.type || "application/octet-stream",
    };
  }
}

async function uploadToSupabase(filename: string, buffer: Buffer, contentType: string) {
  const supabase = supabaseAdmin();
  if (!supabase) return null;

  await supabase.storage.createBucket(storageBucket, { public: true }).catch(() => null);

  const storagePath = `cms/${filename}`;
  const { error } = await supabase.storage.from(storageBucket).upload(storagePath, buffer, {
    cacheControl: "31536000",
    contentType,
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(storageBucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Image file required" }, { status: 400 });
  }

  if (!isImageFile(file)) {
    return Response.json({ error: "Only image uploads allowed" }, { status: 400 });
  }

  if (file.size > maxUploadBytes) {
    return Response.json({ error: "Image must be under 30MB" }, { status: 400 });
  }

  const image = await imageBuffer(file);
  const extension = image.extension;
  const filename = `${Date.now()}-${randomUUID()}.${extension}`;

  try {
    const supabaseUrl = await uploadToSupabase(filename, image.buffer, image.contentType);
    if (supabaseUrl) {
      return Response.json({
        url: supabaseUrl,
        name: file.name,
        size: image.buffer.length,
        type: image.contentType,
      });
    }
  } catch (error) {
    if (process.env.VERCEL) {
      return Response.json({
        error: error instanceof Error ? error.message : "Supabase upload failed",
      }, { status: 500 });
    }
    // Keep local dev usable when Supabase Storage is unreachable.
  }

  await mkdir(uploadDir, { recursive: true });
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, image.buffer);

  return Response.json({
    url: `/uploads/cms/${filename}`,
    name: file.name,
    size: image.buffer.length,
    type: image.contentType,
  });
}
