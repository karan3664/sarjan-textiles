import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { sanitizeUserText } from "@/lib/user-text";

const COMMENTS_FILE = path.join(process.cwd(), "data", "blog-comments.json");

export type BlogCommentStatus = "pending" | "approved" | "rejected";

export type BlogAdminReply = {
  id: string;
  body: string;
  createdAt: string;
};

export type BlogComment = {
  id: string;
  blogSlug: string;
  authorName: string;
  authorEmail: string;
  body: string;
  status: BlogCommentStatus;
  createdAt: string;
  /** Thread of official replies (newest last). */
  adminReplies: BlogAdminReply[];
  /** Last reply body (mirrors DB legacy columns). */
  adminReply?: string;
  /** Last reply time (mirrors DB legacy columns). */
  adminRepliedAt?: string;
};

export type BlogCommentUpdatePatch = {
  status?: BlogCommentStatus;
  /** Replaces entire reply thread (legacy). */
  adminReply?: string;
  adminRepliedAt?: string;
  /** Appends one official reply (UTF-8 / emoji safe). */
  appendAdminReply?: string;
  /** Removes one saved official reply by its `id`. */
  deleteAdminReplyId?: string;
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

function parseAdminRepliesFromJson(value: unknown): BlogAdminReply[] {
  if (!Array.isArray(value)) return [];
  const out: BlogAdminReply[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const body = String(e.body ?? "").trim();
    if (!body) continue;
    const id =
      typeof e.id === "string" && e.id.trim().length > 0
        ? e.id.trim()
        : randomUUID();
    const createdAtRaw = e.createdAt ?? e.created_at;
    const createdAt =
      typeof createdAtRaw === "string" && createdAtRaw.trim().length > 0
        ? createdAtRaw.trim()
        : new Date().toISOString();
    out.push({ id, body, createdAt });
  }
  return out;
}

export function normalizeBlogComment(raw: BlogComment): BlogComment {
  let adminReplies = parseAdminRepliesFromJson(raw.adminReplies as unknown);

  if (adminReplies.length === 0) {
    const legacy = raw.adminReply?.trim();
    if (legacy) {
      const createdAt =
        raw.adminRepliedAt?.trim() && raw.adminRepliedAt.trim().length > 0
          ? raw.adminRepliedAt.trim()
          : raw.createdAt;
      adminReplies = [{ id: "legacy", body: legacy, createdAt }];
    }
  }

  const last = adminReplies[adminReplies.length - 1];
  return {
    ...raw,
    adminReplies,
    adminReply: last?.body,
    adminRepliedAt: last?.createdAt,
  };
}

function mapFromRow(row: Record<string, unknown>): BlogComment {
  let adminReplies = parseAdminRepliesFromJson(row.admin_replies);
  const legacy = String(row.admin_reply ?? "").trim();
  if (adminReplies.length === 0 && legacy) {
    const at = String(row.admin_replied_at ?? row.created_at ?? "");
    adminReplies = [{ id: "legacy", body: legacy, createdAt: at }];
  }
  const last = adminReplies[adminReplies.length - 1];
  return {
    id: String(row.id ?? ""),
    blogSlug: String(row.blog_slug ?? ""),
    authorName: String(row.author_name ?? ""),
    authorEmail: String(row.author_email ?? ""),
    body: String(row.body ?? ""),
    status: parseStatus(String(row.status ?? "pending")),
    createdAt: String(row.created_at ?? ""),
    adminReplies,
    adminReply: last?.body,
    adminRepliedAt: last?.createdAt,
  };
}

async function readAllFromFile(): Promise<BlogComment[]> {
  try {
    const raw = await readFile(COMMENTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as CommentsFile;
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items.map((item) => normalizeBlogComment(item as BlogComment));
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

async function getBlogCommentById(id: string): Promise<BlogComment | null> {
  const sb = supabaseDb();
  if (sb) {
    const { data, error } = await sb
      .from("blog_comments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return mapFromRow(data as Record<string, unknown>);
  }
  const all = await readAllFromFile();
  return all.find((c) => c.id === id) ?? null;
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
        admin_replies: [],
        admin_reply: null,
        admin_replied_at: null,
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
  const row: BlogComment = normalizeBlogComment({
    id: randomUUID(),
    blogSlug: input.blogSlug.trim(),
    authorName: input.authorName.trim(),
    authorEmail: input.authorEmail.trim().toLowerCase(),
    body: input.body.trim(),
    status: "pending",
    createdAt: now,
    adminReplies: [],
  });
  all.push(row);
  await writeAllToFile(all);
  return row;
}

export async function updateBlogComment(
  id: string,
  patch: BlogCommentUpdatePatch,
): Promise<BlogComment | null> {
  const cur = await getBlogCommentById(id);
  if (!cur) return null;

  let nextStatus = cur.status;
  if (patch.status !== undefined) nextStatus = patch.status;

  let adminReplies = [...cur.adminReplies];

  if (patch.deleteAdminReplyId !== undefined) {
    const rid = patch.deleteAdminReplyId.trim();
    if (rid.length > 0) {
      adminReplies = adminReplies.filter((r) => r.id !== rid);
    }
  }

  if (patch.appendAdminReply !== undefined) {
    const t = sanitizeUserText(patch.appendAdminReply);
    if (t.length > 4000) {
      console.error("[blog-comments] append reply too long");
      return null;
    }
    if (t.length > 0) {
      adminReplies.push({
        id: randomUUID(),
        body: t,
        createdAt: new Date().toISOString(),
      });
    }
  } else if (patch.adminReply !== undefined) {
    const t = sanitizeUserText(patch.adminReply);
    adminReplies = t
      ? [
          {
            id: randomUUID(),
            body: t,
            createdAt: patch.adminRepliedAt ?? new Date().toISOString(),
          },
        ]
      : [];
  }

  const last = adminReplies[adminReplies.length - 1];
  const legacyReply = last?.body ?? null;
  const legacyAt = last?.createdAt ?? null;

  const sb = supabaseDb();
  if (sb) {
    const { data, error } = await sb
      .from("blog_comments")
      .update({
        status: nextStatus,
        admin_replies: adminReplies,
        admin_reply: legacyReply,
        admin_replied_at: legacyAt,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[blog-comments] supabase update:", error.message);
      return null;
    }
    if (data == null || typeof data !== "object") return null;
    return mapFromRow(data as Record<string, unknown>);
  }

  const all = await readAllFromFile();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const merged = normalizeBlogComment({
    ...all[idx]!,
    status: nextStatus,
    adminReplies,
    adminReply: last?.body,
    adminRepliedAt: last?.createdAt,
  });
  all[idx] = merged;
  await writeAllToFile(all);
  return merged;
}

/**
 * Permanently remove a comment. Returns the blog slug for cache revalidation, or null if missing.
 */
export async function deleteBlogComment(id: string): Promise<string | null> {
  const cur = await getBlogCommentById(id);
  if (!cur) return null;
  const blogSlug = cur.blogSlug;

  const sb = supabaseDb();
  if (sb) {
    const { error } = await sb.from("blog_comments").delete().eq("id", id);
    if (error) {
      console.error("[blog-comments] supabase delete:", error.message);
      return null;
    }
    return blogSlug;
  }

  const all = await readAllFromFile();
  const next = all.filter((c) => c.id !== id);
  if (next.length === all.length) return null;
  await writeAllToFile(next);
  return blogSlug;
}
