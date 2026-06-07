"use client";

import type { CmsHomeBanner } from "@/lib/home-banners";
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

export function AdminHomeBannerSlides({
  banners,
  uploadState,
  onUpload,
  onReplace,
  onUpdate,
  onMove,
  onRemove,
  onAdd,
}: {
  banners: CmsHomeBanner[];
  uploadState: UploadState;
  onUpload: (files: File[]) => void;
  onReplace: (index: number, file: File) => void;
  onUpdate: (index: number, patch: Partial<CmsHomeBanner>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  const bulkState = uploadState.hero;

  return (
    <div className="sarjan-banner-slides">
      <div className="sarjan-home-upload-row mb-16">
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
        <div className="text-caption-1 text-secondary">
          JPG, JPEG, PNG, WEBP — each slide has its own image and text (web +
          app).
        </div>
      </div>
      {bulkState && bulkState !== "uploading" && (
        <div className="text-tiny text-danger mb-12">{bulkState}</div>
      )}

      <div className="cols gap20">
        {banners.map((banner, index) => {
          const replaceKey = `banner-${index}`;
          const replaceState = uploadState[replaceKey];
          return (
            <article
              key={banner.id}
              className="sarjan-banner-slide-card"
              aria-label={`Banner slide ${index + 1}`}
            >
              <div className="sarjan-banner-slide-head">
                <div>
                  <div className="body-title mb-4">Banner {index + 1}</div>
                  <div className="text-caption-1 text-secondary">
                    Shown on web hero rotator and mobile home banner.
                  </div>
                </div>
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
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-16 items-start">
                <div>
                  <div className="sarjan-home-preview sarjan-banner-slide-preview mb-10">
                    {banner.image ? (
                      <img src={banner.image} alt="" />
                    ) : (
                      <div className="body-text text-secondary">No image</div>
                    )}
                  </div>
                  <label className="tf-button style-1 mb-0 w-full text-center">
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

                <div className="cols gap16">
                  <label className="body-text mb-0">
                    <span className="body-title d-block mb-8">Eyebrow</span>
                    <AdminHtmlEditor
                      value={banner.eyebrow ?? ""}
                      onChange={(value) => onUpdate(index, { eyebrow: value })}
                      rows={2}
                    />
                  </label>
                  <label className="body-text mb-0">
                    <span className="body-title d-block mb-8">Title</span>
                    <AdminHtmlEditor
                      value={banner.title ?? ""}
                      onChange={(value) => onUpdate(index, { title: value })}
                      rows={4}
                    />
                  </label>
                  <label className="body-text mb-0">
                    <span className="body-title d-block mb-8">Description</span>
                    <AdminHtmlEditor
                      value={banner.description ?? ""}
                      onChange={(value) =>
                        onUpdate(index, { description: value })
                      }
                      rows={3}
                    />
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <label className="body-text mb-0">
                      <span className="body-title d-block mb-8">
                        Button label
                      </span>
                      <AdminHtmlEditor
                        value={banner.ctaLabel ?? ""}
                        onChange={(value) =>
                          onUpdate(index, { ctaLabel: value })
                        }
                        rows={2}
                      />
                    </label>
                    <label className="body-text mb-0">
                      <span className="body-title d-block mb-8">
                        Button link
                      </span>
                      <TextInput
                        value={banner.ctaHref ?? ""}
                        placeholder="/products or #catalog"
                        onChange={(value) =>
                          onUpdate(index, {
                            ctaHref: value,
                            actionType: "url",
                            actionValue: value,
                          })
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
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
