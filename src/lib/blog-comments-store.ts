import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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

function supabaseEnabled(): boolean {
  const v = (process.env.SUPABASE_ENABLED ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function supabaseDb() {
  if (!supabaseEnabled()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
  });
}

function parseStatus(s: string): BlogCommentStatus {
  if (s === "approved" || s === "rejected" || s === "pending") return s;
  return "pending";
}

function mapFromRow(row: Record<string, unknown>): BlogComment {
  return {
    id: String(row.id ?? ""),
    blogSlug: String(row.blog_slug ?? ""),
    authorName: String(row.author_name ?? ""),
    authorEmail: String(row.author_email ?? ""),
    body: String(row.body ?? ""),
    status: parseStatus(String(row.status ?? "pending")),
    createdAt: String(row.created_at ?? ""),
    adminReply:
      row.admin_reply != null && String(row.admin_reply).trim()
        ? String(row.admin_reply)
        : undefined,
    adminRepliedAt:
      row.admin_replied_at != null && String(row.admin_replied_at).trim()
        ? String(row.admin_replied_at)
        : undefined,
  };
}

async function readAllFromFile(): Promise<BlogComment[]> {
  try {
    const raw = await readFile(COMMENTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as CommentsFile;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeAllToFile(items: BlogComment[]): Promise<void> {
  await mkdir(path.dirname(COMMENTS_FILE), { recursive: true });
  const payload: CommentsFile = { items };
  await writeFile(COMMENTS_FILE, JSON.stringify(payload, null, 2), "utf8");
}

async function readAllFromSupabase(): Promise<BlogComment[] | null> {
  const sb = supabaseDb();
  if (!sb) return null;
  const { data, error } = await sb
    .from("blog_comments")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[blog-comments] supabase read:", error.message);
    return null;
  }
  return (data ?? []).map((row) => mapFromRow(row as Record<string, unknown>));
}

async function readAll(): Promise<BlogComment[]> {
  const fromDb = await readAllFromSupabase();
  if (fromDb !== null) return fromDb;
  return readAllFromFile();
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
  const sb = supabaseDb();
  if (sb) {
    const { data, error } = await sb
      .from("blog_comments")
      .insert({
        blog_slug: input.blogSlug.trim(),
        author_name: input.authorName.trim(),
        author_email: input.authorEmail.trim().toLowerCase(),
        body: input.body.trim(),
        status: "pending",
      })
      .select("*")
      .single();
    if (error) {
      throw new Error(
        error.message.includes("blog_comments")
          ? "Comments database is not ready. Apply the blog_comments migration in Supabase, or run locally with SUPABASE_ENABLED=false."
          : error.message,
      );
    }
    if (data == null || typeof data !== "object") {
      throw new Error(
        "Supabase insert returned no row. Check that table public.blog_comments exists and PostgREST can return inserted rows.",
      );
    }
    return mapFromRow(data as Record<string, unknown>);
  }

  const all = await readAllFromFile();
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
  await writeAllToFile(all);
  return row;
}

export async function updateBlogComment(
  id: string,
  patch: Partial<Pick<BlogComment, "status" | "adminReply" | "adminRepliedAt">>,
): Promise<BlogComment | null> {
  const sb = supabaseDb();
  if (sb) {
    const patchRow: Record<string, unknown> = {};
    if (patch.status !== undefined) patchRow.status = patch.status;
    if (patch.adminReply !== undefined) {
      patchRow.admin_reply = patch.adminReply.trim() || null;
      patchRow.admin_replied_at =
        patch.adminReply.trim().length > 0
          ? (patch.adminRepliedAt ?? new Date().toISOString())
          : null;
    }
    const { data, error } = await sb
      .from("blog_comments")
      .update(patchRow)
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[blog-comments] supabase update:", error.message);
      return null;
    }
    return mapFromRow(data as Record<string, unknown>);
  }

  const all = await readAllFromFile();
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
  await writeAllToFile(all);
  return cur;
}
