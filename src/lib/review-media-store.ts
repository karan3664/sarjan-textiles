import { mkdir, writeFile } from "fs/promises";
import {
  contentTypeForReviewMedia,
  legacyReviewMediaFilePath,
  resolveReviewMediaRoot,
  reviewMediaFilePath,
} from "@/lib/review-media-path";
import { isPostgresEnabled, pgQuery } from "@/lib/postgres";

export async function persistReviewMediaFile(
  filename: string,
  buffer: Buffer,
  mime: string,
) {
  const safe = filename.trim();
  if (!safe || safe.includes("/") || safe.includes("..")) {
    throw new Error("Invalid review media filename");
  }

  await mkdir(resolveReviewMediaRoot(), { recursive: true });
  await writeFile(reviewMediaFilePath(safe), buffer);

  if (isPostgresEnabled()) {
    await pgQuery(
      `insert into review_media_files (filename, mime, content)
       values ($1, $2, $3)
       on conflict (filename) do update
       set mime = excluded.mime, content = excluded.content, created_at = now()`,
      [safe, mime, buffer],
    );
  }
}

export async function readReviewMediaFile(
  filename: string,
): Promise<{ buffer: Buffer; mime: string } | null> {
  const safe = filename.trim();
  if (!safe || safe.includes("/") || safe.includes("..")) {
    return null;
  }

  const diskPaths = [
    reviewMediaFilePath(safe),
    legacyReviewMediaFilePath(safe),
  ];
  for (const candidate of diskPaths) {
    try {
      const { readFile } = await import("fs/promises");
      const buffer = await readFile(candidate);
      return { buffer, mime: contentTypeForReviewMedia(safe) };
    } catch {
      /* try next */
    }
  }

  if (!isPostgresEnabled()) return null;

  const { rows } = await pgQuery<{ mime: string; content: Buffer }>(
    `select mime, content from review_media_files where filename = $1 limit 1`,
    [safe],
  );
  const row = rows[0];
  if (!row?.content?.length) return null;

  const buffer = Buffer.isBuffer(row.content)
    ? row.content
    : Buffer.from(row.content);
  return {
    buffer,
    mime: row.mime || contentTypeForReviewMedia(safe),
  };
}
