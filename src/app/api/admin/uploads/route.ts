import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import {
  processAuthBannerUpload,
  toAuthBannerAsset,
} from "@/lib/auth-banner-process";
import { resolveCmsUploadsRoot } from "@/lib/cms-uploads-path";
import { listCmsUploadImages } from "@/lib/cms-uploads-index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List CMS images already on disk (newest first). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? "300");
  const offset = Number(searchParams.get("offset") ?? "0");

  const result = await listCmsUploadImages({
    query,
    limit: Number.isFinite(limit) ? limit : 300,
    offset: Number.isFinite(offset) ? offset : 0,
  });

  return Response.json(result);
}

const uploadDir = resolveCmsUploadsRoot();
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

async function persistCmsFile(
  filename: string,
  buffer: Buffer,
  _contentType: string,
) {
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
