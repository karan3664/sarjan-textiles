"use client";

import { useMemo, useState } from "react";
import { EmojiTextarea } from "@/components/shared/EmojiTextarea";
import type { BlogComment, BlogCommentStatus } from "@/lib/blog-comments-store";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusBadge(status: BlogCommentStatus) {
  if (status === "approved") return "badge bg-success";
  if (status === "rejected") return "badge bg-secondary";
  return "badge bg-warning text-dark";
}

export function AdminBlogCommentsClient({
  initialComments,
}: {
  initialComments: BlogComment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BlogCommentStatus>(
    "all",
  );
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [busyReplyKey, setBusyReplyKey] = useState("");
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return comments.filter((c) => {
      const okStatus = statusFilter === "all" || c.status === statusFilter;
      const replyHay = (c.adminReplies ?? []).map((r) => r.body).join(" ");
      const hay = [
        c.blogSlug,
        c.authorName,
        c.authorEmail,
        c.body,
        replyHay,
        c.adminReply,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const okQ = !q || hay.includes(q);
      return okStatus && okQ;
    });
  }, [comments, query, statusFilter]);

  const rowBusy = (id: string) =>
    busyId === id || busyReplyKey.startsWith(`${id}:`);

  const patchComment = async (
    id: string,
    patch: {
      status?: BlogCommentStatus;
      adminReply?: string;
      appendAdminReply?: string;
      deleteAdminReplyId?: string;
    },
  ) => {
    setBusyId(id);
    setNotice("");
    try {
      const res = await fetch("/api/admin/blog-comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = (await res.json()) as {
        error?: string;
        comment?: BlogComment;
      };
      if (!res.ok) {
        setNotice(data.error ?? "Update failed");
        return;
      }
      if (data.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === data.comment!.id ? data.comment! : c)),
        );
        if (patch.appendAdminReply !== undefined) {
          setReplyDrafts((prev) => ({ ...prev, [id]: "" }));
        }
      }
    } catch {
      setNotice("Network error");
    } finally {
      setBusyId("");
    }
  };

  const deleteReply = async (commentId: string, replyId: string) => {
    if (
      !window.confirm(
        "Delete this official reply? It will disappear from the storefront for approved comments.",
      )
    ) {
      return;
    }
    setBusyReplyKey(`${commentId}:${replyId}`);
    setNotice("");
    try {
      const res = await fetch("/api/admin/blog-comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: commentId, deleteAdminReplyId: replyId }),
      });
      const data = (await res.json()) as {
        error?: string;
        comment?: BlogComment;
      };
      if (!res.ok) {
        setNotice(data.error ?? "Could not delete reply");
        return;
      }
      if (data.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === data.comment!.id ? data.comment! : c)),
        );
      }
    } catch {
      setNotice("Network error");
    } finally {
      setBusyReplyKey("");
    }
  };

  const deleteComment = async (commentId: string) => {
    if (
      !window.confirm(
        "Permanently delete this visitor comment and all official replies? This cannot be undone.",
      )
    ) {
      return;
    }
    setBusyId(commentId);
    setNotice("");
    try {
      const res = await fetch(
        `/api/admin/blog-comments?id=${encodeURIComponent(commentId)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setNotice(data.error ?? "Delete failed");
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    } catch {
      setNotice("Network error");
    } finally {
      setBusyId("");
    }
  };

  /** Draft only — saved replies stay in `adminReplies`; box clears after each save. */
  const replyFor = (c: BlogComment) => replyDrafts[c.id] ?? "";

  return (
    <div className="wg-box sarjan-admin-blog-comments">
      <div className="flex flex-wrap gap14 items-center justify-between mb_20">
        <input
          type="search"
          className="form-control"
          style={{ maxWidth: 320 }}
          placeholder="Search slug, name, email, text…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="form-select"
          style={{ maxWidth: 200 }}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | BlogCommentStatus)
          }
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {notice ? (
        <p className="body-text-1 text-danger mb_16" role="status">
          {notice}
        </p>
      ) : null}
      <div className="table-responsive">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Blog</th>
              <th>Author</th>
              <th>Comment</th>
              <th>Status</th>
              <th>Reply (storefront uses Sarjan logo)</th>
              <th style={{ minWidth: 200 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="text-title">{c.blogSlug}</div>
                  <div className="text-caption-1 text-muted">
                    {formatDate(c.createdAt)}
                  </div>
                </td>
                <td>
                  <div>{c.authorName}</div>
                  <div className="text-caption-1 text-muted">
                    {c.authorEmail}
                  </div>
                </td>
                <td
                  className="sarjan-emoji-text"
                  style={{ maxWidth: 280, whiteSpace: "pre-wrap" }}
                >
                  {c.body}
                </td>
                <td>
                  <span className={statusBadge(c.status)}>{c.status}</span>
                </td>
                <td className="sarjan-admin-blog-comments-reply-cell">
                  <div className="sarjan-admin-blog-comments-reply">
                    {c.adminReplies.length > 0 ? (
                      <ul className="sarjan-admin-blog-comments-reply-history mb_12">
                        {c.adminReplies.map((r) => (
                          <li key={r.id}>
                            <div className="sarjan-admin-blog-comments-reply-head">
                              <span className="text-caption-1 text-muted">
                                {formatDate(r.createdAt)}
                              </span>
                              <button
                                type="button"
                                className="sarjan-admin-blog-comments-delete-reply"
                                disabled={
                                  busyReplyKey === `${c.id}:${r.id}` ||
                                  rowBusy(c.id)
                                }
                                onClick={() => deleteReply(c.id, r.id)}
                              >
                                {busyReplyKey === `${c.id}:${r.id}`
                                  ? "…"
                                  : "Delete reply"}
                              </button>
                            </div>
                            <p className="sarjan-emoji-text body-text-1 mb_0">
                              {r.body}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <EmojiTextarea
                      className="mb_12"
                      textareaClassName="form-control"
                      rows={3}
                      placeholder="Type a new reply (emoji welcome). Saves append to the thread."
                      value={replyFor(c)}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [c.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="tf-button style-1"
                      disabled={rowBusy(c.id) || !replyFor(c).trim().length}
                      onClick={() =>
                        patchComment(c.id, {
                          appendAdminReply: replyFor(c).trim(),
                        })
                      }
                    >
                      {busyId === c.id ? "Saving…" : "Save reply"}
                    </button>
                  </div>
                </td>
                <td className="sarjan-admin-blog-comments-actions-cell">
                  <div className="sarjan-admin-blog-comments-actions">
                    {c.status !== "approved" ? (
                      <button
                        type="button"
                        className="tf-button style-1"
                        disabled={rowBusy(c.id)}
                        onClick={() =>
                          patchComment(c.id, { status: "approved" })
                        }
                      >
                        Approve
                      </button>
                    ) : null}
                    {c.status !== "rejected" ? (
                      <button
                        type="button"
                        className="tf-button sarjan-danger-button"
                        disabled={rowBusy(c.id)}
                        onClick={() =>
                          patchComment(c.id, { status: "rejected" })
                        }
                      >
                        Reject
                      </button>
                    ) : null}
                    {c.status === "rejected" || c.status === "approved" ? (
                      <button
                        type="button"
                        className="tf-button"
                        disabled={rowBusy(c.id)}
                        onClick={() =>
                          patchComment(c.id, { status: "pending" })
                        }
                      >
                        Mark pending
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="tf-button sarjan-danger-button"
                      disabled={rowBusy(c.id)}
                      onClick={() => deleteComment(c.id)}
                    >
                      Delete comment
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? (
        <p className="body-text-1 text-muted">No comments match this filter.</p>
      ) : null}
    </div>
  );
}
