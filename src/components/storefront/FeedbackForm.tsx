"use client";

import { useState } from "react";

type FeedbackFormProps = {
  defaultMode?: "feedback" | "testimonial";
};

export function FeedbackForm({
  defaultMode = "testimonial",
}: FeedbackFormProps) {
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"feedback" | "testimonial">(defaultMode);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const endpoint =
      mode === "testimonial" ? "/api/testimonials" : "/api/feedback";
    const payload =
      mode === "testimonial"
        ? {
            author: form.get("companyName"),
            product: form.get("product"),
            price: form.get("price"),
            quote: form.get("message"),
            avatar: "/sarjan-assets/sarjan-favicon-192.png",
            image:
              form.get("image") || "/sarjan-assets/banner-textiles-studio.webp",
          }
        : {
            companyName: form.get("companyName"),
            email: form.get("email"),
            orderId: form.get("orderId"),
            message: form.get("message"),
          };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? mode === "testimonial"
          ? "Testimonial submitted for admin approval."
          : "Feedback saved."
        : (data.error ?? "Submit failed."),
    );
    if (res.ok) event.currentTarget.reset();
  };

  return (
    <form className="form-leave-comment mt_32" onSubmit={submit}>
      <div className="d-flex gap-12 mb_20">
        <button
          type="button"
          className={`tf-btn ${mode === "testimonial" ? "btn-fill" : "btn-white has-border"} radius-4`}
          onClick={() => setMode("testimonial")}
        >
          <span className="text">Testimonial</span>
        </button>
        <button
          type="button"
          className={`tf-btn ${mode === "feedback" ? "btn-fill" : "btn-white has-border"} radius-4`}
          onClick={() => setMode("feedback")}
        >
          <span className="text">Feedback</span>
        </button>
      </div>
      <div className="wrap">
        <fieldset>
          <input
            name="companyName"
            placeholder={
              mode === "testimonial" ? "Author / Company name" : "Company name"
            }
            required
          />
        </fieldset>
        <fieldset>
          <input
            name="email"
            placeholder="Email"
            type="email"
            required={mode === "feedback"}
          />
        </fieldset>
      </div>
      {mode === "testimonial" ? (
        <div className="wrap">
          <fieldset>
            <input name="product" placeholder="Product name" />
          </fieldset>
          <fieldset>
            <input name="price" placeholder="Product price" />
          </fieldset>
        </div>
      ) : (
        <fieldset>
          <input name="orderId" placeholder="Order ID" />
        </fieldset>
      )}
      {mode === "testimonial" ? (
        <fieldset>
          <input name="image" placeholder="Product image URL optional" />
        </fieldset>
      ) : null}
      <fieldset>
        <textarea
          name="message"
          placeholder={
            mode === "testimonial"
              ? "Write testimonial quote"
              : "Write feedback"
          }
          required
        />
      </fieldset>
      {message ? (
        <p
          className={
            message.includes("failed") || message.includes("required")
              ? "text-danger"
              : "text-success"
          }
        >
          {message}
        </p>
      ) : null}
      <button className="tf-btn btn-fill radius-4" type="submit">
        <span className="text">
          {mode === "testimonial" ? "Submit for Approval" : "Submit Feedback"}
        </span>
      </button>
    </form>
  );
}
