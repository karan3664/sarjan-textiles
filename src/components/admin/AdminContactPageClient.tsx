"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { AdminCustomSectionsEditor } from "@/components/admin/AdminCustomSectionsEditor";
import type { Product } from "@/data/mock";
import type { CmsPages } from "@/lib/cms-store";
import type { CmsCustomSection } from "@/types/cms-custom";

type ContactPage = CmsPages["contact"] & {
  sections?: CmsCustomSection[];
};

export function AdminContactPageClient({ initialPages, products }: { initialPages: CmsPages; products: Product[] }) {
  const [pages, setPages] = useState(initialPages);
  const [contact, setContact] = useState<ContactPage>(initialPages.contact as ContactPage);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const update = (key: keyof ContactPage, value: string) => {
    setContact((current) => ({ ...current, [key]: value }));
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
      setMessage("Contact image uploaded.");
    } catch {
      setMessage("Contact image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const saveContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const nextPages = { ...pages, contact };
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: nextPages }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as { pages: CmsPages };
      setPages(data.pages);
      setMessage("Contact page updated.");
    } catch {
      setMessage("Contact page save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-products-create form-type-2 sarjan-product-create" onSubmit={saveContact}>
      <div className="flex flex-wrap justify-between gap14 items-center mb-30">
        <div className="body-text text-secondary">Manage frontend Contact Us content and custom sections.</div>
        <div className="d-flex gap10 flex-wrap">
          <a href="/contact" target="_blank" className="tf-button">Preview Frontend</a>
          <button type="submit" className="tf-button text-btn-uppercase" disabled={saving}>
            {saving ? "Saving..." : "Save Contact Page"}
          </button>
        </div>
      </div>

      {message ? <div className="sarjan-admin-message mb-20">{message}</div> : null}

      <div className="wg-box p-40 sarjan-product-create-box">
        <div className="form-wrap">
          <div className="left">
            <div>
              <h6 className="mb-20">Contact Image / Banner</h6>
              <div className="upload-image sarjan-product-main-upload sarjan-about-main-upload">
                <div className="upload-img">
                  {contact.image ? <img src={contact.image} alt={contact.title} /> : <div className="sarjan-product-upload-placeholder"><i className="icon-image" /><span>No image selected</span></div>}
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
                <h6 className="mb-4">Contact Page Content</h6>
                <p className="text-secondary">Business information comes from backend site settings. This controls page copy.</p>
              </div>
              <fieldset>
                <div className="text-button font-instrument fw-6 mb-8">Page Title<span className="text-primary">*</span></div>
                <input type="text" value={contact.title} onChange={(event) => update("title", event.target.value)} required />
              </fieldset>
              <fieldset>
                <div className="text-title mb-8">Page Description<span className="text-primary">*</span></div>
                <textarea value={contact.body} onChange={(event) => update("body", event.target.value)} required />
              </fieldset>
            </div>
          </div>
        </div>
      </div>

      <AdminCustomSectionsEditor
        title="Contact Page Custom Sections"
        description="Add maps replacement banners, office photos, CTA buttons, text, or product cards."
        sections={contact.sections ?? []}
        onChange={(sections) => setContact((current) => ({ ...current, sections }))}
        products={products}
      />
    </form>
  );
}
