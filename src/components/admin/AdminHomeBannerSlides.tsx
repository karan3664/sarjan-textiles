"use client";

import { useEffect, useState } from "react";
import type { CmsHomeBanner } from "@/lib/home-banners";
import { resolveCmsMediaUrl } from "@/lib/cms-media-url";
import { AdminHtmlEditor } from "@/components/admin/AdminHtmlEditor";

type UploadState = Record<string, "uploading" | string | undefined>;

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="form-control"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function stripPreview(html?: string) {
  const text = (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "No text yet";
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

export function AdminHomeBannerSlides({
  banners,
  uploadState,
  onUpload,
  onReplace,
  onUpdate,
  onMove,
  onRemove,
  onAdd,
  bulkUploadKey = "hero",
  replaceKeyPrefix = "banner",
}: {
  banners: CmsHomeBanner[];
  uploadState: UploadState;
  bulkUploadKey?: string;
  replaceKeyPrefix?: string;
  onUpload: (files: File[]) => void;
  onReplace: (index: number, file: File) => void;
  onUpdate: (index: number, patch: Partial<CmsHomeBanner>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  const bulkState = uploadState[bulkUploadKey];
  const [openSlideId, setOpenSlideId] = useState<string | null>(
    banners[0]?.id ?? null,
  );

  useEffect(() => {
    if (openSlideId && banners.some((banner) => banner.id === openSlideId)) {
      return;
    }
    setOpenSlideId(banners[0]?.id ?? null);
  }, [banners, openSlideId]);

  return (
    <div className="sarjan-banner-slides">
      <div className="sarjan-banner-slides-intro">
        <label className="tf-button style-1 mb-0">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            multiple
            onChange={(event) => {
              onUpload(Array.from(event.target.files ?? []));
              event.currentTarget.value = "";
            }}
          />
          {bulkState === "uploading" ? "Uploading..." : "Add banner images"}
        </label>
        <p className="text-caption-1 text-secondary mb-0">
          Har slide alag image + text. Ek time par ek slide kholo — page clean
          rahega.
        </p>
      </div>
      {bulkState && bulkState !== "uploading" && (
        <div className="text-tiny text-danger mb-12">{bulkState}</div>
      )}

      <div className="sarjan-banner-slide-list">
        {banners.map((banner, index) => {
          const replaceKey = `${replaceKeyPrefix}-${index}`;
          const replaceState = uploadState[replaceKey];
          const isOpen = openSlideId === banner.id;

          return (
            <article
              key={banner.id}
              className={`sarjan-banner-slide-card${isOpen ? " is-open" : ""}`}
              aria-label={`Banner slide ${index + 1}`}
            >
              <button
                type="button"
                className="sarjan-banner-slide-summary"
                onClick={() =>
                  setOpenSlideId((current) =>
                    current === banner.id ? null : banner.id,
                  )
                }
              >
                <div className="sarjan-banner-slide-summary-thumb">
                  {banner.image ? (
                    <img src={resolveCmsMediaUrl(banner.image)} alt="" />
                  ) : (
                    <span>No img</span>
                  )}
                </div>
                <div className="sarjan-banner-slide-summary-copy">
                  <strong>Banner {index + 1}</strong>
                  <span>{stripPreview(banner.title || banner.eyebrow)}</span>
                </div>
                <span className="sarjan-banner-slide-chevron">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen ? (
                <div className="sarjan-banner-slide-body">
                  <div className="sarjan-banner-slide-actions">
                    <button
                      type="button"
                      className="tf-button"
                      disabled={index === 0}
                      onClick={() => onMove(index, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="tf-button"
                      disabled={index === banners.length - 1}
                      onClick={() => onMove(index, 1)}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className="tf-button style-3"
                      onClick={() => onRemove(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="sarjan-banner-slide-layout">
                    <div className="sarjan-banner-slide-media">
                      <div className="sarjan-home-preview sarjan-banner-slide-preview">
                        {banner.image ? (
                          <img src={resolveCmsMediaUrl(banner.image)} alt="" />
                        ) : (
                          <div className="body-text text-secondary">
                            No image
                          </div>
                        )}
                      </div>
                      <label className="tf-button style-1 mb-0 w-full text-center sarjan-banner-file-label">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              onReplace(index, file);
                            }
                            event.currentTarget.value = "";
                          }}
                        />
                        {replaceState === "uploading"
                          ? "Uploading..."
                          : "Replace image"}
                      </label>
                      {replaceState && replaceState !== "uploading" && (
                        <div className="text-tiny text-danger mt-8">
                          {replaceState}
                        </div>
                      )}
                    </div>

                    <div className="sarjan-banner-slide-fields">
                      <div className="sarjan-banner-field">
                        <span className="sarjan-banner-field-label">
                          Eyebrow
                        </span>
                        <AdminHtmlEditor
                          compact
                          value={banner.eyebrow ?? ""}
                          onChange={(value) =>
                            onUpdate(index, { eyebrow: value })
                          }
                          rows={2}
                          placeholder="Small line above title"
                        />
                      </div>
                      <div className="sarjan-banner-field">
                        <span className="sarjan-banner-field-label">Title</span>
                        <AdminHtmlEditor
                          compact
                          value={banner.title ?? ""}
                          onChange={(value) =>
                            onUpdate(index, { title: value })
                          }
                          rows={3}
                          placeholder="Main headline"
                        />
                      </div>
                      <div className="sarjan-banner-field">
                        <span className="sarjan-banner-field-label">
                          Description
                        </span>
                        <AdminHtmlEditor
                          compact
                          value={banner.description ?? ""}
                          onChange={(value) =>
                            onUpdate(index, { description: value })
                          }
                          rows={2}
                          placeholder="Optional subtext"
                        />
                      </div>
                      <div className="sarjan-banner-field-grid">
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            Button label
                          </span>
                          <AdminHtmlEditor
                            compact
                            value={banner.ctaLabel ?? ""}
                            onChange={(value) =>
                              onUpdate(index, { ctaLabel: value })
                            }
                            rows={2}
                            placeholder="Shop now"
                          />
                        </div>
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            Button link
                          </span>
                          <TextInput
                            value={banner.ctaHref ?? ""}
                            placeholder="/products"
                            onChange={(value) =>
                              onUpdate(index, {
                                ctaHref: value,
                                actionType: "url",
                                actionValue: value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <button type="button" className="tf-button style-1 mt-16" onClick={onAdd}>
        Add empty banner slide
      </button>
    </div>
  );
}
