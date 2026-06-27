"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthSideVisual } from "@/components/storefront/AuthSideVisual";
import { OtpCodeInput } from "@/components/storefront/OtpCodeInput";
import type { AuthBanners } from "@/lib/auth-banner-types";
import { preparePasswordFields } from "@/lib/password-transport-client";
import { sarjanButtonClass } from "@/lib/sarjan-button";
import {
  MIN_CLIENT_PASSWORD_LENGTH,
  minClientPasswordMessage,
} from "@/lib/password-policy";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";

type Step = "account" | "email" | "password" | "done";

export function ForgotPasswordFlowClient({
  banners,
}: {
  banners: AuthBanners;
}) {
  const [step, setStep] = useState<Step>("account");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [emailOtpToken, setEmailOtpToken] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const startReset = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/auth/forgot/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not start password reset");
      return;
    }
    const token = String(data.resetToken ?? "");
    if (!token) {
      setMessage(
        data.message ??
          "If an account exists with this email, password reset instructions have been sent.",
      );
      return;
    }
    setResetToken(token);
    setStep("email");
    setMessage(data.message ?? "Verify your email next.");
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
    if (data.otpToken) {
      setEmailOtpToken(String(data.otpToken));
    } else {
      setEmailOtpToken("");
    }
    setMessage(
      data.message ??
        "If an account exists with this email, a verification code has been sent.",
    );
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
    setStep("password");
    setMessage("Email verified. Set your new password.");
  };

  const completeReset = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    if (newPassword.length < MIN_CLIENT_PASSWORD_LENGTH) {
      setMessage(minClientPasswordMessage("New password"));
      return;
    }
    setLoading(true);
    setMessage("");
    const hashed = await preparePasswordFields(
      { resetToken, newPassword, confirmPassword },
      ["newPassword", "confirmPassword"],
    );
    const res = await fetch("/api/auth/forgot/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hashed),
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
                    ? "Enter the email on your Sarjan wholesale account."
                    : step === "done"
                      ? "Your password has been updated. Sign in with your new password."
                      : "Verify your email to set a new password yourself."}
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
                  <OtpCodeInput
                    label="Email verification code"
                    value={emailOtp}
                    onChange={setEmailOtp}
                    focusTrigger={emailOtpToken || undefined}
                    autoFocus={Boolean(emailOtpToken)}
                  />
                  <div className="sarjan-otp-actions sarjan-otp-actions--stack mt_12">
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
              ) : null}

              {step === "password" ? (
                <form onSubmit={completeReset}>
                  <p className="text-caption-1 mb_8">
                    {minClientPasswordMessage("New password")}
                  </p>
                  <fieldset className="position-relative password-item">
                    <input
                      type="password"
                      placeholder="New password*"
                      value={newPassword}
                      minLength={MIN_CLIENT_PASSWORD_LENGTH}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </fieldset>
                  <fieldset className="position-relative password-item">
                    <input
                      type="password"
                      placeholder="Confirm new password*"
                      value={confirmPassword}
                      minLength={MIN_CLIENT_PASSWORD_LENGTH}
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
