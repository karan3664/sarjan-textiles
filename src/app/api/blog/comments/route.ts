import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createBlogComment,
  getApprovedBlogComments,
} from "@/lib/blog-comments-store";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import {
  sanitizeUserText,
  USER_TEXT_LIMITS,
  validateUserText,
} from "@/lib/user-text";

/** Avoid Edge / odd runtimes: this route uses fs-backed fallbacks via imports. */
export const runtime = "nodejs";

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
    const blogSlug = sanitizeUserText(String(o.blogSlug ?? ""));
    const authorName = sanitizeUserText(String(o.authorName ?? ""));
    const authorEmail = sanitizeUserText(
      String(o.authorEmail ?? ""),
    ).toLowerCase();
    const bodyCheck = validateUserText(String(o.body ?? ""), {
      min: 1,
      max: USER_TEXT_LIMITS.blogCommentBody,
      label: "Comment",
    });

    if (!blogSlug || blogSlug.length > 200) {
      return jsonError(400, "Invalid blog slug");
    }
    const nameCheck = validateUserText(authorName, {
      min: 1,
      max: USER_TEXT_LIMITS.blogCommentName,
      label: "Name",
    });
    if (!nameCheck.ok) {
      return jsonError(400, nameCheck.error);
    }
    if (
      !authorEmail ||
      authorEmail.length > USER_TEXT_LIMITS.blogCommentEmail ||
      !authorEmail.includes("@")
    ) {
      return jsonError(400, "Invalid email");
    }
    const limit = await rateLimit(
      rateLimitKey(request, "blog-comment", authorEmail),
      3,
      60 * 60_000,
    );
    if (!limit.allowed) {
      return jsonError(429, "Too many comments. Try again later.");
    }
    if (!bodyCheck.ok) {
      return jsonError(400, bodyCheck.error);
    }
    const commentBody = bodyCheck.value;

    try {
      const created = await createBlogComment({
        blogSlug,
        authorName: nameCheck.value,
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
