"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function RegistrationThankYouClient() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(localStorage.getItem("sarjan-client-token")?.trim()));
  }, []);

  return (
    <>
      <div
        className="page-title"
        style={{
          backgroundImage:
            "url(/template/storefront/images/section/page-title.jpg)",
        }}
      >
        <div className="container">
          <h3 className="heading text-center">Thank you for registering</h3>
          <ul className="breadcrumbs d-flex align-items-center justify-content-center">
            <li>
              <Link className="link" href="/">
                Homepage
              </Link>
            </li>
            <li>
              <i className="icon-arrRight" />
            </li>
            <li>Registration</li>
          </ul>
        </div>
      </div>

      <section className="flat-spacing-2">
        <div className="container" style={{ maxWidth: 720 }}>
          <div
            className="sarjan-registration-thankyou card border-0 shadow-sm"
            style={{
              borderRadius: 14,
              padding: "clamp(24px, 4vw, 40px)",
              background: "#fbfaf7",
              border: "1px solid #e8e2d9",
            }}
          >
            <p
              className="text-title text-center mb_20"
              style={{
                color: "#141414",
                fontSize: "1.05rem",
                lineHeight: 1.65,
              }}
            >
              Thank you for registering with <strong>Sarjan Textiles</strong>.
              We have received your wholesale (B2B) application.
            </p>

            <div
              className="mb_28"
              style={{
                padding: "18px 20px",
                borderRadius: 12,
                background: "#fff",
                border: "1px solid #e8e2d9",
              }}
            >
              <p
                className="text-button mb_12"
                style={{ color: "#8b1e2d", letterSpacing: "0.06em" }}
              >
                What happens next
              </p>
              <ul
                className="text-secondary mb-0"
                style={{
                  paddingLeft: "1.15rem",
                  lineHeight: 1.75,
                  fontSize: "0.95rem",
                }}
              >
                <li className="mb_8">
                  Our team will review your company details. This usually takes
                  a short time during business hours.
                </li>
                <li className="mb_8">
                  <strong>
                    Once your account is approved by an administrator
                  </strong>
                  , you will receive a <strong>confirmation email</strong> at
                  the address you used to register.
                </li>
                <li>
                  After approval, you will be able to{" "}
                  <strong>view wholesale prices</strong>, add products to your
                  cart, and <strong>place B2B order requests</strong> with us.
                </li>
              </ul>
            </div>

            {signedIn ? (
              <p
                className="text-secondary text-center mb_24"
                style={{ fontSize: "0.92rem", lineHeight: 1.65 }}
              >
                You are signed in. Explore the catalog anytime; wholesale prices
                will appear automatically after your account is approved.
              </p>
            ) : (
              <p
                className="text-secondary text-center mb_24"
                style={{ fontSize: "0.92rem", lineHeight: 1.65 }}
              >
                If you have an account, sign in to track status. After approval,
                sign in to view prices and place B2B orders.
              </p>
            )}

            <div className="d-flex flex-wrap gap10 justify-content-center">
              <Link href="/products" className="tf-btn btn-fill radius-4">
                <span className="text">Browse products</span>
              </Link>
              <Link href="/" className="tf-btn btn-white radius-4 has-border">
                <span className="text">Back to home</span>
              </Link>
              <Link
                href="/contact"
                className="tf-btn btn-white radius-4 has-border"
              >
                <span className="text">Contact us</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
