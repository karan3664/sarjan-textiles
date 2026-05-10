"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { AdminCustomSectionsEditor } from "@/components/admin/AdminCustomSectionsEditor";
import type { Product } from "@/data/mock";
import type { CmsPages } from "@/lib/cms-store";
import type { CmsCustomSection } from "@/types/cms-custom";

type AboutPage = CmsPages["about"] & {
  history?: string;
  mission?: string;
  vision?: string;
  infrastructure?: string;
  sections?: CmsCustomSection[];
};

export function AdminAboutClient({ initialPages, products }: { initialPages: CmsPages; products: Product[] }) {
  const [pages, setPages] = useState(initialPages);
  const [about, setAbout] = useState<AboutPage>(initialPages.about as AboutPage);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const update = (key: keyof AboutPage, value: string) => {
    setAbout((current) => ({ ...current, [key]: value }));
  };

  const uploadImage = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      if (!res.ok) throw new Error("Image upload failed");
      const data = (await res.json()) as { url: string };
      update("image", data.url);
      setMessage("About image uploaded.");
    } catch {
      setMessage("About image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const saveAbout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const nextPages = { ...pages, about };
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: nextPages }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as { pages: CmsPages };
      setPages(data.pages);
      setMessage("About page updated.");
    } catch {
      setMessage("About page save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-products-create form-type-2 sarjan-product-create" onSubmit={saveAbout}>
      <div className="flex flex-wrap justify-between gap14 items-center mb-30">
        <div className="body-text text-secondary">Manage website About Us content, main image, and company history sections.</div>
        <button type="submit" className="tf-button text-btn-uppercase" disabled={saving}>
          {saving ? "Saving..." : "Save About Page"}
        </button>
      </div>

      {message ? <div className="sarjan-admin-message mb-20">{message}</div> : null}

      <div className="wg-box p-40 sarjan-product-create-box">
        <div className="form-wrap">
          <div className="left">
            <div>
              <h6 className="mb-20">About Image</h6>
              <div className="upload-image sarjan-product-main-upload sarjan-about-main-upload">
                <div className="upload-img">
                  {about.image ? <img src={about.image} alt={about.title} /> : <div className="sarjan-product-upload-placeholder"><i className="icon-image" /><span>No image selected</span></div>}
                </div>
                <label className="uploadfile">
                  <input type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0] ?? null)} />
                  <div className="upload-btn text-button font-instrument fw-6">{uploading ? "Uploading..." : "Choose File"}</div>
                  <div className="text-caption-1 font-instrument text-secondary">Upload JPG, PNG, WEBP.</div>
                </label>
              </div>
            </div>
          </div>

          <div className="right">
            <div className="d-flex flex-column gap20">
              <div>
                <h6 className="mb-4">About Content</h6>
                <p className="text-secondary">Shown on frontend About Us page.</p>
              </div>
              <fieldset>
                <div className="text-button font-instrument fw-6 mb-8">Page Title<span className="text-primary">*</span></div>
                <input type="text" value={about.title} onChange={(event) => update("title", event.target.value)} required />
              </fieldset>
              <fieldset>
                <div className="text-title mb-8">Introduction<span className="text-primary">*</span></div>
                <textarea value={about.body} onChange={(event) => update("body", event.target.value)} required />
              </fieldset>
              <fieldset>
                <div className="text-title mb-8">Company History</div>
                <textarea value={about.history ?? ""} onChange={(event) => update("history", event.target.value)} />
              </fieldset>
              <fieldset>
                <div className="text-title mb-8">Mission</div>
                <textarea value={about.mission ?? ""} onChange={(event) => update("mission", event.target.value)} />
              </fieldset>
              <fieldset>
                <div className="text-title mb-8">Vision</div>
                <textarea value={about.vision ?? ""} onChange={(event) => update("vision", event.target.value)} />
              </fieldset>
              <fieldset>
                <div className="text-title mb-8">Infrastructure</div>
                <textarea value={about.infrastructure ?? ""} onChange={(event) => update("infrastructure", event.target.value)} />
              </fieldset>
            </div>
          </div>
        </div>
      </div>

      <AdminCustomSectionsEditor
        title="About Page Custom Sections"
        description="Client can add any About section: image, banner, text, button, or product block."
        sections={about.sections ?? []}
        onChange={(sections) => setAbout((current) => ({ ...current, sections }))}
        products={products}
      />
    </form>
  );
}
