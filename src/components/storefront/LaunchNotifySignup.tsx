"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function LaunchNotifySignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus("error");
      setMessage("Enter your email address.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source: "launch" }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Could not save your email. Try again.");
        return;
      }
      setStatus("success");
      setMessage(
        data.message ??
          "You are on the list — we will email you the moment we go live.",
      );
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="sarjan-launch-page__notify">
      <p className="sarjan-launch-page__notify-title">Get launch updates</p>
      <p className="sarjan-launch-page__notify-lead">
        Leave your email and we will send you our launch announcement
        automatically.
      </p>
      <form className="sarjan-launch-page__notify-form" onSubmit={onSubmit}>
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="sarjan-launch-page__notify-input"
          disabled={status === "loading" || status === "success"}
          aria-label="Email for launch notification"
        />
        <button
          type="submit"
          className="sarjan-launch-page__notify-btn"
          disabled={status === "loading" || status === "success"}
        >
          {status === "loading" ? "Saving…" : "Notify me at launch"}
        </button>
      </form>
      {message ? (
        <p
          className={
            status === "error"
              ? "sarjan-launch-page__notify-msg is-error"
              : "sarjan-launch-page__notify-msg"
          }
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
