"use client";

import { useMemo, useState } from "react";
import type { CmsSeoPage } from "@/lib/cms-store";

type SaveState = "idle" | "saving" | "saved" | "error";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/['’]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function cleanPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "/";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

const emptySeoPage: CmsSeoPage = {
  id: "custom-page",
  label: "Custom Page",
  path: "/custom-page",
  metaTitle: "",
  metaDescription: "",
  keywords: "",
  image: "/sarjan-assets/banner-textiles-studio.webp",
  imageAlt: "",
  noIndex: false,
};

export function AdminSeoClient({ initialSeoPages }: { initialSeoPages: CmsSeoPage[] }) {
  const [seoPages, setSeoPages] = useState(initialSeoPages);
  const [selectedId, setSelectedId] = useState(initialSeoPages[0]?.id ?? emptySeoPage.id);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const selected = useMemo(() => seoPages.find((page) => page.id === selectedId) ?? seoPages[0] ?? emptySeoPage, [seoPages, selectedId]);

  const updateSelected = (patch: Partial<CmsSeoPage>) => {
    setSaveState("idle");
    setSeoPages((current) => current.map((page) => page.id === selected.id ? { ...page, ...patch } : page));
  };

  const addPage = () => {
    const id = `custom-${Date.now().toString(36)}`;
    const next = { ...emptySeoPage, id, label: "New SEO Page", path: "/new-page" };
    setSeoPages((current) => [next, ...current]);
    setSelectedId(id);
    setSaveState("idle");
  };

  const removePage = () => {
    if (!selected.id.startsWith("custom-")) return;
    const next = seoPages.filter((page) => page.id !== selected.id);
    setSeoPages(next);
    setSelectedId(next[0]?.id ?? "");
    setSaveState("idle");
  };

  const saveSeo = async () => {
    setSaveState("saving");
    try {
      const normalized = seoPages.map((page) => ({
        ...page,
        id: page.id || slugify(page.label || page.path),
        path: cleanPath(page.path),
        metaTitle: page.metaTitle.trim(),
        metaDescription: page.metaDescription.trim(),
        keywords: page.keywords.trim(),
        image: page.image.trim(),
        imageAlt: page.imageAlt.trim(),
      }));
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seoPages: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSeoPages(data.seoPages);
      setSelectedId(selected.id);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div className="wg-box sarjan-seo-manager">
      <div className="flex flex-wrap justify-between gap14 items-center mb-24">
        <div>
          <h5>Page Wise SEO</h5>
          <p className="text-secondary">Client can edit title, tags, URL/canonical, social image, and image alt text from backend.</p>
        </div>
        <div className="flex gap10">
          <button type="button" className="tf-button" onClick={addPage}>Add SEO Page</button>
          <button type="button" className="tf-button style-1" onClick={saveSeo}>{saveState === "saving" ? "Saving..." : "Save SEO"}</button>
        </div>
      </div>

      <div className="sarjan-seo-layout">
        <div className="sarjan-seo-nav">
          {seoPages.map((page) => (
            <button type="button" className={page.id === selected.id ? "active" : ""} key={page.id} onClick={() => setSelectedId(page.id)}>
              <span>{page.label}</span>
              <small>{page.path}</small>
            </button>
          ))}
        </div>

        <div className="sarjan-seo-form">
          <div className="cols gap22">
            <fieldset>
              <div className="body-title mb-10">Page Name</div>
              <input value={selected.label} onChange={(event) => updateSelected({ label: event.target.value })} />
            </fieldset>
            <fieldset>
              <div className="body-title mb-10">Page URL / Canonical URL</div>
              <input value={selected.path} onChange={(event) => updateSelected({ path: event.target.value })} placeholder="/products or https://sarjantextiles.com/custom-page" />
            </fieldset>
            <fieldset>
              <div className="body-title mb-10">Meta Title</div>
              <input value={selected.metaTitle} onChange={(event) => updateSelected({ metaTitle: event.target.value })} maxLength={70} placeholder="Google page title" />
            </fieldset>
            <fieldset>
              <div className="body-title mb-10">Meta Tags / Keywords</div>
              <input value={selected.keywords} onChange={(event) => updateSelected({ keywords: event.target.value })} placeholder="printed shirts, B2B textiles, wholesale catalog" />
            </fieldset>
            <fieldset>
              <div className="body-title mb-10">Open Graph / SEO Image URL</div>
              <input value={selected.image} onChange={(event) => updateSelected({ image: event.target.value })} placeholder="/uploads/cms/banner.webp" />
            </fieldset>
            <fieldset>
              <div className="body-title mb-10">Image Alt Text</div>
              <input value={selected.imageAlt} onChange={(event) => updateSelected({ imageAlt: event.target.value })} placeholder="Sarjan Textiles textile catalog banner" />
            </fieldset>
          </div>

          <fieldset>
            <div className="body-title mb-10">Meta Description</div>
            <textarea rows={4} value={selected.metaDescription} onChange={(event) => updateSelected({ metaDescription: event.target.value })} maxLength={170} placeholder="Search result description" />
          </fieldset>

          <label className="tf-cart-checkbox sarjan-seo-index-toggle">
            <input type="checkbox" className="tf-check" checked={!selected.noIndex} onChange={(event) => updateSelected({ noIndex: !event.target.checked })} />
            <span>Allow Google indexing</span>
          </label>

          <div className="sarjan-seo-preview">
            <div className="body-title">Google Preview</div>
            <h6>{selected.metaTitle || selected.label}</h6>
            <p className="text-success">{cleanPath(selected.path)}</p>
            <p className="text-secondary">{selected.metaDescription || "Meta description will appear here."}</p>
          </div>

          {selected.id.startsWith("custom-") ? (
            <button type="button" className="tf-button style-3 mt-20" onClick={removePage}>Remove Custom SEO Page</button>
          ) : null}
          <div className={`body-text mt-20 ${saveState === "error" ? "text-danger" : saveState === "saved" ? "text-success" : ""}`}>
            {saveState === "saved" ? "Saved. Frontend SEO now reads backend CMS data." : saveState === "error" ? "Save failed." : "Ready."}
          </div>
        </div>
      </div>
    </div>
  );
}
