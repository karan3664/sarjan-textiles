import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const uploadDir = path.join(process.cwd(), "public", "uploads", "cms");
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

  await mkdir(uploadDir, { recursive: true });

  const extension = extensionFromFile(file);
  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const filepath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filepath, buffer);

  return Response.json({
    url: `/uploads/cms/${filename}`,
    name: file.name,
    size: file.size,
    type: file.type,
  });
}
