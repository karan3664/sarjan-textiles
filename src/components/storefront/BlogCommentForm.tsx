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
      const url = new URL("/api/blog/comments", window.location.origin).href;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogSlug: slug,
          authorName: name,
          authorEmail: email,
          body,
        }),
        credentials: "same-origin",
      });
      const raw = await res.text();
      let data = {} as { error?: string; message?: string };
      try {
        data = raw.trim()
          ? (JSON.parse(raw) as { error?: string; message?: string })
          : {};
      } catch {
        setNotice({
          type: "err",
          text: res.ok
            ? "Unexpected server response."
            : raw.trim().length > 0
              ? `Server error (${res.status}). Please try again.`
              : `Server error (${res.status}) with no details. If this persists, redeploy the site or check Vercel function logs.`,
        });
        return;
      }
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
    } catch (e) {
      const msg =
        e instanceof TypeError
          ? "Could not reach the server (connection blocked or offline). If you use a VPN, ad blocker, or strict privacy mode, try turning it off for this site."
          : e instanceof Error
            ? e.message
            : "Network error. Please try again.";
      setNotice({ type: "err", text: msg });
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
