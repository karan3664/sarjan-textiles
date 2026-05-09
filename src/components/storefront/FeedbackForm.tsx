"use client";

import { useState } from "react";

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
    const data = await res.json();
    setMessage(res.ok ? "Feedback saved." : data.error ?? "Feedback failed.");
    if (res.ok) event.currentTarget.reset();
  };

  return (
    <form className="form-leave-comment mt_32" onSubmit={submit}>
      <div className="wrap">
        <fieldset><input name="companyName" placeholder="Company name" /></fieldset>
        <fieldset><input name="email" placeholder="Email" type="email" /></fieldset>
      </div>
      <fieldset><input name="orderId" placeholder="Order ID" /></fieldset>
      <fieldset><textarea name="message" placeholder="Write feedback" /></fieldset>
      {message ? <p className={message.includes("failed") || message.includes("required") ? "text-danger" : "text-success"}>{message}</p> : null}
      <button className="tf-btn btn-fill radius-4" type="submit"><span className="text">Submit Feedback</span></button>
    </form>
  );
}
