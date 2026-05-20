"use client";

import { useState } from "react";
import { EmojiTextarea } from "@/components/shared/EmojiTextarea";

/** Public order / product feedback — no testimonial mode (testimonials are login-only). */
export function FeedbackForm() {
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: form.get("companyName"),
        email: form.get("email"),
        orderId: form.get("orderId"),
        message: form.get("message"),
      }),
    });
    const data = (await res.json()) as { error?: string };
    setMessage(
      res.ok
        ? "Thank you. Our team will review your message and follow up by email."
        : (data.error ?? "Submit failed."),
    );
    if (res.ok) event.currentTarget.reset();
  };

  return (
    <form
      className="form-leave-comment sarjan-order-feedback-form"
      onSubmit={submit}
    >
      <div className="wrap">
        <fieldset>
          <input name="companyName" placeholder="Company name *" required />
        </fieldset>
        <fieldset>
          <input
            name="email"
            placeholder="Email address *"
            type="email"
            required
          />
        </fieldset>
      </div>
      <fieldset>
        <input name="orderId" placeholder="Order ID (optional)" />
      </fieldset>
      <fieldset>
        <EmojiTextarea
          name="message"
          rows={5}
          placeholder="Describe your order issue or product feedback… (emoji welcome)"
          required
        />
      </fieldset>
      {message ? (
        <p
          className={
            message.includes("failed") || message.includes("required")
              ? "text-danger mt_12"
              : "text-success mt_12"
          }
        >
          {message}
        </p>
      ) : null}
      <div className="button-submit send-wrap">
        <button className="tf-btn btn-fill radius-4" type="submit">
          <span className="text text-button">Submit feedback</span>
        </button>
      </div>
    </form>
  );
}
