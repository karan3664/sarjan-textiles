"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isGstVerifiedOnFile,
  isValidGstin,
  normalizeGstin,
} from "@/lib/gstin-form";

type GstVerificationFieldsProps = {
  gst: string;
  onGstChange: (value: string) => void;
  companyName: string;
  onCompanyNameChange: (value: string) => void;
  ownerLegalName: string;
  onOwnerLegalNameChange: (value: string) => void;
  onVerifiedChange: (verified: boolean) => void;
  /** Hide trade/legal name inputs (parent renders them). */
  hideNameFields?: boolean;
  /** Saved GSTIN on the account — skip captcha until the user edits GSTIN. */
  savedGst?: string;
  /** Allow editing GSTIN while verified (my account). */
  allowGstEditWhenVerified?: boolean;
};

export function GstVerificationFields({
  gst,
  onGstChange,
  companyName,
  onCompanyNameChange,
  ownerLegalName,
  onOwnerLegalNameChange,
  onVerifiedChange,
  hideNameFields = false,
  savedGst = "",
  allowGstEditWhenVerified = false,
}: GstVerificationFieldsProps) {
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

  const normalizedGst = normalizeGstin(gst);
  const normalizedSavedGst = normalizeGstin(savedGst);
  const gstinReady = isValidGstin(normalizedGst);
  const gstUnchangedOnFile =
    gstinReady &&
    Boolean(normalizedSavedGst) &&
    normalizedGst === normalizedSavedGst;
  const verifiedOnFile =
    gstUnchangedOnFile &&
    isGstVerifiedOnFile({
      gst: normalizedGst,
      companyName,
      ownerLegalName,
    });

  useEffect(() => {
    onVerifiedChange(gstVerified);
  }, [gstVerified, onVerifiedChange]);

  useEffect(() => {
    if (!verifiedOnFile) return;
    setGstVerified(true);
    setGstManualAllowed(false);
    setGstMessage("GST verified on your account.");
    setCaptchaSessionId(null);
    setCaptchaB64(null);
    setCaptchaInput("");
    setCaptchaLoadError("");
  }, [verifiedOnFile]);

  const loadGstCaptcha = useCallback(async () => {
    if (!isValidGstin(normalizeGstin(gst))) return;
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
  }, [gst]);

  useEffect(() => {
    if (!gstinReady) {
      setCaptchaSessionId(null);
      setCaptchaB64(null);
      setCaptchaInput("");
      setCaptchaLoadError("");
      setGstVerified(false);
      setGstManualAllowed(false);
      return;
    }
    if (verifiedOnFile) return;
    void loadGstCaptcha();
  }, [gstinReady, loadGstCaptcha, verifiedOnFile]);

  const resetVerification = () => {
    setGstVerified(false);
    setGstManualAllowed(false);
    setGstMessage("");
  };

  const verifyGst = async () => {
    const normalized = normalizeGstin(gst);
    onGstChange(normalized);
    if (!isValidGstin(normalized)) {
      resetVerification();
      setGstMessage("Invalid GST number format");
      return;
    }
    const digits = captchaInput.replace(/\D/g, "").slice(0, 6);
    if (!captchaSessionId || digits.length !== 6) {
      resetVerification();
      setGstMessage(
        "Enter the 6-digit code from the GST captcha image (use Refresh if unclear).",
      );
      return;
    }
    setGstLoading(true);
    setGstMessage("");
    resetVerification();
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
      onCompanyNameChange(trade);
      onOwnerLegalNameChange(legal);
      onGstChange(data.gst.gstin);
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
        /no taxpayer|unavailable|blocked|try again|captcha|automated lookup|timed out|lookup failed|configure SARJAN_GST_LOOKUP|6-digit code|Captcha session expired|digits as shown|GST portal is busy|GST portal requires captcha|GST lookup timed out|did not match the captcha|could not return taxpayer details|did not return company name/i.test(
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
    <div className="sarjan-profile-gst-block">
      <fieldset>
        <input
          type="text"
          placeholder="GST number* (15 characters)"
          value={gst}
          readOnly={
            gstVerified && !gstManualAllowed && !allowGstEditWhenVerified
          }
          onChange={(event) => {
            const next = event.target.value.toUpperCase();
            onGstChange(next);
            if (
              normalizedSavedGst &&
              normalizeGstin(next) === normalizedSavedGst &&
              isGstVerifiedOnFile({
                gst: next,
                companyName,
                ownerLegalName,
              })
            ) {
              setGstVerified(true);
              setGstMessage("GST verified on your account.");
              return;
            }
            resetVerification();
            if (!allowGstEditWhenVerified) {
              onCompanyNameChange("");
              onOwnerLegalNameChange("");
            }
          }}
        />
      </fieldset>
      {!gst.trim() ? (
        <p className="sarjan-gst-captcha-hint mb_0">
          GST registration is required for all Sarjan wholesale accounts.
        </p>
      ) : null}
      {gstinReady && gstVerified && verifiedOnFile ? (
        <p className="text-success text-caption-1 mb_0 sarjan-gst-verified-on-file">
          GST is verified on your account. Change the GSTIN above only if you
          need to register a different number (portal captcha required).
        </p>
      ) : null}
      {gstinReady && !gstVerified ? (
        <>
          <p className="sarjan-gst-captcha-hint">
            Verify with the official{" "}
            <a
              href="https://services.gst.gov.in/services/searchtp"
              target="_blank"
              rel="noreferrer"
            >
              GST portal
            </a>{" "}
            captcha to refresh trade and legal names.
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
                className="tf-btn btn-fill sarjan-gst-captcha-refresh"
                onClick={() => void loadGstCaptcha()}
                disabled={captchaFetching || gstLoading || !gstinReady}
              >
                <span className="text text-button">
                  {captchaFetching ? "Loading…" : "Refresh image"}
                </span>
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
                  event.target.value.replace(/\D/g, "").slice(0, 6),
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
              className="tf-btn btn-fill"
              style={{ width: "100%" }}
              onClick={() => void verifyGst()}
              disabled={
                gstLoading ||
                captchaFetching ||
                !captchaSessionId ||
                captchaInput.replace(/\D/g, "").length !== 6
              }
            >
              <span className="text text-button">
                {gstLoading ? "Verifying…" : "Verify GST with portal"}
              </span>
            </button>
          </fieldset>
        </>
      ) : null}
      {!hideNameFields && gst.trim() ? (
        <>
          <fieldset className="mt_12">
            <input
              type="text"
              placeholder={
                gstManualAllowed
                  ? "Trade / business name*"
                  : "Trade / business name (from GST)*"
              }
              value={companyName}
              onChange={(event) => onCompanyNameChange(event.target.value)}
              readOnly={!gstManualAllowed && !gstVerified}
              required
            />
          </fieldset>
          <fieldset>
            <input
              type="text"
              placeholder={
                gstManualAllowed
                  ? "Legal name / proprietor full name*"
                  : "Legal name / proprietor (lgnm on GST)*"
              }
              value={ownerLegalName}
              onChange={(event) => onOwnerLegalNameChange(event.target.value)}
              readOnly={!gstManualAllowed && !gstVerified}
              required
            />
          </fieldset>
        </>
      ) : null}
      {gstMessage ? (
        <p
          className={
            gstVerified || gstManualAllowed ? "text-success" : "text-danger"
          }
        >
          {gstMessage}
        </p>
      ) : null}
    </div>
  );
}
