"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EmojiTextarea } from "@/components/shared/EmojiTextarea";
import { sarjanButtonClass } from "@/lib/sarjan-button";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";

/** Public order / product feedback — no testimonial mode (testimonials are login-only). */
export function FeedbackForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [messageBody, setMessageBody] = useState("");

  /** Strip accidental GET submissions (?companyName=…) from the address bar. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (
      !params.has("companyName") &&
      !params.has("email") &&
      !params.has("message")
    ) {
      return;
    }
    window.history.replaceState(null, "", "/order-feedback");
    setStatusMessage(
      "Please submit the form again — your browser reloaded the page instead of sending in the background.",
    );
  }, []);

  const submitFeedback = useCallback(async () => {
    const form = formRef.current;
    if (!form || submitting) return;

    setSubmitting(true);
    setStatusMessage("");

    try {
      const fd = new FormData(form);
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: fd.get("companyName"),
          email: fd.get("email"),
          orderId: fd.get("orderId"),
          message: fd.get("message"),
        }),
      });

      let data: { error?: string } = {};
      try {
        data = (await res.json()) as { error?: string };
      } catch {
        setStatusMessage("Unexpected server response. Please try again.");
        return;
      }

      if (!res.ok) {
        setStatusMessage(data.error ?? "Submit failed.");
        return;
      }

      setStatusMessage(
        "Thank you. Our team will review your message and follow up by email.",
      );
      setMessageBody("");
      setFormKey((key) => key + 1);
    } catch {
      setStatusMessage("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting]);

  const onFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void submitFeedback();
  };

  return (
    <div className="sarjan-order-feedback-form-wrap">
      {statusMessage ? (
        <p
          className={`sarjan-order-feedback-status mb_16 ${
            statusMessage.includes("failed") ||
            statusMessage.includes("error") ||
            statusMessage.includes("reloaded")
              ? "text-danger"
              : "text-success"
          }`}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}
      <form
        key={formKey}
        ref={formRef}
        className="form-leave-comment sarjan-order-feedback-form"
        method="post"
        action="/order-feedback"
        onSubmit={onFormSubmit}
        noValidate
      >
        <div className="wrap">
          <div className="cols sarjan-order-feedback-form-row-2">
            <fieldset>
              <input
                name="companyName"
                type="text"
                placeholder="Company name *"
                autoComplete="organization"
                required
                disabled={submitting}
              />
            </fieldset>
            <fieldset>
              <input
                name="email"
                type="email"
                placeholder="Email address *"
                autoComplete="email"
                required
                disabled={submitting}
              />
            </fieldset>
          </div>
          <fieldset className="sarjan-order-feedback-order-field">
            <input
              name="orderId"
              type="text"
              placeholder="Order ID (optional)"
              autoComplete="off"
              disabled={submitting}
            />
          </fieldset>
          <fieldset>
            <EmojiTextarea
              name="message"
              rows={5}
              placeholder="Describe your order issue or product feedback… (emoji welcome)"
              required
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              disabled={submitting}
            />
          </fieldset>
        </div>
        <div className="button-submit send-wrap">
          <button
            type="button"
            className={withBtnIcon(sarjanButtonClass())}
            disabled={submitting}
            onClick={() => void submitFeedback()}
          >
            <TfButtonIcon icon="icon-comment">
              {submitting ? "Sending…" : "Submit feedback"}
            </TfButtonIcon>
          </button>
        </div>
      </form>
    </div>
  );
}
