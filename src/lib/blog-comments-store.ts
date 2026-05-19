import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const COMMENTS_FILE = path.join(process.cwd(), "data", "blog-comments.json");

export type BlogCommentStatus = "pending" | "approved" | "rejected";

export type BlogComment = {
  id: string;
  blogSlug: string;
  authorName: string;
  authorEmail: string;
  body: string;
  status: BlogCommentStatus;
  createdAt: string;
  adminReply?: string;
  adminRepliedAt?: string;
};

type CommentsFile = { items: BlogComment[] };

async function readAll(): Promise<BlogComment[]> {
  try {
    const raw = await readFile(COMMENTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as CommentsFile;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeAll(items: BlogComment[]): Promise<void> {
  await mkdir(path.dirname(COMMENTS_FILE), { recursive: true });
  const payload: CommentsFile = { items };
  await writeFile(COMMENTS_FILE, JSON.stringify(payload, null, 2), "utf8");
}

export async function getApprovedBlogComments(
  blogSlug: string,
): Promise<BlogComment[]> {
  const all = await readAll();
  return all
    .filter(
      (c) =>
        c.blogSlug === blogSlug &&
        c.status === "approved" &&
        c.body.trim().length > 0,
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

export async function getAllBlogComments(): Promise<BlogComment[]> {
  const all = await readAll();
  return all.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function createBlogComment(input: {
  blogSlug: string;
  authorName: string;
  authorEmail: string;
  body: string;
}): Promise<BlogComment> {
  const all = await readAll();
  const now = new Date().toISOString();
  const row: BlogComment = {
    id: randomUUID(),
    blogSlug: input.blogSlug.trim(),
    authorName: input.authorName.trim(),
    authorEmail: input.authorEmail.trim().toLowerCase(),
    body: input.body.trim(),
    status: "pending",
    createdAt: now,
  };
  all.push(row);
  await writeAll(all);
  return row;
}

export async function updateBlogComment(
  id: string,
  patch: Partial<Pick<BlogComment, "status" | "adminReply" | "adminRepliedAt">>,
): Promise<BlogComment | null> {
  const all = await readAll();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const cur = all[idx];
  if (patch.status !== undefined) cur.status = patch.status;
  if (patch.adminReply !== undefined) {
    cur.adminReply = patch.adminReply.trim() || undefined;
    cur.adminRepliedAt =
      cur.adminReply && cur.adminReply.length > 0
        ? (patch.adminRepliedAt ?? new Date().toISOString())
        : undefined;
  }
  all[idx] = cur;
  await writeAll(all);
  return cur;
}
