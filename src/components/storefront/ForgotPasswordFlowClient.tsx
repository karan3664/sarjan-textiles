"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthSideVisual } from "@/components/storefront/AuthSideVisual";
import type { AuthBanners } from "@/lib/auth-banner-types";
import { sarjanButtonClass } from "@/lib/sarjan-button";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";

type Step = "account" | "email" | "mobile" | "password" | "done";

function normalizeMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export function ForgotPasswordFlowClient({
  banners,
}: {
  banners: AuthBanners;
}) {
  const [step, setStep] = useState<Step>("account");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [emailOtpToken, setEmailOtpToken] = useState("");
  const [mobileOtpToken, setMobileOtpToken] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [mobileOtp, setMobileOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const startReset = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const normalizedMobile = normalizeMobile(mobile);
    const res = await fetch("/api/auth/forgot/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        mobile: normalizedMobile,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not start password reset");
      return;
    }
    setResetToken(String(data.resetToken ?? ""));
    setMobile(normalizedMobile);
    setStep("email");
    setMessage("Account found. Verify your email next.");
  };

  const sendEmailOtp = async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        mode: "reset",
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not send email OTP");
      return;
    }
    setEmailOtpToken(String(data.otpToken ?? ""));
    setMessage(data.message ?? "OTP sent to your email");
  };

  const verifyEmailOtp = async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/auth/forgot/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resetToken,
        otpToken: emailOtpToken,
        otp: emailOtp,
        email: email.trim().toLowerCase(),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Email verification failed");
      return;
    }
    setResetToken(String(data.resetToken ?? ""));
    setStep("mobile");
    setMessage("Email verified. Verify your mobile number next.");
  };

  const sendMobileOtp = async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/auth/forgot/send-mobile-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetToken }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not send mobile OTP");
      return;
    }
    setMobileOtpToken(String(data.otpToken ?? ""));
    setMessage(data.message ?? "OTP sent to your mobile");
  };

  const verifyMobileOtp = async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/auth/forgot/verify-mobile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resetToken,
        otpToken: mobileOtpToken,
        otp: mobileOtp,
        mobile,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Mobile verification failed");
      return;
    }
    setResetToken(String(data.resetToken ?? ""));
    setStep("password");
    setMessage("Mobile verified. Set your new password.");
  };

  const completeReset = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/auth/forgot/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not update password");
      return;
    }
    setStep("done");
    setMessage(data.message ?? "Password updated.");
  };

  const stepTitle =
    step === "account"
      ? "Reset password"
      : step === "email"
        ? "Verify email"
        : step === "mobile"
          ? "Verify mobile"
          : step === "password"
            ? "New password"
            : "Password updated";

  return (
    <>
      <div
        className="page-title sarjan-auth-hero"
        style={{
          backgroundImage:
            "url(/template/storefront/images/section/page-title.jpg)",
        }}
      >
        <div className="container">
          <h3 className="heading text-center">{stepTitle}</h3>
          <ul className="breadcrumbs d-flex align-items-center justify-content-center">
            <li>
              <Link className="link" href="/">
                Home
              </Link>
            </li>
            <li>
              <i className="icon-arrRight" />
            </li>
            <li>Reset password</li>
          </ul>
        </div>
      </div>

      <section className="flat-spacing sarjan-auth-page">
        <div className="container">
          <div className="login-wrap sarjan-auth-form">
            <div className="left">
              <div className="heading">
                <h4 className="mb_18">{stepTitle}</h4>
                <p className="text-secondary mb_24">
                  {step === "account"
                    ? "Enter the email and mobile on your Sarjan wholesale account."
                    : step === "done"
                      ? "Your password has been updated. Sign in with your new password."
                      : "Complete each verification step to set a new password yourself."}
                </p>
              </div>

              {step === "account" ? (
                <form onSubmit={startReset}>
                  <fieldset>
                    <input
                      type="email"
                      placeholder="Email address*"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </fieldset>
                  <fieldset className="sarjan-mobile-prefix-field">
                    <span className="sarjan-mobile-prefix">+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="Mobile number*"
                      value={mobile}
                      maxLength={10}
                      onChange={(e) =>
                        setMobile(
                          e.target.value.replace(/\D/g, "").slice(0, 10),
                        )
                      }
                      required
                    />
                  </fieldset>
                  <button
                    type="submit"
                    className={withBtnIcon(sarjanButtonClass("w-100 mt_8"))}
                    disabled={loading}
                  >
                    Continue
                  </button>
                </form>
              ) : null}

              {step === "email" ? (
                <div>
                  <p className="mb_16">
                    Email: <strong>{email}</strong>
                  </p>
                  <div className="sarjan-otp-row mb_16">
                    <input
                      type="text"
                      className="sarjan-otp-input"
                      placeholder="Email OTP*"
                      inputMode="numeric"
                      value={emailOtp}
                      onChange={(e) =>
                        setEmailOtp(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                    />
                    <div className="sarjan-otp-actions">
                      <button
                        type="button"
                        className={withBtnIcon(
                          sarjanButtonClass("sarjan-auth-btn"),
                        )}
                        onClick={sendEmailOtp}
                        disabled={loading}
                      >
                        Send OTP
                      </button>
                      <button
                        type="button"
                        className={withBtnIcon(
                          sarjanButtonClass("sarjan-auth-btn"),
                        )}
                        onClick={verifyEmailOtp}
                        disabled={
                          loading || emailOtp.length !== 6 || !emailOtpToken
                        }
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === "mobile" ? (
                <div>
                  <p className="mb_16">
                    Mobile: <strong>+91 {mobile}</strong>
                  </p>
                  <div className="sarjan-otp-row mb_16">
                    <input
                      type="text"
                      className="sarjan-otp-input"
                      placeholder="Mobile OTP*"
                      inputMode="numeric"
                      value={mobileOtp}
                      onChange={(e) =>
                        setMobileOtp(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                    />
                    <div className="sarjan-otp-actions">
                      <button
                        type="button"
                        className={withBtnIcon(
                          sarjanButtonClass("sarjan-auth-btn"),
                        )}
                        onClick={sendMobileOtp}
                        disabled={loading}
                      >
                        Send OTP
                      </button>
                      <button
                        type="button"
                        className={withBtnIcon(
                          sarjanButtonClass("sarjan-auth-btn"),
                        )}
                        onClick={verifyMobileOtp}
                        disabled={
                          loading || mobileOtp.length !== 6 || !mobileOtpToken
                        }
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === "password" ? (
                <form onSubmit={completeReset}>
                  <fieldset className="position-relative password-item">
                    <input
                      type="password"
                      placeholder="New password*"
                      value={newPassword}
                      minLength={8}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </fieldset>
                  <fieldset className="position-relative password-item">
                    <input
                      type="password"
                      placeholder="Confirm new password*"
                      value={confirmPassword}
                      minLength={8}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </fieldset>
                  <button
                    type="submit"
                    className={withBtnIcon(sarjanButtonClass("w-100 mt_8"))}
                    disabled={loading}
                  >
                    Update password
                  </button>
                </form>
              ) : null}

              {step === "done" ? (
                <Link
                  href="/login"
                  className={withBtnIcon(
                    sarjanButtonClass(
                      "w-100 mt_8 d-inline-flex justify-content-center",
                    ),
                  )}
                >
                  Back to login
                </Link>
              ) : null}

              {message ? (
                <p
                  className={`mt_16 ${/verified|sent|updated|found/i.test(message) ? "text-success" : "text-danger"}`}
                >
                  {message}
                </p>
              ) : null}

              <p className="sarjan-auth-switch mt_24">
                Remember your password? <Link href="/login">Login</Link>
              </p>
            </div>
            <div className="right right--auth-visual">
              <AuthSideVisual mode="forgot" banner={banners.forgot} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
