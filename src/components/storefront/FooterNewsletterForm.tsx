"use client";

import type { FormEvent } from "react";
import { useState } from "react";

export function FooterNewsletterForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setBusy(true);
    try {
      const form = event.currentTarget;
      const fd = new FormData(form);
      const raw = String(fd.get("email") ?? email).trim();
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: raw }),
      });
      let data = {} as { error?: string; message?: string };
      try {
        data = (await res.json()) as { error?: string; message?: string };
      } catch {
        setNotice({
          type: "err",
          text: res.ok
            ? "Unexpected response."
            : `Something went wrong (${res.status}).`,
        });
        return;
      }
      if (!res.ok) {
        const raw = data.error ?? "Subscription failed. Try again later.";
        const text = /smtp|mailer|nodemailer|not configured/i.test(raw)
          ? "Email could not be sent from this environment yet. Add SMTP settings, or contact us directly."
          : raw;
        setNotice({
          type: "err",
          text,
        });
        return;
      }
      setNotice({
        type: "ok",
        text: data.message ?? "Thanks — you are subscribed.",
      });
      setEmail("");
      form.reset();
    } catch {
      setNotice({
        type: "err",
        text: "Network error. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sarjan-footer-newsletter-form">
      <form
        className="form-newsletter subscribe-form style-black"
        onSubmit={submit}
      >
        <div className="subscribe-content">
          <fieldset className="email">
            <input
              type="email"
              name="email"
              autoComplete="email"
              className="subscribe-email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
          </fieldset>
          <div className="button-submit">
            <button
              className="subscribe-button"
              type="submit"
              disabled={busy}
              aria-label="Subscribe to newsletter"
            >
              <i className="icon-arrowUpRight" />
            </button>
          </div>
        </div>
      </form>
      {notice ? (
        <p
          className={`text-caption-1 sarjan-footer-newsletter-notice${notice.type === "ok" ? " is-ok" : " is-err"}`}
          role="status"
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}
