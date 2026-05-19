import {
  getApprovedBlogComments,
  type BlogComment,
} from "@/lib/blog-comments-store";
import { BlogCommentForm } from "./BlogCommentForm";

const SARJAN_LOGO = "/sarjan-assets/sarjan-logo.svg";

function formatCommentDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]![0]! : "";
  return (a + b).toUpperCase();
}

function CommentGuestAvatar({ name }: { name: string }) {
  return (
    <div className="image sarjan-blog-comment-avatar sarjan-blog-comment-avatar-guest">
      <span className="sarjan-blog-comment-initials" aria-hidden>
        {initials(name)}
      </span>
    </div>
  );
}

function ApprovedCommentItem({ comment }: { comment: BlogComment }) {
  return (
    <div className="sarjan-blog-comment-stack">
      <div className="reply-comment-item">
        <CommentGuestAvatar name={comment.authorName} />
        <div className="content">
          <div>
            <h6>
              <span className="link sarjan-blog-comment-author">
                {comment.authorName}
              </span>
            </h6>
            <div className="day text-caption-1">
              {formatCommentDate(comment.createdAt)}
            </div>
          </div>
          <p>{comment.body}</p>
        </div>
      </div>
      {comment.adminReply && comment.adminReply.trim().length > 0 ? (
        <div className="reply-comment-item type-reply sarjan-blog-admin-reply">
          <div className="image sarjan-blog-comment-avatar sarjan-blog-comment-avatar-brand">
            <img
              src={SARJAN_LOGO}
              alt="Sarjan Textiles"
              width={40}
              height={40}
            />
          </div>
          <div className="content">
            <div>
              <div className="d-flex gap-12 align-items-center flex-wrap">
                <h6>
                  <span className="link">Sarjan Textiles</span>
                </h6>
                <div className="box-check" aria-hidden>
                  ✓
                </div>
              </div>
              {comment.adminRepliedAt ? (
                <div className="day text-caption-1">
                  {formatCommentDate(comment.adminRepliedAt)}
                </div>
              ) : null}
            </div>
            <p>{comment.adminReply}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export async function BlogCommentsBlock({ slug }: { slug: string }) {
  const comments = await getApprovedBlogComments(slug);
  const heading =
    comments.length === 0
      ? "Comments"
      : `${String(comments.length).padStart(2, "0")} Comment${comments.length === 1 ? "" : "s"}`;

  return (
    <>
      <div className="reply-comment">
        <h4 className="reply-comment-heading">{heading}</h4>
        <div className="reply-comment-wrap">
          {comments.length === 0 ? (
            <p className="body-text-1 sarjan-blog-comments-empty">
              No comments yet. Be the first to share feedback after your comment
              is approved.
            </p>
          ) : (
            comments.map((comment) => (
              <ApprovedCommentItem key={comment.id} comment={comment} />
            ))
          )}
        </div>
      </div>
      <BlogCommentForm slug={slug} />
    </>
  );
}
