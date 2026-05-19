import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  deleteBlogComment,
  getAllBlogComments,
  updateBlogComment,
  type BlogCommentStatus,
  type BlogCommentUpdatePatch,
} from "@/lib/blog-comments-store";
import { verifyAdminToken } from "@/lib/admin-token";

function canModerate(role: string) {
  return role === "super_admin" || role === "admin" || role === "content";
}

export async function GET() {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session || !canModerate(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const comments = await getAllBlogComments();
  return NextResponse.json({ comments });
}

export async function PATCH(request: Request) {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session || !canModerate(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const id = String(o.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const statusRaw = o.status;
  const adminReplyRaw = o.adminReply;
  const appendReplyRaw = o.appendAdminReply;
  const deleteReplyRaw = o.deleteAdminReplyId;

  const patch: BlogCommentUpdatePatch = {};

  if (statusRaw !== undefined) {
    const s = String(statusRaw).trim() as BlogCommentStatus;
    if (s !== "pending" && s !== "approved" && s !== "rejected") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = s;
  }

  if (deleteReplyRaw !== undefined) {
    const rid = String(deleteReplyRaw).trim();
    if (!rid) {
      return NextResponse.json(
        { error: "deleteAdminReplyId cannot be empty" },
        { status: 400 },
      );
    }
    patch.deleteAdminReplyId = rid;
  }

  if (appendReplyRaw !== undefined) {
    const reply = String(appendReplyRaw)
      .replace(/<[^>]*>/g, "")
      .trim();
    if (reply.length > 4000) {
      return NextResponse.json({ error: "Reply too long" }, { status: 400 });
    }
    patch.appendAdminReply = reply;
  }

  if (adminReplyRaw !== undefined && appendReplyRaw === undefined) {
    const reply = String(adminReplyRaw)
      .replace(/<[^>]*>/g, "")
      .trim();
    if (reply.length > 4000) {
      return NextResponse.json({ error: "Reply too long" }, { status: 400 });
    }
    patch.adminReply = reply;
    patch.adminRepliedAt = reply ? new Date().toISOString() : undefined;
  }

  const hasAppendText =
    patch.appendAdminReply !== undefined && patch.appendAdminReply.length > 0;
  const hasLegacyReply = patch.adminReply !== undefined;
  const hasStatus = patch.status !== undefined;
  const hasDeleteReply = patch.deleteAdminReplyId !== undefined;
  if (!hasStatus && !hasAppendText && !hasLegacyReply && !hasDeleteReply) {
    return NextResponse.json(
      {
        error:
          "Nothing to update. Send status, appendAdminReply, adminReply (legacy), or deleteAdminReplyId.",
      },
      { status: 400 },
    );
  }

  const updated = await updateBlogComment(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  revalidatePath(`/blog/${updated.blogSlug}`);
  return NextResponse.json({ ok: true, comment: updated });
}

export async function DELETE(request: Request) {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session || !canModerate(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = (searchParams.get("id") ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { error: "id query parameter required" },
      { status: 400 },
    );
  }

  const blogSlug = await deleteBlogComment(id);
  if (!blogSlug) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  revalidatePath(`/blog/${blogSlug}`);
  return NextResponse.json({ ok: true, deletedId: id });
}
