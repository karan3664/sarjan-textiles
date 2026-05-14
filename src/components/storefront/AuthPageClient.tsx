"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type AuthMode = "login" | "register" | "forgot";

function isErrorMessage(value: string) {
  return /failed|invalid|required|incorrect|verify|unavailable|match/i.test(value);
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
    <div className="page-title" style={{ backgroundImage: "url(/template/storefront/images/section/page-title.jpg)" }}>
      <div className="container">
        <h3 className="heading text-center">{title}</h3>
        <ul className="breadcrumbs d-flex align-items-center justify-content-center">
          <li><Link className="link" href="/">Homepage</Link></li>
          <li><i className="icon-arrRight" /></li>
          <li><Link className="link" href="#">Pages</Link></li>
          <li><i className="icon-arrRight" /></li>
          <li>{title}</li>
        </ul>
      </div>
    </div>
  );
}

export function AuthPageClient({ mode }: { mode: AuthMode }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGst, setHasGst] = useState(true);
  const [gst, setGst] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstMessage, setGstMessage] = useState("");
  const [gstVerified, setGstVerified] = useState(false);
  const [gstManualAllowed, setGstManualAllowed] = useState(false);
  const [gstLoading, setGstLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpToken, setEmailOtpToken] = useState("");
  const [emailOtpMessage, setEmailOtpMessage] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const title = isRegister ? "Register" : isForgot ? "Forget Password" : "Login";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (isRegister && payload.password !== payload.confirmPassword) {
      setLoading(false);
      setMessage("Passwords do not match");
      return;
    }
    if (isRegister && !emailVerified) {
      setLoading(false);
      setMessage("Email OTP verification required");
      return;
    }
    if (isRegister && hasGst && !isValidGstin(String(payload.gst ?? ""))) {
      setLoading(false);
      setMessage("Enter valid GST number or choose without GST registration");
      return;
    }
    if (isRegister && hasGst && !gstVerified && !String(payload.companyName ?? "").trim()) {
      setLoading(false);
      setMessage("Verify GST or enter company name manually if GST portal is unavailable");
      return;
    }
    const endpoint = isRegister ? "/api/auth/register" : isForgot ? "/api/auth/forgot" : "/api/auth/login";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error ?? "Request failed");
      return;
    }

    if (data.token) {
      localStorage.setItem("sarjan-client-token", data.token);
      localStorage.setItem("sarjan-client", JSON.stringify(data.client));
      window.dispatchEvent(new CustomEvent("sarjan-auth-updated"));
      window.location.assign("/profile");
      return;
    }

    setMessage(isForgot ? data.message ?? "Password reset email sent." : "Password reset request saved. Admin will contact client.");
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
      setEmailOtpMessage(error instanceof Error ? error.message : "OTP send failed");
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
      setEmailOtpMessage(error instanceof Error ? error.message : "OTP verification failed");
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
    setGstLoading(true);
    setGstMessage("");
    setGstVerified(false);
    setGstManualAllowed(false);
    try {
      const res = await fetch("/api/gst/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gst: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "GST verification failed");
      setCompanyName(data.gst.legalName);
      setGst(data.gst.gstin);
      setGstVerified(true);
      setGstMessage(`Verified: ${data.gst.legalName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "GST verification failed";
      if (/unavailable|blocked|try again|portal/i.test(message)) {
        setGstManualAllowed(true);
        setGstMessage("GST portal is not responding. Enter company name manually; admin will verify GST during approval.");
      } else {
        setGstManualAllowed(false);
        setGstMessage(message);
      }
    } finally {
      setGstLoading(false);
    }
  };

  return (
    <>
      <PageTitle title={title} />
      <section className="flat-spacing">
        <div className="container">
          <div className="login-wrap">
            <div className="left">
              <div className="heading"><h4>{title}</h4></div>
              <form action="#" className="form-login form-has-password" onSubmit={submit}>
                <div className="wrap">
                  {isRegister ? (
                    <>
                      <div className="sarjan-gst-toggle">
                        <label className="tf-cart-checkbox">
                          <input type="checkbox" className="tf-check" checked={hasGst} onChange={(event) => {
                            setHasGst(event.target.checked);
                            setGstVerified(false);
                            setGstManualAllowed(false);
                            setGstMessage("");
                            if (event.target.checked) setCompanyName("");
                          }} />
                          <span>Company has GST number</span>
                        </label>
                        <p className="text-caption-1 text-secondary">If no GST, uncheck and register with company name manually.</p>
                      </div>
                      <input type="hidden" name="hasGst" value={hasGst ? "true" : "false"} />
                      {hasGst ? (
                        <>
                          <fieldset className="sarjan-gst-row">
                            <input
                              type="text"
                              placeholder="GST number*"
                              name="gst"
                              value={gst}
                              onChange={(event) => {
                                setGst(event.target.value.toUpperCase());
                                setGstVerified(false);
                                setGstManualAllowed(false);
                                setCompanyName("");
                              }}
                              required
                            />
                            <button type="button" className="tf-btn btn-fill" onClick={verifyGst} disabled={gstLoading || !gst.trim()}>
                              <span className="text text-button">{gstLoading ? "Verifying..." : "Verify GST"}</span>
                            </button>
                          </fieldset>
                          <fieldset>
                            <input
                              type="text"
                              placeholder={gstManualAllowed ? "Company name*" : "Company name from GST portal*"}
                              name="companyName"
                              value={companyName}
                              onChange={(event) => setCompanyName(event.target.value)}
                              readOnly={!gstManualAllowed && !gstVerified}
                              required
                            />
                          </fieldset>
                          {gstMessage ? <p className={gstVerified || gstManualAllowed ? "text-success" : "text-danger"}>{gstMessage}</p> : null}
                        </>
                      ) : (
                        <fieldset><input type="text" placeholder="Company name*" name="companyName" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required /></fieldset>
                      )}
                      <fieldset><input type="text" placeholder="City / buying category" name="city" /></fieldset>
                    </>
                  ) : null}
                  <fieldset>
                    <input
                      type="email"
                      placeholder="Username or email address*"
                      name="email"
                      value={email}
                      onChange={(event) => resetEmailOtp(event.target.value)}
                      required
                    />
                  </fieldset>
                  {isRegister ? (
                    <>
                      <fieldset className="sarjan-gst-row sarjan-otp-row">
                        <input
                          type="text"
                          placeholder="Email OTP*"
                          name="emailOtp"
                          value={emailOtp}
                          onChange={(event) => {
                            setEmailOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                            setEmailVerified(false);
                          }}
                          required
                        />
                        <button type="button" className="tf-btn btn-fill" onClick={sendEmailOtp} disabled={emailOtpLoading || !email.trim()}>
                          <span className="text text-button">{emailOtpLoading && !emailOtpSent ? "Sending..." : emailOtpSent ? "Resend OTP" : "Send OTP"}</span>
                        </button>
                        <button type="button" className="tf-btn btn-white has-border" onClick={verifyEmailOtp} disabled={emailOtpLoading || !emailOtpToken || emailOtp.length !== 6 || emailVerified}>
                          <span className="text text-button">{emailVerified ? "Verified" : "Verify OTP"}</span>
                        </button>
                      </fieldset>
                      <input type="hidden" name="emailOtpToken" value={emailOtpToken} />
                      {emailOtpMessage ? <p className={emailVerified || /sent/i.test(emailOtpMessage) ? "text-success" : "text-danger"}>{emailOtpMessage}</p> : null}
                    </>
                  ) : null}
                  {!isForgot ? (
                    <fieldset className="position-relative password-item">
                      <input className="input-password" type="password" placeholder="Password*" name="password" required />
                      <span className="toggle-password unshow"><i className="icon-eye-hide-line" /></span>
                    </fieldset>
                  ) : null}
                  {isRegister ? (
                    <fieldset className="position-relative password-item">
                      <input className="input-password" type="password" placeholder="Confirm Password*" name="confirmPassword" required />
                      <span className="toggle-password unshow"><i className="icon-eye-hide-line" /></span>
                    </fieldset>
                  ) : null}
                  {!isRegister && !isForgot ? (
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="tf-cart-checkbox">
                        <div className="tf-checkbox-wrapp"><input defaultChecked type="checkbox" id="login-form_agree" name="agree_checkbox" /><div><i className="icon-check" /></div></div>
                        <label htmlFor="login-form_agree">Remember me</label>
                      </div>
                      <a href="/forgot-password" className="font-2 text-button forget-password link">Forgot Your Password?</a>
                    </div>
                  ) : null}
                  {isRegister ? (
                    <div className="d-flex align-items-center">
                      <div className="tf-cart-checkbox">
                        <div className="tf-checkbox-wrapp"><input defaultChecked type="checkbox" id="register-form_agree" name="agree_checkbox" /><div><i className="icon-check" /></div></div>
                        <label className="text-secondary-2" htmlFor="register-form_agree">I agree to the&nbsp;</label>
                      </div>
                      <a href="#" title="Terms of Service"> Terms of User</a>
                    </div>
                  ) : null}
                </div>
                {message ? <p className={isErrorMessage(message) ? "text-danger" : "text-success"}>{message}</p> : null}
                <div className="button-submit">
                  <button className="tf-btn btn-fill" type="submit" disabled={loading}><span className="text text-button">{loading ? "Please wait..." : isForgot ? "Reset Password" : title}</span></button>
                </div>
              </form>
            </div>
            <div className="right">
              <h4 className="mb_8">{isRegister ? "Already have an account?" : "New Customer"}</h4>
              <p className="text-secondary">{isRegister ? "Welcome back. Sign in to access your personalized experience, saved preferences, and more." : "Register your company to access wholesale catalog, set-wise B2B ordering, and order history."}</p>
              <a href={isRegister ? "/login" : "/register"} className="tf-btn btn-fill"><span className="text text-button">{isRegister ? "Login" : "Register"}</span></a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
