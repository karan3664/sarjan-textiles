"use client";

import { FormEvent, useState } from "react";
import { preparePasswordField } from "@/lib/password-transport-client";

type Step = "credentials" | "otp";

type Props = {
  defaultEmail: string;
  nextPath: string;
  initialError?: string;
  initialStep?: Step;
  initialChallengeToken?: string;
  initialOtpToken?: string;
  initialMaskedEmail?: string;
};

export function AdminLoginClient({
  defaultEmail,
  nextPath,
  initialError,
  initialStep = "credentials",
  initialChallengeToken = "",
  initialOtpToken = "",
  initialMaskedEmail = "",
}: Props) {
  const [step, setStep] = useState<Step>(initialStep);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [challengeToken, setChallengeToken] = useState(initialChallengeToken);
  const [otpToken, setOtpToken] = useState(initialOtpToken);
  const [maskedEmail, setMaskedEmail] = useState(initialMaskedEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialError ?? "");
  const [info, setInfo] = useState(
    initialStep === "otp" ? "Verification code sent to your email." : "",
  );

  const submitCredentials = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setInfo("");
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: await preparePasswordField(password),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Login failed");
        return;
      }
      if (!data.requiresOtp) {
        window.location.assign(nextPath || "/admin");
        return;
      }
      setChallengeToken(String(data.challengeToken ?? ""));
      setOtpToken(String(data.otpToken ?? ""));
      setMaskedEmail(String(data.maskedEmail ?? data.email ?? email));
      const devOtp =
        typeof data.devOtp === "string" && data.devOtp.trim()
          ? data.devOtp.trim()
          : "";
      setInfo(
        devOtp
          ? `Dev OTP: ${devOtp}`
          : String(data.message ?? "Verification code sent to your email."),
      );
      setStep("otp");
      setOtp("");
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (otp.trim().length !== 6) {
      setMessage("Enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ challengeToken, otpToken, otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Verification failed");
        return;
      }
      window.location.assign(nextPath || "/admin");
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Could not resend code");
        return;
      }
      setOtpToken(String(data.otpToken ?? otpToken));
      const devOtp =
        typeof data.devOtp === "string" && data.devOtp.trim()
          ? data.devOtp.trim()
          : "";
      setInfo(
        devOtp
          ? `Dev OTP: ${devOtp}`
          : String(data.message ?? "New code sent."),
      );
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <form className="sarjan-admin-login-card" onSubmit={submitOtp}>
        <img
          src="/sarjan-assets/sarjan-logo-full.png"
          alt="Sarjan Textiles"
          className="sarjan-admin-login-logo"
        />
        <h3>Verify sign-in</h3>
        <p>
          Enter the 6-digit code sent to <strong>{maskedEmail}</strong>{" "}
          (two-factor security).
        </p>

        {info ? (
          <div className="sarjan-admin-login-info" role="status">
            {info}
          </div>
        ) : null}

        <input
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          value={otp}
          onChange={(e) =>
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          maxLength={6}
          required
        />

        {message ? (
          <div className="sarjan-admin-login-error" role="alert">
            {message}
          </div>
        ) : null}

        <button type="submit" disabled={loading}>
          {loading ? "Verifying…" : "Verify & sign in"}
        </button>
        <button
          type="button"
          className="sarjan-admin-login-link"
          disabled={loading}
          onClick={() => void resendOtp()}
        >
          Resend code
        </button>
        <button
          type="button"
          className="sarjan-admin-login-link"
          disabled={loading}
          onClick={() => {
            setStep("credentials");
            setOtp("");
            setMessage("");
            setInfo("");
          }}
        >
          Back to password
        </button>
      </form>
    );
  }

  return (
    <form className="sarjan-admin-login-card" onSubmit={submitCredentials}>
      <img
        src="/sarjan-assets/sarjan-logo-full.png"
        alt="Sarjan Textiles"
        className="sarjan-admin-login-logo"
      />
      <h3>Admin Login</h3>
      <p>
        Protected Sarjan Textiles operating system. Email verification required
        after password.
      </p>

      <input
        name="email"
        type="email"
        placeholder="Admin email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        required
      />

      <div className="sarjan-admin-login-password">
        <input
          id="admin-login-password"
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <button
          type="button"
          className="sarjan-admin-login-password-toggle"
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          onClick={() => setShowPassword((v) => !v)}
        >
          <svg
            className="sarjan-admin-login-eye-show"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            hidden={showPassword}
          >
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg
            className="sarjan-admin-login-eye-hide"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            hidden={!showPassword}
          >
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        </button>
      </div>

      {message ? (
        <div
          className="sarjan-admin-login-error"
          role="alert"
          aria-live="assertive"
        >
          {message}
        </div>
      ) : null}

      <button type="submit" disabled={loading}>
        {loading ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
