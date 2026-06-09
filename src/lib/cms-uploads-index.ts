import { readdir, stat } from "fs/promises";
import path from "path";
import { resolveCmsUploadsRoot } from "@/lib/cms-uploads-path";

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
  "heif",
  "heic",
]);

export type CmsUploadImage = {
  fileName: string;
  url: string;
  size: number;
  updatedAt: string;
};

export async function listCmsUploadImages(options?: {
  limit?: number;
  offset?: number;
  query?: string;
}): Promise<{ images: CmsUploadImage[]; total: number }> {
  const uploadDir = resolveCmsUploadsRoot();
  let names: string[];
  try {
    names = await readdir(uploadDir);
  } catch {
    return { images: [], total: 0 };
  }

  const needle = options?.query?.trim().toLowerCase() ?? "";
  const rows: CmsUploadImage[] = [];

  for (const fileName of names) {
    const extension = fileName.split(".").pop()?.toLowerCase();
    if (!extension || !IMAGE_EXTENSIONS.has(extension)) {
      continue;
    }
    if (needle && !fileName.toLowerCase().includes(needle)) {
      continue;
    }

    const filePath = path.join(uploadDir, fileName);
    let info;
    try {
      info = await stat(filePath);
    } catch {
      continue;
    }
    if (!info.isFile()) {
      continue;
    }

    rows.push({
      fileName,
      url: `/uploads/cms/${fileName}`,
      size: info.size,
      updatedAt: info.mtime.toISOString(),
    });
  }

  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const total = rows.length;
  const offset = Math.max(0, options?.offset ?? 0);
  const limit = Math.min(Math.max(options?.limit ?? 300, 1), 1000);

  return {
    images: rows.slice(offset, offset + limit),
    total,
  };
}
