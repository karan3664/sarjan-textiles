"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type AuthMode = "login" | "register" | "forgot";

function isErrorMessage(value: string) {
  return /failed|invalid|required|incorrect|verify|unavailable|match/i.test(value);
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
  const [gstLoading, setGstLoading] = useState(false);
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
    if (isRegister && hasGst && !gstVerified) {
      setLoading(false);
      setMessage("Please verify GST number first or choose without GST registration");
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

    setMessage("Password reset request saved. Admin will contact client.");
  };

  const verifyGst = async () => {
    setGstLoading(true);
    setGstMessage("");
    setGstVerified(false);
    try {
      const res = await fetch("/api/gst/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gst }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "GST verification failed");
      setCompanyName(data.gst.legalName);
      setGst(data.gst.gstin);
      setGstVerified(true);
      setGstMessage(`Verified: ${data.gst.legalName}`);
    } catch (error) {
      setGstMessage(error instanceof Error ? error.message : "GST verification failed");
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
                                setCompanyName("");
                              }}
                              required
                            />
                            <button type="button" className="tf-btn btn-fill" onClick={verifyGst} disabled={gstLoading || !gst.trim()}>
                              <span className="text text-button">{gstLoading ? "Verifying..." : "Verify GST"}</span>
                            </button>
                          </fieldset>
                          <fieldset><input type="text" placeholder="Company name from GST portal*" name="companyName" value={companyName} readOnly required /></fieldset>
                          {gstMessage ? <p className={gstVerified ? "text-success" : "text-danger"}>{gstMessage}</p> : null}
                        </>
                      ) : (
                        <fieldset><input type="text" placeholder="Company name*" name="companyName" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required /></fieldset>
                      )}
                      <fieldset><input type="text" placeholder="City / buying category" name="city" /></fieldset>
                    </>
                  ) : null}
                  <fieldset><input type="email" placeholder="Username or email address*" name="email" required /></fieldset>
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
              <p className="text-secondary">{isRegister ? "Welcome back. Sign in to access your personalized experience, saved preferences, and more." : "Register your company to access wholesale catalog, set-wise B2B ordering, order history, and cheque credit workflow."}</p>
              <a href={isRegister ? "/login" : "/register"} className="tf-btn btn-fill"><span className="text text-button">{isRegister ? "Login" : "Register"}</span></a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
