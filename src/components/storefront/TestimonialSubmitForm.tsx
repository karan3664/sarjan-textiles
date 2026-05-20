"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { TestimonialStarRating } from "./TestimonialStarRating";

type Props = {
  defaultAuthor?: string;
  defaultEmail?: string;
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="sarjan-testimonial-field">
      <label className="sarjan-testimonial-field-label">
        {label}
        {required ? " *" : null}
      </label>
      {children}
    </fieldset>
  );
}

export function TestimonialSubmitForm({
  defaultAuthor = "",
  defaultEmail = "",
}: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [formKey, setFormKey] = useState(0);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const stars = Number(form.get("rating") ?? rating);

    if (!stars || stars < 1 || stars > 5) {
      setMessage("Please select a star rating (1–5).");
      setSubmitting(false);
      return;
    }

    const payload = {
      author: String(form.get("author") ?? "").trim(),
      quote: String(form.get("quote") ?? "").trim(),
      product: String(form.get("product") ?? "").trim() || "Sarjan Textiles",
      price: String(form.get("price") ?? "").trim(),
      rating: stars,
      image:
        String(form.get("image") ?? "").trim() ||
        "/sarjan-assets/banner-textiles-studio.webp",
      avatar: "/sarjan-assets/sarjan-favicon-192.png",
    };

    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(
          data.error ?? "Could not submit testimonial. Please try again.",
        );
        return;
      }
      setMessage(
        "Thank you! Your testimonial was submitted and is pending admin approval. It will appear on the homepage once approved.",
      );
      setRating(0);
      setFormKey((key) => key + 1);
    } catch {
      setMessage("Could not submit testimonial. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      key={formKey}
      className="form-leave-comment sarjan-testimonial-submit-form"
      onSubmit={submit}
    >
      <p className="sarjan-testimonial-form-intro text-secondary text-caption-1">
        Approved wholesale clients can share their experience here. Sarjan
        reviews every submission before it is shown on the homepage.
      </p>

      <div className="wrap sarjan-testimonial-form-row-2">
        <Field label="Your name or company" required>
          <input
            name="author"
            type="text"
            placeholder="Company or contact name"
            defaultValue={defaultAuthor}
            required
          />
        </Field>
        <Field label="Email">
          <input
            name="email"
            type="email"
            placeholder="For admin follow-up only"
            defaultValue={defaultEmail}
          />
        </Field>
      </div>

      <TestimonialStarRating value={rating} onChange={setRating} />

      <div className="wrap sarjan-testimonial-form-row-2">
        <Field label="Product or collection">
          <input
            name="product"
            type="text"
            placeholder="e.g. Printed kurta set"
          />
        </Field>
        <Field label="Price note">
          <input name="price" type="text" placeholder="e.g. ₹680 per set" />
        </Field>
      </div>

      <Field label="Your testimonial" required>
        <textarea
          name="quote"
          rows={5}
          placeholder="Share your experience with Sarjan Textiles…"
          required
        />
      </Field>

      <Field label="Product image URL">
        <input name="image" type="url" placeholder="https://… (optional)" />
      </Field>

      {message ? (
        <p
          className={
            message.includes("pending") || message.includes("Thank you")
              ? "sarjan-testimonial-form-notice is-success"
              : "sarjan-testimonial-form-notice is-error"
          }
        >
          {message}
        </p>
      ) : null}

      <div className="button-submit send-wrap sarjan-testimonial-form-actions">
        <button
          className="tf-btn btn-fill radius-4"
          type="submit"
          disabled={submitting}
        >
          <span className="text text-button">
            {submitting ? "Submitting…" : "Submit for approval"}
          </span>
        </button>
      </div>
    </form>
  );
}
