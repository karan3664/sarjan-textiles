import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createBlogComment,
  getApprovedBlogComments,
} from "@/lib/blog-comments-store";

/** Avoid Edge / odd runtimes: this route uses fs-backed fallbacks via imports. */
export const runtime = "nodejs";

const MAX_BODY = 4000;
const MAX_NAME = 120;
const MAX_EMAIL = 254;

function sanitizeText(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
}

function jsonError(status: number, message: string) {
  const body = JSON.stringify({
    error: message.slice(0, 2000),
  });
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  const comments = await getApprovedBlogComments(slug);
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "Invalid JSON");
    }
    if (!body || typeof body !== "object") {
      return jsonError(400, "Invalid body");
    }
    const o = body as Record<string, unknown>;
    const blogSlug = sanitizeText(String(o.blogSlug ?? ""));
    const authorName = sanitizeText(String(o.authorName ?? ""));
    const authorEmail = sanitizeText(String(o.authorEmail ?? ""));
    const commentBody = sanitizeText(String(o.body ?? ""));

    if (!blogSlug || blogSlug.length > 200) {
      return jsonError(400, "Invalid blog slug");
    }
    if (!authorName || authorName.length > MAX_NAME) {
      return jsonError(400, "Invalid name");
    }
    if (
      !authorEmail ||
      authorEmail.length > MAX_EMAIL ||
      !authorEmail.includes("@")
    ) {
      return jsonError(400, "Invalid email");
    }
    if (!commentBody || commentBody.length > MAX_BODY) {
      return jsonError(400, "Invalid comment");
    }

    try {
      const created = await createBlogComment({
        blogSlug,
        authorName,
        authorEmail,
        body: commentBody,
      });
      try {
        revalidatePath(`/blog/${blogSlug}`);
      } catch {
        /* revalidate is best-effort */
      }
      return NextResponse.json({
        ok: true,
        message:
          "Thanks! Your comment was submitted and will appear after moderation.",
        id: created.id,
      });
    } catch (error) {
      console.error("[api/blog/comments] POST", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Could not save comment. Please try again.";
      return jsonError(500, msg);
    }
  } catch (outer) {
    console.error("[api/blog/comments] POST outer", outer);
    return jsonError(
      500,
      "Unexpected server error while handling comment submission.",
    );
  }
}
