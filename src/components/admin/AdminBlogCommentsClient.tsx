"use client";

import { useMemo, useState } from "react";
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
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return comments.filter((c) => {
      const okStatus = statusFilter === "all" || c.status === statusFilter;
      const hay = [
        c.blogSlug,
        c.authorName,
        c.authorEmail,
        c.body,
        c.adminReply,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const okQ = !q || hay.includes(q);
      return okStatus && okQ;
    });
  }, [comments, query, statusFilter]);

  const patchComment = async (
    id: string,
    patch: { status?: BlogCommentStatus; adminReply?: string },
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
      }
    } catch {
      setNotice("Network error");
    } finally {
      setBusyId("");
    }
  };

  const replyFor = (c: BlogComment) => replyDrafts[c.id] ?? c.adminReply ?? "";

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
                <td style={{ maxWidth: 280, whiteSpace: "pre-wrap" }}>
                  {c.body}
                </td>
                <td>
                  <span className={statusBadge(c.status)}>{c.status}</span>
                </td>
                <td style={{ minWidth: 240 }}>
                  <textarea
                    className="form-control mb_8"
                    rows={3}
                    placeholder="Official reply (shown with Sarjan Textiles logo)"
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
                    className="tf-btn btn-sm btn-fill"
                    disabled={busyId === c.id}
                    onClick={() =>
                      patchComment(c.id, { adminReply: replyFor(c) })
                    }
                  >
                    {busyId === c.id ? "Saving…" : "Save reply"}
                  </button>
                </td>
                <td>
                  <div className="d-flex flex-column gap_8">
                    {c.status !== "approved" ? (
                      <button
                        type="button"
                        className="tf-btn btn-sm btn-fill animate-hover-btn"
                        disabled={busyId === c.id}
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
                        className="tf-btn btn-sm btn-outline animate-hover-btn"
                        disabled={busyId === c.id}
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
                        className="tf-btn btn-sm btn-outline animate-hover-btn"
                        disabled={busyId === c.id}
                        onClick={() =>
                          patchComment(c.id, { status: "pending" })
                        }
                      >
                        Mark pending
                      </button>
                    ) : null}
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
