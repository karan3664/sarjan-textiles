"use client";

import type { FormEvent } from "react";
import { useState } from "react";

export function BlogCommentForm({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/blog/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogSlug: slug,
          authorName: name,
          authorEmail: email,
          body,
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setNotice({
          type: "err",
          text: data.error ?? "Could not submit comment.",
        });
        return;
      }
      setNotice({
        type: "ok",
        text:
          data.message ??
          "Thanks! Your comment was submitted and will appear after moderation.",
      });
      setBody("");
    } catch {
      setNotice({ type: "err", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="leave-comment">
      <h4 className="leave-comment-heading">Leave A Comment</h4>
      {notice ? (
        <p
          className={`body-text-1 mb_16 sarjan-blog-comment-notice${notice.type === "ok" ? " is-ok" : " is-err"}`}
          role="status"
        >
          {notice.text}
        </p>
      ) : null}
      <form className="form-leave-comment" onSubmit={submit}>
        <div className="wrap">
          <div className="cols">
            <fieldset>
              <input
                type="text"
                placeholder="Your Name*"
                name="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </fieldset>
            <fieldset>
              <input
                type="email"
                placeholder="Your Email*"
                name="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </fieldset>
          </div>
          <fieldset>
            <textarea
              rows={4}
              placeholder="Your Message*"
              name="message"
              required
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </fieldset>
        </div>
        <div className="button-submit">
          <button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}
