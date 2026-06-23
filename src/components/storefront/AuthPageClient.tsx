"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { checkClientFieldsUnique } from "@/lib/check-client-unique";
import {
  isValidClientPhone,
  normalizeClientPhone,
} from "@/lib/client-duplicate-check";
import { persistClientSession } from "@/lib/client-auth-browser";
import { AuthSideVisual } from "@/components/storefront/AuthSideVisual";
import type { AuthBanners } from "@/lib/auth-banner-types";
import { IndiaStateCitySelect } from "@/components/shared/IndiaStateCitySelect";
import { clientPostLoginPath } from "@/lib/auth-route-guards";
import { sarjanButtonClass } from "@/lib/sarjan-button";
import {
  MIN_CLIENT_PASSWORD_LENGTH,
  minClientPasswordMessage,
} from "@/lib/password-policy";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";

type AuthMode = "login" | "register" | "forgot";

function isErrorMessage(value: string) {
  return /failed|invalid|required|incorrect|verify|unavailable|match/i.test(
    value,
  );
}

function safeAuthRedirect(next: string | null) {
  return clientPostLoginPath(next?.trim() || null);
}

function loginMethodHref(
  method: "password" | "otp",
  searchParams: ReadonlyURLSearchParams,
) {
  const params = new URLSearchParams(searchParams.toString());
  if (method === "password") {
    params.set("method", "password");
  } else {
    params.delete("method");
  }
  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}

