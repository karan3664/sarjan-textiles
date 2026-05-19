import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createBlogComment,
  getApprovedBlogComments,
} from "@/lib/blog-comments-store";

const MAX_BODY = 4000;
const MAX_NAME = 120;
const MAX_EMAIL = 254;

function sanitizeText(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const blogSlug = sanitizeText(String(o.blogSlug ?? ""));
  const authorName = sanitizeText(String(o.authorName ?? ""));
  const authorEmail = sanitizeText(String(o.authorEmail ?? ""));
  const commentBody = sanitizeText(String(o.body ?? ""));

  if (!blogSlug || blogSlug.length > 200) {
    return NextResponse.json({ error: "Invalid blog slug" }, { status: 400 });
  }
  if (!authorName || authorName.length > MAX_NAME) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  if (
    !authorEmail ||
    authorEmail.length > MAX_EMAIL ||
    !authorEmail.includes("@")
  ) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!commentBody || commentBody.length > MAX_BODY) {
    return NextResponse.json({ error: "Invalid comment" }, { status: 400 });
  }

  const created = await createBlogComment({
    blogSlug,
    authorName,
    authorEmail,
    body: commentBody,
  });
  revalidatePath(`/blog/${blogSlug}`);
  return NextResponse.json({
    ok: true,
    message:
      "Thanks! Your comment was submitted and will appear after moderation.",
    id: created.id,
  });
}
