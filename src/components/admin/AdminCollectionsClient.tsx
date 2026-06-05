"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { CollectionPage } from "@/lib/cms-store";
import { slugifyCmsSegment } from "@/lib/slug";

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function blankCollection(): CollectionPage {
  return {
    id: uid("collection"),
    slug: "new-collection",
    title: "New collection",
    description: "",
    q: "",
    enabled: true,
    sortOrder: 99,
    updatedAt: new Date().toISOString(),
  };
}

export function AdminCollectionsClient({
  initialCollections,
}: {
  initialCollections: CollectionPage[];
}) {
  const [collections, setCollections] = useState<CollectionPage[]>(() =>
    initialCollections.length ? initialCollections : [blankCollection()],
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const slugifyTitle = (title: string) => {
    const base = slugifyCmsSegment(title);
    return base || "collection";
  };

  const updateCollection = (index: number, patch: Partial<CollectionPage>) => {
    setCollections((list) =>
      list.map((page, i) => (i === index ? { ...page, ...patch } : page)),
    );
  };

  const addCollection = () =>
    setCollections((list) => [...list, blankCollection()]);

  const removeCollection = (index: number) =>
    setCollections((list) => list.filter((_, i) => i !== index));

  const normalized = useMemo(
    () =>
      collections.map((page) => ({
        ...page,
        slug: slugifyCmsSegment(page.slug || page.title),
        sortOrder: Number(page.sortOrder ?? 0) || undefined,
      })),
    [collections],
  );

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionPages: normalized }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as {
        collectionPages: CollectionPage[];
      };
      setCollections(
        data.collectionPages?.length
          ? data.collectionPages
          : [blankCollection()],
      );
      setMessage("Collection pages saved.");
    } catch {
      setMessage("Save failed. Check network or admin session.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="form-products-create form-type-2 sarjan-product-create"
      onSubmit={save}
    >
      <div className="flex flex-wrap justify-between gap14 items-center mb-30">
        <div className="body-text text-secondary">
          Curated collection listings (Ajrakh, Mashru, block print, etc.). URL:{" "}
          <code className="text-1">/collections/your-slug</code>
        </div>
        <div className="d-flex gap10 flex-wrap">
          <button
            type="button"
            className="tf-button style-1"
            onClick={addCollection}
          >
            Add collection
          </button>
          <button type="submit" className="tf-button" disabled={saving}>
            {saving ? "Saving..." : "Save all collections"}
          </button>
        </div>
      </div>
      {message ? (
        <div className="sarjan-admin-message mb-20">{message}</div>
      ) : null}

      {collections.map((page, index) => (
        <div
          className="wg-box p-40 sarjan-product-create-box mb-30"
          key={page.id}
        >
          <div className="flex flex-wrap justify-between gap10 mb-20">
            <h5>Collection {index + 1}</h5>
            <button
              type="button"
              className="tf-button"
              onClick={() => removeCollection(index)}
              disabled={collections.length <= 1}
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
            <fieldset>
              <div className="text-button mb-8">Title</div>
              <input
                value={page.title}
                onChange={(e) => {
                  const title = e.target.value;
                  updateCollection(index, {
                    title,
                    slug:
                      page.slug === slugifyTitle(page.title) || !page.slug
                        ? slugifyCmsSegment(title)
                        : page.slug,
                  });
                }}
              />
            </fieldset>
            <fieldset>
              <div className="text-button mb-8">URL slug</div>
              <input
                value={page.slug}
                onChange={(e) =>
                  updateCollection(index, {
                    slug: slugifyCmsSegment(e.target.value),
                  })
                }
              />
              <div className="text-caption-1 text-secondary mt-8">
                Live URL: /collections/
                {slugifyCmsSegment(page.slug || page.title)}
              </div>
            </fieldset>
          </div>
          <fieldset className="mb-16">
            <div className="text-button mb-8">Description</div>
            <textarea
              rows={3}
              value={page.description}
              onChange={(e) =>
                updateCollection(index, { description: e.target.value })
              }
            />
          </fieldset>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
            <fieldset>
              <div className="text-button mb-8">Catalog search (q)</div>
              <input
                value={page.q ?? ""}
                onChange={(e) => updateCollection(index, { q: e.target.value })}
                placeholder="e.g. ajrak"
              />
            </fieldset>
            <fieldset>
              <div className="text-button mb-8">Sort order</div>
              <input
                type="number"
                value={page.sortOrder ?? ""}
                onChange={(e) =>
                  updateCollection(index, {
                    sortOrder: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </fieldset>
          </div>
          <label className="d-flex align-items-center gap10 mb-20">
            <input
              type="checkbox"
              checked={page.enabled !== false}
              onChange={(e) =>
                updateCollection(index, { enabled: e.target.checked })
              }
            />
            <span>Published on storefront</span>
          </label>

          <div className="sarjan-seo-panel">
            <h6>SEO (optional)</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <fieldset>
                <div className="text-caption-1 mb-8">Meta title</div>
                <input
                  value={page.metaTitle ?? ""}
                  onChange={(e) =>
                    updateCollection(index, { metaTitle: e.target.value })
                  }
                />
              </fieldset>
              <fieldset>
                <div className="text-caption-1 mb-8">Keywords</div>
                <input
                  value={page.keywords ?? ""}
                  onChange={(e) =>
                    updateCollection(index, { keywords: e.target.value })
                  }
                  placeholder="comma-separated"
                />
              </fieldset>
            </div>
            <fieldset className="mt-16">
              <div className="text-caption-1 mb-8">Meta description</div>
              <textarea
                rows={2}
                value={page.metaDescription ?? ""}
                onChange={(e) =>
                  updateCollection(index, { metaDescription: e.target.value })
                }
              />
            </fieldset>
          </div>
        </div>
      ))}
    </form>
  );
}
