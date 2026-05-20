import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  processAuthBannerUpload,
  toAuthBannerAsset,
} from "@/lib/auth-banner-process";

export const runtime = "nodejs";

const uploadDir = path.join(process.cwd(), "public", "uploads", "cms");
const storageBucket = "cms-media";
const maxUploadBytes = 30 * 1024 * 1024;
const maxVideoUploadBytes = 80 * 1024 * 1024;
const allowedExtensions = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
  "heic",
  "heif",
];
const videoExtensions = ["mp4", "webm", "mov", "m4v"];

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
  return (
    file.type.startsWith("image/") ||
    Boolean(extension && allowedExtensions.includes(extension))
  );
}

function isVideoFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    file.type.startsWith("video/") ||
    Boolean(extension && videoExtensions.includes(extension))
  );
}

function videoContentType(file: File, extension: string) {
  if (file.type.startsWith("video/")) return file.type;
  if (extension === "webm") return "video/webm";
  if (extension === "mov") return "video/quicktime";
  return "video/mp4";
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

async function uploadToSupabase(
  filename: string,
  buffer: Buffer,
  contentType: string,
) {
  const supabase = supabaseAdmin();
  if (!supabase) return null;

  await supabase.storage
    .createBucket(storageBucket, { public: true })
    .catch(() => null);

  const storagePath = `cms/${filename}`;
  const { error } = await supabase.storage
    .from(storageBucket)
    .upload(storagePath, buffer, {
      cacheControl: "31536000",
      contentType,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from(storageBucket)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

async function persistCmsFile(
  filename: string,
  buffer: Buffer,
  contentType: string,
) {
  try {
    const supabaseUrl = await uploadToSupabase(filename, buffer, contentType);
    if (supabaseUrl) return supabaseUrl;
  } catch (error) {
    if (process.env.VERCEL) throw error;
  }

  await mkdir(uploadDir, { recursive: true });
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);
  return `/uploads/cms/${filename}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const preset = formData.get("preset");

  if (!(file instanceof File)) {
    return Response.json({ error: "File required" }, { status: 400 });
  }

  if (isVideoFile(file)) {
    if (file.size > maxVideoUploadBytes) {
      return Response.json(
        { error: "Video must be under 80MB" },
        { status: 400 },
      );
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const safeExtension = videoExtensions.includes(extension)
      ? extension
      : "mp4";
    const filename = `${Date.now()}-${randomUUID()}.${safeExtension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const url = await persistCmsFile(
        filename,
        buffer,
        videoContentType(file, safeExtension),
      );
      return Response.json({
        url,
        name: file.name,
        size: buffer.length,
        type: "video",
      });
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Video upload failed",
        },
        { status: 500 },
      );
    }
  }

  if (!isImageFile(file)) {
    return Response.json(
      { error: "Only image or video (MP4, WebM) uploads allowed" },
      { status: 400 },
    );
  }

  if (file.size > maxUploadBytes) {
    return Response.json(
      { error: "Image must be under 30MB" },
      { status: 400 },
    );
  }

  if (preset === "auth-banner") {
    const alt =
      typeof formData.get("alt") === "string"
        ? formData.get("alt")!.toString()
        : undefined;
    const input = Buffer.from(await file.arrayBuffer());
    const processed = await processAuthBannerUpload(input, alt);
    const id = `${Date.now()}-${randomUUID()}`;

    try {
      const [webpUrl, avifUrl] = await Promise.all([
        persistCmsFile(`${id}.webp`, processed.webp, "image/webp"),
        persistCmsFile(`${id}.avif`, processed.avif, "image/avif"),
      ]);
      const banner = toAuthBannerAsset(webpUrl, avifUrl, processed);
      return Response.json({
        banner,
        webp: webpUrl,
        avif: avifUrl,
        name: file.name,
      });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Auth banner upload failed",
        },
        { status: 500 },
      );
    }
  }

  const image = await imageBuffer(file);
  const filename = `${Date.now()}-${randomUUID()}.${image.extension}`;

  try {
    const url = await persistCmsFile(filename, image.buffer, image.contentType);
    return Response.json({
      url,
      name: file.name,
      size: image.buffer.length,
      type: image.contentType,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    );
  }
}
