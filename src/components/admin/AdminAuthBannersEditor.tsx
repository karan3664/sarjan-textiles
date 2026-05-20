"use client";

import { useState } from "react";
import type { AuthBannerAsset, AuthBannerSlot } from "@/lib/auth-banner-types";
import type { CmsSnapshot } from "@/lib/cms-store";

const SLOTS: { key: AuthBannerSlot; label: string }[] = [
  { key: "login", label: "Login banner" },
  { key: "register", label: "Register banner" },
  { key: "forgot", label: "Forgot password banner" },
];

export function AdminAuthBannersEditor({
  cms,
  onChange,
  onSave,
  saveState,
}: {
  cms: CmsSnapshot;
  onChange: (next: CmsSnapshot) => void;
  onSave: () => void;
  saveState: "idle" | "saving" | "saved" | "error";
}) {
  const [uploading, setUploading] = useState<AuthBannerSlot | null>(null);
  const [uploadError, setUploadError] = useState("");

  const setBanner = (slot: AuthBannerSlot, banner: AuthBannerAsset) => {
    onChange({
      ...cms,
      siteSettings: {
        ...cms.siteSettings,
        authBanners: {
          ...cms.siteSettings.authBanners,
          [slot]: banner,
        },
      },
    });
  };

  const updateBannerAlt = (slot: AuthBannerSlot, alt: string) => {
    setBanner(slot, { ...cms.siteSettings.authBanners[slot], alt });
  };

  const uploadBanner = async (slot: AuthBannerSlot, file: File | null) => {
    if (!file) return;
    setUploading(slot);
    setUploadError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("preset", "auth-banner");
      body.append("alt", cms.siteSettings.authBanners[slot].alt);
      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as {
        banner?: AuthBannerAsset;
        error?: string;
      };
      if (!res.ok || !data.banner) {
        throw new Error(data.error ?? "Upload failed");
      }
      setBanner(slot, data.banner);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Banner upload failed",
      );
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="wg-box mb-30" id="auth-banners">
      <div className="flex items-center justify-between mb-24">
        <div>
          <h5>Login / Register / Forgot Banners</h5>
          <p className="body-text text-secondary mt-8 mb-0">
            Upload once — we store WebP, AVIF, and a blur placeholder. Changes
            apply without redeploy.
          </p>
        </div>
        <button type="button" className="tf-button style-1" onClick={onSave}>
          Save Banners
        </button>
      </div>

      <div className="cols gap22">
        {SLOTS.map(({ key, label }) => {
          const banner = cms.siteSettings.authBanners[key];
          return (
            <fieldset key={key} className="sarjan-auth-banner-admin-field">
              <div className="body-title mb-10">{label}</div>
              <div className="upload-image sarjan-product-main-upload sarjan-about-main-upload">
                <div className="upload-img">
                  {banner.webp ? (
                    <picture>
                      <source srcSet={banner.avif} type="image/avif" />
                      <img src={banner.webp} alt={banner.alt} />
                    </picture>
                  ) : (
                    <div className="sarjan-product-upload-placeholder">
                      <i className="icon-image" />
                      <span>No banner</span>
                    </div>
                  )}
                </div>
                <label className="uploadfile">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      uploadBanner(key, event.target.files?.[0] ?? null)
                    }
                  />
                  <div className="upload-btn text-button font-instrument fw-6">
                    {uploading === key
                      ? "Processing AVIF + WebP…"
                      : "Upload image"}
                  </div>
                  <div className="text-caption-1 font-instrument text-secondary">
                    JPG, PNG, WEBP, HEIC. Max 30MB.
                  </div>
                </label>
              </div>
              <div className="body-title mb-10 mt-16">Alt text</div>
              <input
                value={banner.alt}
                onChange={(event) => updateBannerAlt(key, event.target.value)}
              />
            </fieldset>
          );
        })}
      </div>

      <div
        className={`body-text mt-20 ${saveState === "error" || uploadError ? "text-danger" : ""}`}
      >
        {uploadError
          ? uploadError
          : saveState === "saving"
            ? "Saving..."
            : saveState === "saved"
              ? "Saved. Auth pages now use updated banners."
              : saveState === "error"
                ? "Save failed."
                : "Ready."}
      </div>
    </div>
  );
}
