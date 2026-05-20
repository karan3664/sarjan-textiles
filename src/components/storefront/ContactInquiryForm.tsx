"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { EmojiTextarea } from "@/components/shared/EmojiTextarea";

export function ContactInquiryForm() {
  const [message, setMessage] = useState("");

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setMessage("Inquiry submit failed. Please retry.");
      return;
    }
    form.reset();
    setMessage("Inquiry submitted. Sarjan team will contact you.");
  };

  return (
    <form className="form-leave-comment" onSubmit={submitInquiry}>
      <div className="wrap">
        <div className="cols">
          <fieldset>
            <input
              type="text"
              placeholder="Company Name*"
              name="companyName"
              required
            />
          </fieldset>
          <fieldset>
            <input
              type="text"
              placeholder="Contact Person*"
              name="contactPerson"
              required
            />
          </fieldset>
        </div>
        <div className="cols">
          <fieldset>
            <input
              type="email"
              placeholder="Email Address*"
              name="email"
              required
            />
          </fieldset>
          <fieldset>
            <input
              type="tel"
              placeholder="Phone Number*"
              name="phone"
              required
            />
          </fieldset>
        </div>
        <fieldset>
          <input
            type="text"
            placeholder="Buying category / MOQ requirement"
            name="requirement"
          />
        </fieldset>
        <fieldset>
          <EmojiTextarea
            name="message"
            rows={4}
            placeholder="Your Message* (emoji welcome)"
            required
          />
        </fieldset>
      </div>
      {message ? <p className="text-secondary mt_12">{message}</p> : null}
      <div className="button-submit send-wrap">
        <button className="tf-btn btn-fill" type="submit">
          <span className="text text-button">Submit Inquiry</span>
        </button>
      </div>
    </form>
  );
}
