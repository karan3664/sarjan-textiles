"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  resolveCustomSitePage,
  type PublicCustomSitePage,
} from "@/lib/pages-localize";
import type { CustomSitePage } from "@/lib/cms-store";
import type { CmsCustomSection } from "@/types/cms-custom";
import { AdminCustomSectionsEditor } from "@/components/admin/AdminCustomSectionsEditor";
import { AdminCmsImageDisplayFields } from "@/components/admin/AdminCmsImageDisplayFields";
import { CustomCmsImageBlock } from "@/components/shared/CustomCmsImageBlock";
import { slugifyCmsSegment } from "@/lib/slug";
import type { Product } from "@/data/mock";

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function blankPage(): PublicCustomSitePage {
  return {
    id: uid("page"),
    slug: "new-page",
    title: "New custom page",
    heroSubtitle: "",
    heroImage: "",
    enabled: true,
    showInMobile: false,
    sections: [],
    updatedAt: new Date().toISOString(),
  };
}

export function AdminCustomSitePagesClient({
  initialPages,
  products,
}: {
  initialPages: PublicCustomSitePage[];
  products: Product[];
}) {
  const [pages, setPages] = useState<PublicCustomSitePage[]>(() =>
    initialPages.length ? initialPages : [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialPages[0]?.id ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selected = pages.find((p) => p.id === selectedId) ?? null;

  const updateSelected = (patch: Partial<PublicCustomSitePage>) => {
    if (!selectedId) return;
    setPages((list) =>
      list.map((p) => (p.id === selectedId ? { ...p, ...patch } : p)),
    );
  };

  const addPage = () => {
    const next = blankPage();
    setPages((list) => [...list, next]);
    setSelectedId(next.id);
  };

  const removePage = (id: string) => {
    setPages((list) => {
      const filtered = list.filter((p) => p.id !== id);
      if (selectedId === id) {
        setSelectedId(filtered[0]?.id ?? null);
      }
      return filtered;
    });
  };

  const normalized = useMemo(
    () =>
      pages.map((p) => ({
        ...p,
        slug: slugifyCmsSegment(p.slug || p.title),
        sections: Array.isArray(p.sections) ? p.sections : [],
      })),
    [pages],
  );

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customSitePages: normalized }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as { customSitePages: CustomSitePage[] };
      const next = (data.customSitePages ?? []).map((page) =>
        resolveCustomSitePage(page, "en"),
      );
      setPages(next);
      if (selectedId && !next.some((p) => p.id === selectedId)) {
        setSelectedId(next[0]?.id ?? null);
      }
      setMessage("Custom pages saved.");
    } catch {
      setMessage("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const onSectionsChange = (sections: CmsCustomSection[]) => {
    updateSelected({ sections });
  };

  return (
    <form
      className="form-products-create form-type-2 sarjan-product-create sarjan-custom-pages-admin"
      onSubmit={save}
    >
      <div className="flex flex-wrap justify-between gap14 items-center mb-30">
        <div className="body-text text-secondary">
          Build flexible landing pages with sections: text, images/banners,
          buttons, product cards, and card grids. Public URL:{" "}
          <code className="text-1">/your-slug</code>
        </div>
        <div className="d-flex gap10 flex-wrap">
          <button type="button" className="tf-button style-1" onClick={addPage}>
            New page
          </button>
          <button type="submit" className="tf-button" disabled={saving}>
            {saving ? "Saving..." : "Save all pages"}
          </button>
        </div>
      </div>
      {message ? (
        <div className="sarjan-admin-message mb-20">{message}</div>
      ) : null}

      <div className="sarjan-custom-pages-layout mb-30">
        <div className="wg-box p-24 sarjan-custom-pages-list">
          <h6 className="mb-16">Pages</h6>
          <div className="d-grid gap-2">
            {pages.map((p) => (
              <div key={p.id} className="d-flex gap8 align-items-center">
                <button
                  type="button"
                  className={`tf-button flex-grow-1 text-start sarjan-custom-page-list-btn${selectedId === p.id ? " style-1" : ""}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <span className="sarjan-custom-page-list-title">
                    {p.title || p.slug}
                  </span>
                  {p.showInMobile ? (
                    <span className="sarjan-custom-page-mobile-tag">
                      Mobile
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="tf-button"
                  onClick={() => removePage(p.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {!pages.length ? (
            <p className="text-secondary mt-12">
              No pages yet. Click New page.
            </p>
          ) : null}
        </div>

        <div className="sarjan-custom-pages-editor">
          {selected ? (
            <div className="wg-box p-40 sarjan-product-create-box sarjan-custom-pages-editor-box mb-30">
              <h5 className="mb-20">Edit: {selected.title}</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
                <fieldset>
                  <div className="text-button mb-8">Title</div>
                  <input
                    value={selected.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      updateSelected({
                        title,
                        slug:
                          selected.slug === slugifyCmsSegment(selected.title) ||
                          !selected.slug
                            ? slugifyCmsSegment(title)
                            : selected.slug,
                      });
                    }}
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button mb-8">URL slug</div>
                  <input
                    value={selected.slug}
                    onChange={(e) =>
                      updateSelected({
                        slug: slugifyCmsSegment(e.target.value),
                      })
                    }
                  />
                  <div className="text-caption-1 text-secondary mt-8">
                    /{slugifyCmsSegment(selected.slug || selected.title)}
                  </div>
                </fieldset>
              </div>
              <fieldset className="mb-16">
                <div className="text-button mb-8">Hero subtitle</div>
                <input
                  value={selected.heroSubtitle ?? ""}
                  onChange={(e) =>
                    updateSelected({ heroSubtitle: e.target.value })
                  }
                />
              </fieldset>
              <fieldset className="mb-16">
                <div className="text-button mb-8">Hero image URL</div>
                <input
                  value={selected.heroImage ?? ""}
                  onChange={(e) =>
                    updateSelected({ heroImage: e.target.value })
                  }
                />
                {selected.heroImage?.trim() ? (
                  <div className="mt-16">
                    <CustomCmsImageBlock
                      className="sarjan-custom-image-admin-preview"
                      src={selected.heroImage}
                      alt={selected.title}
                      display={selected}
                    />
                  </div>
                ) : null}
              </fieldset>
              <div className="mb-20">
                <AdminCmsImageDisplayFields
                  value={selected}
                  onChange={(patch) => updateSelected(patch)}
                />
              </div>
              <div className="sarjan-custom-pages-toggles mb-20">
                <label className="sarjan-custom-pages-toggle">
                  <input
                    type="checkbox"
                    checked={selected.enabled !== false}
                    onChange={(e) =>
                      updateSelected({ enabled: e.target.checked })
                    }
                  />
                  <span>Published on website</span>
                </label>
                <label className="sarjan-custom-pages-toggle">
                  <input
                    type="checkbox"
                    checked={selected.showInMobile === true}
                    onChange={(e) =>
                      updateSelected({ showInMobile: e.target.checked })
                    }
                  />
                  <span>Show in mobile app</span>
                </label>
              </div>
              <p className="text-caption-1 text-secondary mb-20 sarjan-custom-pages-mobile-hint">
                Mobile app → Profile tab → <strong>Info</strong> section mein
                link dikhega (Save ke baad). Website par URL hamesha{" "}
                <code>
                  /{slugifyCmsSegment(selected.slug || selected.title)}
                </code>{" "}
                se khulega jab Published on hai.
              </p>
              <div className="sarjan-seo-panel mb-24">
                <h6>SEO</h6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <fieldset>
                    <div className="text-caption-1 mb-8">Meta title</div>
                    <input
                      value={selected.metaTitle ?? ""}
                      onChange={(e) =>
                        updateSelected({ metaTitle: e.target.value })
                      }
                    />
                  </fieldset>
                  <fieldset>
                    <div className="text-caption-1 mb-8">Keywords</div>
                    <input
                      value={selected.keywords ?? ""}
                      onChange={(e) =>
                        updateSelected({ keywords: e.target.value })
                      }
                    />
                  </fieldset>
                </div>
                <fieldset>
                  <div className="text-caption-1 mb-8">Meta description</div>
                  <textarea
                    rows={2}
                    value={selected.metaDescription ?? ""}
                    onChange={(e) =>
                      updateSelected({ metaDescription: e.target.value })
                    }
                  />
                </fieldset>
              </div>
            </div>
          ) : null}

          {selected ? (
            <AdminCustomSectionsEditor
              title="Page sections"
              description="Stack sections in order. Use layout “Banner” for wide imagery, “Grid” for mixed blocks, “Split” for side-by-side."
              sections={selected.sections ?? []}
              onChange={onSectionsChange}
              products={products}
            />
          ) : null}
        </div>
      </div>
    </form>
  );
}
