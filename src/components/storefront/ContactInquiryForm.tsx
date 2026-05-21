"use client";

import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";

import { useState } from "react";
import type { FormEvent } from "react";
import { EmojiTextarea } from "@/components/shared/EmojiTextarea";

export function ContactInquiryForm() {
  const [statusMessage, setStatusMessage] = useState("");
  const [formKey, setFormKey] = useState(0);

  const isErrorMessage = (text: string) =>
    text.includes("failed") || text.includes("error") || text.includes("retry");

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setStatusMessage("");
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setStatusMessage("Inquiry submit failed. Please retry.");
      return;
    }
    setStatusMessage("Inquiry submitted. Sarjan team will contact you.");
    setFormKey((key) => key + 1);
  };

  return (
    <div className="sarjan-contact-inquiry-form-wrap">
      {statusMessage ? (
        <p
          className={`sarjan-contact-inquiry-status mb_16 ${
            isErrorMessage(statusMessage) ? "text-danger" : "text-success"
          }`}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}
      <form
        key={formKey}
        className="form-leave-comment sarjan-contact-inquiry-form"
        onSubmit={submitInquiry}
      >
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
        <div className="button-submit send-wrap">
          <button className={withBtnIcon("tf-btn btn-fill")} type="submit">
            <TfButtonIcon icon="icon-mail" textClassName="text text-button">
              Submit Inquiry
            </TfButtonIcon>
          </button>
        </div>
      </form>
    </div>
  );
}