const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function normalizeGstin(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function isValidGstin(value: string) {
  return gstinPattern.test(normalizeGstin(value));
}

function PageTitle({ title }: { title: string }) {
  return (
    <div
      className="page-title sarjan-auth-hero"
      style={{
        backgroundImage:
          "url(/template/storefront/images/section/page-title.jpg)",
      }}
    >
      <div className="container">
        <h3 className="heading text-center">{title}</h3>
        <ul className="breadcrumbs d-flex align-items-center justify-content-center">
          <li>
            <Link className="link" href="/">
              Homepage
            </Link>
          </li>
          <li>
            <i className="icon-arrRight" />
          </li>
          <li>
            <Link className="link" href="/products">
              Pages
            </Link>
          </li>
          <li>
            <i className="icon-arrRight" />
          </li>
          <li>{title}</li>
        </ul>
      </div>
    </div>
  );
}

function authPageTitle(mode: AuthMode) {
  if (mode === "register") return "Register";
  if (mode === "forgot") return "Forgot Password";
  return "Login";
}

function AuthPageFallback({ mode }: { mode: AuthMode }) {
  return (
    <>
      <PageTitle title={authPageTitle(mode)} />
      <section className="flat-spacing sarjan-auth-page">
        <div className="container text-center py-5 text-secondary">
          Loading…
        </div>
      </section>
    </>
  );
}

function AuthPageClientInner({
  mode,
  banners,
  initialLoginMethod = "otp",
}: {
  mode: AuthMode;
  banners: AuthBanners;
  initialLoginMethod?: "password" | "otp";
}) {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [gst, setGst] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [gstMessage, setGstMessage] = useState("");
  const [gstVerified, setGstVerified] = useState(false);
  const [gstManualAllowed, setGstManualAllowed] = useState(false);
  const [gstLoading, setGstLoading] = useState(false);
  const [captchaSessionId, setCaptchaSessionId] = useState<string | null>(null);
  const [captchaB64, setCaptchaB64] = useState<string | null>(null);
  const [captchaMediaType, setCaptchaMediaType] = useState("image/png");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaFetching, setCaptchaFetching] = useState(false);
  const [captchaLoadError, setCaptchaLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpToken, setEmailOtpToken] = useState("");
  const [emailOtpMessage, setEmailOtpMessage] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [registerState, setRegisterState] = useState("");
  const [registerCity, setRegisterCity] = useState("");
  const [mobile, setMobile] = useState("");
  const [usePasswordLogin, setUsePasswordLogin] = useState(
    initialLoginMethod === "password",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginOtp, setLoginOtp] = useState("");
  const [loginOtpToken, setLoginOtpToken] = useState("");
  const [loginOtpLoading, setLoginOtpLoading] = useState(false);
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const isLogin = mode === "login";
  const normalizedGst = normalizeGstin(gst);
  const gstinReady = isValidGstin(normalizedGst);

  useEffect(() => {
    if (mode !== "login") return;
    try {
      const flash = sessionStorage.getItem("sarjan-login-flash")?.trim();
      if (flash) {
        setMessage(flash);
        sessionStorage.removeItem("sarjan-login-flash");
      }
    } catch {
      /* ignore */
    }
  }, [mode]);

  useEffect(() => {
    if (!isLogin) return;
    setUsePasswordLogin(searchParams.get("method") === "password");
  }, [isLogin, searchParams]);

  const loadGstCaptcha = useCallback(async () => {
    if (!isRegister || !isValidGstin(normalizeGstin(gst))) return;
    setCaptchaFetching(true);
    setCaptchaLoadError("");
    try {
      const res = await fetch("/api/gst/captcha");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load captcha");
      setCaptchaSessionId(data.sessionId);
      setCaptchaB64(data.imageBase64);
      setCaptchaMediaType(
        typeof data.mediaType === "string" ? data.mediaType : "image/png",
      );
      setCaptchaInput("");
    } catch (error) {
      setCaptchaSessionId(null);
      setCaptchaB64(null);
      setCaptchaLoadError(
        error instanceof Error ? error.message : "Captcha load failed",
      );
    } finally {
      setCaptchaFetching(false);
    }
  }, [gst, isRegister]);

  useEffect(() => {
    if (!isRegister) {
      setCaptchaSessionId(null);
      setCaptchaB64(null);
      setCaptchaInput("");
      setCaptchaLoadError("");
      return;
    }
    if (!gstinReady) {
      setCaptchaSessionId(null);
      setCaptchaB64(null);
      setCaptchaInput("");
      return;
    }
    void loadGstCaptcha();
  }, [gstinReady, isRegister, loadGstCaptcha]);

  const title = isRegister
    ? "Register"
    : isForgot
      ? "Forget Password"
      : "Login";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (isLogin && !usePasswordLogin) {
      const normalized = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        setLoading(false);
        setMessage("Enter a valid email address");
        return;
      }
      if (!loginOtpToken) {
        setLoading(false);
        await sendLoginOtp();
        return;
      }
      if (loginOtp.length !== 6) {
        setLoading(false);
        setMessage("Enter the 6-digit OTP sent to your email");
        return;
      }
      try {
        const res = await fetch("/api/auth/login-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: normalized,
            otp: loginOtp,
            otpToken: loginOtpToken,
          }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) {
          setMessage(data.error ?? "Login failed");
          return;
        }
        if (data.client?.id) {
          persistClientSession("", data.client);
          window.location.assign(safeAuthRedirect(searchParams.get("next")));
        }
      } catch {
        setLoading(false);
        setMessage("Login failed");
      }
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (isRegister && payload.password !== payload.confirmPassword) {
      setLoading(false);
      setMessage("Passwords do not match");
      return;
    }
    if (
      isRegister &&
      String(payload.password ?? "").length < MIN_CLIENT_PASSWORD_LENGTH
    ) {
      setLoading(false);
      setMessage(minClientPasswordMessage());
      return;
    }
    if (isRegister && !emailVerified) {
      setLoading(false);
      setMessage("Email OTP verification required");
      return;
    }
    const normalizedGstInput = normalizeGstin(String(payload.gst ?? ""));
    const hasGst = isRegister && normalizedGstInput.length > 0;
    if (isRegister && hasGst && !isValidGstin(normalizedGstInput)) {
      setLoading(false);
      setMessage("Enter a valid 15-character GSTIN or leave GST blank.");
      return;
    }
    if (isRegister && !String(payload.companyName ?? "").trim()) {
      setLoading(false);
      setMessage("Trade / business name is required.");
      return;
    }
    const mobileRaw = String(payload.mobile ?? mobile).trim();
    if (isRegister && !mobileRaw) {
      setLoading(false);
      setMessage("Mobile number is required.");
      return;
    }
    if (isRegister && !isValidClientPhone(mobileRaw)) {
      setLoading(false);
      setMessage(
        "Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).",
      );
      return;
    }
    if (
      isRegister &&
      hasGst &&
      !String(payload.ownerLegalName ?? "").trim() &&
      gstManualAllowed
    ) {
      setLoading(false);
      setMessage("Legal / proprietor full name (as on GST) is required.");
      return;
    }
    if (isRegister && hasGst && !gstVerified && !gstManualAllowed) {
      setLoading(false);
      setMessage(
        "Verify GST with the captcha, or leave GST blank to register without it.",
      );
      return;
    }
    if (isRegister) {
      const unique = await checkClientFieldsUnique({
        email: String(payload.email ?? "").trim(),
        phone: normalizeClientPhone(mobileRaw),
        ...(hasGst ? { gst: normalizedGstInput } : {}),
      });
      if (!unique.ok) {
        setLoading(false);
        setMessage(unique.error);
        return;
      }
    }
    const endpoint = isRegister
      ? "/api/auth/register"
      : isForgot
        ? "/api/auth/forgot"
        : "/api/auth/login";

    if (isRegister) {
      if (!registerState.trim() || !registerCity.trim()) {
        setLoading(false);
        setMessage("Select state and city.");
        return;
      }
      payload.state = registerState;
      payload.city = registerCity;
      payload.mobile = normalizeClientPhone(mobileRaw);
      if (!hasGst) {
        delete payload.gst;
      } else {
        payload.gst = normalizedGstInput;
      }
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error ?? "Request failed");
      return;
    }

    if (data.client?.id) {
      persistClientSession("", data.client);
      window.location.assign(safeAuthRedirect(searchParams.get("next")));
      return;
    }

    if (isRegister && res.ok) {
      window.location.assign("/registration-thank-you");
      return;
    }

    setMessage(
      isForgot
        ? (data.message ?? "Password reset email sent.")
        : "Password reset request saved. Admin will contact client.",
    );
  };

  const sendLoginOtp = async () => {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setMessage("Enter a valid email address");
      return;
    }
    setLoginOtpLoading(true);
    setMessage("");
    setLoginOtp("");
    setLoginOtpToken("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized, mode: "login" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send OTP");
      setEmail(normalized);
      if (data.otpToken) {
        setLoginOtpToken(String(data.otpToken));
        setMessage(data.message ?? "OTP sent. Check your email inbox.");
      } else {
        setLoginOtpToken("");
        setMessage(
          data.message ??
            "If an account exists with this email, a verification code has been sent.",
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send OTP");
    } finally {
      setLoginOtpLoading(false);
    }
  };

  const resetEmailOtp = (nextEmail: string) => {
    setEmail(nextEmail);
    setEmailOtp("");
    setEmailOtpToken("");
    setEmailOtpMessage("");
    setEmailOtpSent(false);
    setEmailVerified(false);
  };

  const sendEmailOtp = async () => {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setEmailOtpMessage("Enter valid email first");
      return;
    }
    setEmailOtpLoading(true);
    setEmailOtpMessage("");
    setEmailVerified(false);
    try {
      const unique = await checkClientFieldsUnique({ email: normalized });
      if (!unique.ok) {
        setEmailOtpMessage(unique.error);
        return;
      }
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "OTP send failed");
      setEmail(normalized);
      setEmailOtpToken(data.otpToken);
      setEmailOtpSent(true);
      setEmailOtpMessage("OTP sent. Check email inbox.");
    } catch (error) {
      setEmailOtpMessage(
        error instanceof Error ? error.message : "OTP send failed",
      );
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (!emailOtpToken || !emailOtp.trim()) {
      setEmailOtpMessage("Enter OTP sent to email");
      return;
    }
    setEmailOtpLoading(true);
    setEmailOtpMessage("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: emailOtp, otpToken: emailOtpToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "OTP verification failed");
      setEmailVerified(true);
      setEmailOtpMessage("Email verified");
    } catch (error) {
      setEmailVerified(false);
      setEmailOtpMessage(
        error instanceof Error ? error.message : "OTP verification failed",
      );
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const verifyGst = async () => {
    const normalized = normalizeGstin(gst);
    setGst(normalized);
    if (!isValidGstin(normalized)) {
      setGstVerified(false);
      setGstManualAllowed(false);
      setGstMessage("Invalid GST number format");
      return;
    }
    const digits = captchaInput.replace(/\D/g, "").slice(0, 6);
    if (!captchaSessionId || digits.length !== 6) {
      setGstVerified(false);
      setGstManualAllowed(false);
      setGstMessage(
        "Enter the 6-digit code from the GST captcha image (use Refresh if the image is unclear).",
      );
      return;
    }
    setGstLoading(true);
    setGstMessage("");
    setGstVerified(false);
    setGstManualAllowed(false);
    try {
      const res = await fetch("/api/gst/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gst: normalized,
          captcha: digits,
          captchaSessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "GST verification failed");
      const legal = String(data.gst.legalName ?? "").trim();
      const tradeRaw =
        typeof data.gst.tradeName === "string" ? data.gst.tradeName.trim() : "";
      const trade = tradeRaw || legal;
      setCompanyName(trade);
      setOwnerFullName(legal);
      const verifiedGstin = normalizeGstin(
        String(data.gst.gstin ?? normalized),
      );
      setGst(verifiedGstin);
      const gstUnique = await checkClientFieldsUnique({ gst: verifiedGstin });
      if (!gstUnique.ok) {
        setGstVerified(false);
        setGstMessage(gstUnique.error);
        return;
      }
      setGstVerified(true);
      setGstMessage(
        tradeRaw && tradeRaw !== legal
          ? `Verified — trade: ${tradeRaw}; proprietor: ${legal}`
          : `Verified — proprietor: ${legal}`,
      );
      setCaptchaInput("");
      setCaptchaSessionId(null);
      setCaptchaB64(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "GST verification failed";
      if (
        /no taxpayer|unavailable|blocked|try again|captcha|automated lookup|timed out|lookup failed|configure SARJAN_GST_LOOKUP|6-digit code|Captcha session expired|digits as shown|GST portal is busy|GST portal requires captcha|GST lookup timed out|did not match the captcha|could not return taxpayer details|did not return company name|closed the server connection|closed the connection|temporarily unreachable|server connection/i.test(
          message,
        )
      ) {
        setGstManualAllowed(true);
        setGstMessage(message);
      } else {
        setGstManualAllowed(false);
        setGstMessage(message);
      }
      void loadGstCaptcha();
    } finally {
      setGstLoading(false);
    }
  };

  return (
    <>
      <PageTitle title={title} />
      <section className="flat-spacing sarjan-auth-page">
        <div className="container">
          <div className="login-wrap sarjan-auth-layout">
            <div className="left sarjan-auth-form-panel">
              <div className="heading">
                <h4>{title}</h4>
              </div>
              <form
                action="#"
                className="form-login form-has-password sarjan-auth-form"
                onSubmit={submit}
              >
                <div className="wrap">
                  {isRegister ? (
                    <>
                      <p className="sarjan-auth-intro">
                        GST is optional. Add and verify your GSTIN to auto-fill
                        trade and legal names from the portal, or register with
                        your business details only.
                      </p>
                      <fieldset>
                        <input
                          type="text"
                          placeholder="GST number (optional)"
                          name="gst"
                          value={gst}
                          readOnly={gstVerified && !gstManualAllowed}
                          onChange={(event) => {
                            setGst(event.target.value.toUpperCase());
                            setGstVerified(false);
                            setGstManualAllowed(false);
                            setCompanyName("");
                            setOwnerFullName("");
                          }}
                        />
                      </fieldset>
                      {gst.trim() && !gstinReady ? (
                        <p className="sarjan-gst-captcha-hint">
                          Enter a full 15-character GSTIN. A captcha from the
                          official GST portal will load automatically.
                        </p>
                      ) : null}
                      {gst.trim() && gstinReady && !gstVerified ? (
                        <>
                          <p className="sarjan-gst-captcha-hint">
                            Security check from{" "}
                            <a
                              href="https://services.gst.gov.in/services/searchtp"
                              target="_blank"
                              rel="noreferrer"
                            >
                              GST portal
                            </a>
                            : type the 6 digits shown in the image.
                          </p>
                          <div className="sarjan-gst-captcha-panel">
                            {captchaB64 ? (
                              <img
                                className="sarjan-gst-captcha-img"
                                src={`data:${captchaMediaType};base64,${captchaB64}`}
                                alt="GST captcha"
                              />
                            ) : captchaFetching ? (
                              <span className="text-caption-1 text-secondary">
                                Loading captcha…
                              </span>
                            ) : null}
                            <div className="sarjan-gst-captcha-actions">
                              <button
                                type="button"
                                className={withBtnIcon(
                                  "tf-btn btn-fill sarjan-gst-captcha-refresh",
                                )}
                                onClick={() => void loadGstCaptcha()}
                                disabled={
                                  captchaFetching || gstLoading || !gstinReady
                                }
                              >
                                <TfButtonIcon
                                  icon="icon-arrowClockwise"
                                  textClassName="text text-button"
                                >
                                  {captchaFetching
                                    ? "Loading…"
                                    : "Refresh image"}
                                </TfButtonIcon>
                              </button>
                            </div>
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              placeholder="6-digit captcha*"
                              value={captchaInput}
                              onChange={(event) =>
                                setCaptchaInput(
                                  event.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 6),
                                )
                              }
                              maxLength={6}
                              style={{
                                height: 50,
                                maxWidth: 160,
                                letterSpacing: "0.2em",
                              }}
                            />
                          </div>
                          {captchaLoadError ? (
                            <p className="text-danger">{captchaLoadError}</p>
                          ) : null}
                          <fieldset style={{ marginTop: 8 }}>
                            <button
                              type="button"
                              className={withBtnIcon("tf-btn btn-fill")}
                              style={{ width: "100%" }}
                              onClick={verifyGst}
                              disabled={
                                gstLoading ||
                                captchaFetching ||
                                !captchaSessionId ||
                                captchaInput.replace(/\D/g, "").length !== 6
                              }
                            >
                              <TfButtonIcon
                                icon="icon-checkCircle"
                                textClassName="text text-button"
                              >
                                {gstLoading
                                  ? "Verifying…"
                                  : "Verify GST with portal"}
                              </TfButtonIcon>
                            </button>
                          </fieldset>
                        </>
                      ) : null}
                      <fieldset>
                        <input
                          type="text"
                          placeholder={
                            gst.trim()
                              ? gstManualAllowed
                                ? "Trade / business name*"
                                : "Trade / business name (as on GST)*"
                              : "Trade / business name*"
                          }
                          name="companyName"
                          value={companyName}
                          onChange={(event) =>
                            setCompanyName(event.target.value)
                          }
                          readOnly={
                            Boolean(gst.trim()) &&
                            !gstManualAllowed &&
                            gstVerified
                          }
                          required
                        />
                      </fieldset>
                      <fieldset>
                        <input
                          type="text"
                          placeholder={
                            gst.trim()
                              ? gstManualAllowed
                                ? "Legal name / proprietor full name*"
                                : "Legal name / proprietor (lgnm on GST)*"
                              : "Legal name / proprietor (optional)"
                          }
                          name="ownerLegalName"
                          value={ownerFullName}
                          onChange={(event) =>
                            setOwnerFullName(event.target.value)
                          }
                          readOnly={
                            Boolean(gst.trim()) &&
                            !gstManualAllowed &&
                            gstVerified
                          }
                          required={Boolean(gst.trim())}
                        />
                      </fieldset>
                      {gstMessage ? (
                        <p
                          className={
                            gstVerified
                              ? "text-success"
                              : gstManualAllowed
                                ? "text-secondary"
                                : "text-danger"
                          }
                        >
                          {gstMessage}
                        </p>
                      ) : null}
                      <IndiaStateCitySelect
                        layout="stack"
                        state={registerState}
                        city={registerCity}
                        onStateChange={setRegisterState}
                        onCityChange={setRegisterCity}
                        stateRequired
                        cityRequired
                      />
                      <fieldset>
                        <div className="sarjan-mobile-field d-flex align-items-center gap-2">
                          <span className="text-caption-1 text-nowrap">
                            +91
                          </span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            placeholder="Mobile number*"
                            name="mobile"
                            value={mobile}
                            onChange={(event) =>
                              setMobile(
                                event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 10),
                              )
                            }
                            required
                            maxLength={10}
                            style={{ flex: 1 }}
                          />
                        </div>
                      </fieldset>
                    </>
                  ) : null}
                  <fieldset>
                    <input
                      type="email"
                      placeholder="Username or email address*"
                      name="email"
                      value={email}
                      onChange={(event) => {
                        resetEmailOtp(event.target.value);
                        if (isLogin) {
                          setLoginOtp("");
                          setLoginOtpToken("");
                        }
                      }}
                      required
                    />
                  </fieldset>
                  {isLogin && !usePasswordLogin ? (
                    <>
                      {loginOtpToken ? (
                        <fieldset className="sarjan-otp-row">
                          <input
                            type="text"
                            className="sarjan-otp-input"
                            placeholder="Email OTP*"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={loginOtp}
                            onChange={(event) =>
                              setLoginOtp(
                                event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6),
                              )
                            }
                            required
                          />
                        </fieldset>
                      ) : null}
                      <div className="sarjan-otp-actions mb_16">
                        <button
                          type="button"
                          className={withBtnIcon(
                            sarjanButtonClass("sarjan-auth-btn"),
                          )}
                          onClick={sendLoginOtp}
                          disabled={loginOtpLoading || !email.trim()}
                        >
                          <TfButtonIcon icon="icon-mail">
                            {loginOtpLoading
                              ? "Sending..."
                              : loginOtpToken
                                ? "Resend OTP"
                                : "Send OTP"}
                          </TfButtonIcon>
                        </button>
                      </div>
                    </>
                  ) : null}
                  {isRegister ? (
                    <>
                      <fieldset className="sarjan-otp-row">
                        <input
                          type="text"
                          className="sarjan-otp-input"
                          placeholder="Email OTP*"
                          name="emailOtp"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={emailOtp}
                          onChange={(event) => {
                            setEmailOtp(
                              event.target.value.replace(/\D/g, "").slice(0, 6),
                            );
                            setEmailVerified(false);
                          }}
                          required
                        />
                        <div className="sarjan-otp-actions">
                          <button
                            type="button"
                            className={withBtnIcon(
                              sarjanButtonClass("sarjan-auth-btn"),
                            )}
                            onClick={sendEmailOtp}
                            disabled={emailOtpLoading || !email.trim()}
                          >
                            <TfButtonIcon icon="icon-mail">
                              {emailOtpLoading && !emailOtpSent
                                ? "Sending..."
                                : emailOtpSent
                                  ? "Resend OTP"
                                  : "Send OTP"}
                            </TfButtonIcon>
                          </button>
                          <button
                            type="button"
                            className={withBtnIcon(
                              sarjanButtonClass(
                                "sarjan-auth-btn",
                                emailVerified && "sarjan-auth-btn--verified",
                              ),
                            )}
                            onClick={verifyEmailOtp}
                            disabled={
                              emailOtpLoading ||
                              !emailOtpToken ||
                              emailOtp.length !== 6 ||
                              emailVerified
                            }
                          >
                            <TfButtonIcon
                              icon={
                                emailVerified
                                  ? "icon-check"
                                  : "icon-checkCircle"
                              }
                            >
                              {emailVerified ? "Verified" : "Verify OTP"}
                            </TfButtonIcon>
                          </button>
                        </div>
                      </fieldset>
                      <input
                        type="hidden"
                        name="emailOtpToken"
                        value={emailOtpToken}
                      />
                      {emailOtpMessage ? (
                        <p
                          className={
                            emailVerified || /sent/i.test(emailOtpMessage)
                              ? "text-success"
                              : "text-danger"
                          }
                        >
                          {emailOtpMessage}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {!isForgot && (isRegister || usePasswordLogin) ? (
                    <>
                      {isRegister ? (
                        <p className="text-caption-1 mb_8">
                          {minClientPasswordMessage()}
                        </p>
                      ) : null}
                      <fieldset className="position-relative password-item">
                        <input
                          className="input-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Password*"
                          name="password"
                          minLength={
                            isRegister ? MIN_CLIENT_PASSWORD_LENGTH : undefined
                          }
                          required
                        />
                        <button
                          type="button"
                          className={`toggle-password ${showPassword ? "" : "unshow"}`}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          onClick={() => setShowPassword((visible) => !visible)}
                        >
                          <i className="icon-eye-hide-line" />
                        </button>
                      </fieldset>
                    </>
                  ) : null}
                  {isRegister ? (
                    <fieldset className="position-relative password-item">
                      <input
                        className="input-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm Password*"
                        name="confirmPassword"
                        minLength={MIN_CLIENT_PASSWORD_LENGTH}
                        required
                      />
                      <button
                        type="button"
                        className={`toggle-password ${showConfirmPassword ? "" : "unshow"}`}
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                        onClick={() =>
                          setShowConfirmPassword((visible) => !visible)
                        }
                      >
                        <i className="icon-eye-hide-line" />
                      </button>
                    </fieldset>
                  ) : null}
                  {isLogin ? (
                    <div className="sarjan-auth-form-meta d-flex align-items-center justify-content-between flex-wrap">
                      {usePasswordLogin ? (
                        <>
                          <div className="tf-cart-checkbox">
                            <div className="tf-checkbox-wrapp">
                              <input
                                defaultChecked
                                type="checkbox"
                                id="login-form_agree"
                                name="agree_checkbox"
                              />
                              <div>
                                <i className="icon-check" />
                              </div>
                            </div>
                            <label htmlFor="login-form_agree">
                              Remember me
                            </label>
                          </div>
                          <a
                            href="/forgot-password"
                            className="font-2 text-button forget-password link"
                          >
                            Forgot Your Password?
                          </a>
                        </>
                      ) : (
                        <Link
                          href={loginMethodHref("password", searchParams)}
                          className="font-2 text-button link"
                          onClick={() => {
                            setUsePasswordLogin(true);
                            setShowPassword(false);
                            setLoginOtp("");
                            setLoginOtpToken("");
                            setMessage("");
                          }}
                        >
                          Use password instead
                        </Link>
                      )}
                    </div>
                  ) : null}
                  {isLogin && usePasswordLogin ? (
                    <p className="sarjan-auth-switch mt_8 mb_0">
                      <Link
                        href={loginMethodHref("otp", searchParams)}
                        className="font-2 text-button link"
                        onClick={() => {
                          setUsePasswordLogin(false);
                          setShowPassword(false);
                          setMessage("");
                        }}
                      >
                        Use email OTP instead
                      </Link>
                    </p>
                  ) : null}
                  {isRegister ? (
                    <div className="sarjan-auth-form-meta d-flex align-items-center flex-wrap">
                      <div className="tf-cart-checkbox">
                        <div className="tf-checkbox-wrapp">
                          <input
                            defaultChecked
                            type="checkbox"
                            id="register-form_agree"
                            name="agree_checkbox"
                          />
                          <div>
                            <i className="icon-check" />
                          </div>
                        </div>
                        <label
                          className="text-secondary-2"
                          htmlFor="register-form_agree"
                        >
                          I agree to the&nbsp;
                        </label>
                      </div>
                      <a href="/term-of-use" title="Terms of Service">
                        {" "}
                        Terms of User
                      </a>
                    </div>
                  ) : null}
                </div>
                {message ? (
                  <p
                    className={
                      isErrorMessage(message) ? "text-danger" : "text-success"
                    }
                  >
                    {message}
                  </p>
                ) : null}
                <div className="button-submit sarjan-auth-submit-wrap">
                  <button
                    className={withBtnIcon(
                      "tf-btn btn-fill sarjan-auth-submit",
                    )}
                    type="submit"
                    disabled={loading}
                  >
                    <TfButtonIcon
                      icon={isForgot ? "icon-security" : "icon-user"}
                      textClassName="text text-button"
                    >
                      {loading
                        ? "Please wait..."
                        : isForgot
                          ? "Reset Password"
                          : isLogin && !usePasswordLogin
                            ? loginOtpToken
                              ? "Verify & Login"
                              : "Send OTP to login"
                            : title}
                    </TfButtonIcon>
                  </button>
                </div>
                <p className="sarjan-auth-switch">
                  {isRegister ? (
                    <>
                      Already have an account? <Link href="/login">Login</Link>
                    </>
                  ) : isForgot ? (
                    <>
                      Remember your password?{" "}
                      <Link href="/login">Back to login</Link>
                    </>
                  ) : (
                    <>
                      Don&apos;t have an account?{" "}
                      <Link href="/register">Register</Link>
                    </>
                  )}
                </p>
              </form>
            </div>
            <div className="right right--auth-visual">
              <AuthSideVisual
                mode={isForgot ? "forgot" : isRegister ? "register" : "login"}
                banner={
                  isForgot
                    ? banners.forgot
                    : isRegister
                      ? banners.register
                      : banners.login
                }
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function AuthPageClient(props: {
  mode: AuthMode;
  banners: AuthBanners;
  initialLoginMethod?: "password" | "otp";
}) {
  return (
    <Suspense fallback={<AuthPageFallback mode={props.mode} />}>
      <AuthPageClientInner {...props} />
    </Suspense>
  );
}
