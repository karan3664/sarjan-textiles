"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { CategoryHubPage, CategoryHubSubcategory } from "@/lib/cms-store";
import { slugifyCmsSegment } from "@/lib/slug";

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function blankSub(): CategoryHubSubcategory {
  return {
    id: uid("sub"),
    title: "New sub-line",
    description: "",
    image: "/sarjan-assets/banner-textiles-studio.webp",
    href: "/products",
  };
}

function blankHub(): CategoryHubPage {
  return {
    id: uid("hub"),
    slug: "new-category-hub",
    title: "New category hub",
    subtitle: "",
    heroImage: "/sarjan-assets/banner-textiles-studio.webp",
    intro: "",
    enabled: true,
    subcategories: [blankSub()],
    updatedAt: new Date().toISOString(),
  };
}

export function AdminCategoryHubsClient({
  initialHubs,
}: {
  initialHubs: CategoryHubPage[];
}) {
  const [hubs, setHubs] = useState<CategoryHubPage[]>(() =>
    initialHubs.length ? initialHubs : [blankHub()],
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const slugifyTitle = (title: string) => {
    const base = slugifyCmsSegment(title);
    return base || "category-hub";
  };

  const updateHub = (index: number, patch: Partial<CategoryHubPage>) => {
    setHubs((list) =>
      list.map((hub, i) => (i === index ? { ...hub, ...patch } : hub)),
    );
  };

  const updateSub = (
    hubIndex: number,
    subIndex: number,
    patch: Partial<CategoryHubSubcategory>,
  ) => {
    setHubs((list) =>
      list.map((hub, i) => {
        if (i !== hubIndex) return hub;
        const subcategories = (hub.subcategories ?? []).map((sub, j) =>
          j === subIndex ? { ...sub, ...patch } : sub,
        );
        return { ...hub, subcategories };
      }),
    );
  };

  const addSub = (hubIndex: number) => {
    setHubs((list) =>
      list.map((hub, i) =>
        i === hubIndex
          ? {
              ...hub,
              subcategories: [...(hub.subcategories ?? []), blankSub()],
            }
          : hub,
      ),
    );
  };

  const removeSub = (hubIndex: number, subIndex: number) => {
    setHubs((list) =>
      list.map((hub, i) => {
        if (i !== hubIndex) return hub;
        return {
          ...hub,
          subcategories: (hub.subcategories ?? []).filter(
            (_, j) => j !== subIndex,
          ),
        };
      }),
    );
  };

  const addHub = () => setHubs((list) => [...list, blankHub()]);

  const removeHub = (index: number) =>
    setHubs((list) => list.filter((_, i) => i !== index));

  const normalized = useMemo(
    () =>
      hubs.map((hub) => ({
        ...hub,
        slug: slugifyCmsSegment(hub.slug || hub.title),
        subcategories: (hub.subcategories ?? []).map((sub) => ({
          ...sub,
          id: sub.id || uid("sub"),
        })),
      })),
    [hubs],
  );

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryHubPages: normalized }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as {
        categoryHubPages: CategoryHubPage[];
      };
      setHubs(
        data.categoryHubPages?.length ? data.categoryHubPages : [blankHub()],
      );
      setMessage("Category pages saved.");
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
          Main category hubs (e.g. Kurtas) with sub-line cards that link into
          the catalog. URL:{" "}
          <code className="text-1">/categories/your-slug</code>
        </div>
        <div className="d-flex gap10 flex-wrap">
          <button type="button" className="tf-button style-1" onClick={addHub}>
            Add hub
          </button>
          <button type="submit" className="tf-button" disabled={saving}>
            {saving ? "Saving..." : "Save all hubs"}
          </button>
        </div>
      </div>
      {message ? (
        <div className="sarjan-admin-message mb-20">{message}</div>
      ) : null}

      {hubs.map((hub, hubIndex) => (
        <div
          className="wg-box p-40 sarjan-product-create-box mb-30"
          key={hub.id}
        >
          <div className="flex flex-wrap justify-between gap10 mb-20">
            <h5>Hub {hubIndex + 1}</h5>
            <button
              type="button"
              className="tf-button"
              onClick={() => removeHub(hubIndex)}
              disabled={hubs.length <= 1}
            >
              Remove hub
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
            <fieldset>
              <div className="text-button mb-8">Title</div>
              <input
                value={hub.title}
                onChange={(e) => {
                  const title = e.target.value;
                  updateHub(hubIndex, {
                    title,
                    slug:
                      hub.slug === slugifyTitle(hub.title) || !hub.slug
                        ? slugifyCmsSegment(title)
                        : hub.slug,
                  });
                }}
              />
            </fieldset>
            <fieldset>
              <div className="text-button mb-8">URL slug</div>
              <input
                value={hub.slug}
                onChange={(e) =>
                  updateHub(hubIndex, {
                    slug: slugifyCmsSegment(e.target.value),
                  })
                }
              />
              <div className="text-caption-1 text-secondary mt-8">
                Live URL: /categories/{slugifyCmsSegment(hub.slug || hub.title)}
              </div>
            </fieldset>
          </div>
          <fieldset className="mb-16">
            <div className="text-button mb-8">Subtitle</div>
            <input
              value={hub.subtitle ?? ""}
              onChange={(e) =>
                updateHub(hubIndex, { subtitle: e.target.value })
              }
            />
          </fieldset>
          <fieldset className="mb-16">
            <div className="text-button mb-8">Hero image URL</div>
            <input
              value={hub.heroImage ?? ""}
              onChange={(e) =>
                updateHub(hubIndex, { heroImage: e.target.value })
              }
            />
          </fieldset>
          <fieldset className="mb-16">
            <div className="text-button mb-8">Introduction</div>
            <textarea
              rows={3}
              value={hub.intro ?? ""}
              onChange={(e) => updateHub(hubIndex, { intro: e.target.value })}
            />
          </fieldset>
          <label className="d-flex align-items-center gap10 mb-20">
            <input
              type="checkbox"
              checked={hub.enabled !== false}
              onChange={(e) =>
                updateHub(hubIndex, { enabled: e.target.checked })
              }
            />
            <span>Published on storefront</span>
          </label>

          <div className="sarjan-seo-panel mb-24">
            <h6>SEO (optional)</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <fieldset>
                <div className="text-caption-1 mb-8">Meta title</div>
                <input
                  value={hub.metaTitle ?? ""}
                  onChange={(e) =>
                    updateHub(hubIndex, { metaTitle: e.target.value })
                  }
                />
              </fieldset>
              <fieldset>
                <div className="text-caption-1 mb-8">Keywords</div>
                <input
                  value={hub.keywords ?? ""}
                  onChange={(e) =>
                    updateHub(hubIndex, { keywords: e.target.value })
                  }
                />
              </fieldset>
            </div>
            <fieldset>
              <div className="text-caption-1 mb-8">Meta description</div>
              <textarea
                rows={2}
                value={hub.metaDescription ?? ""}
                onChange={(e) =>
                  updateHub(hubIndex, { metaDescription: e.target.value })
                }
              />
            </fieldset>
          </div>

          <div className="d-flex justify-between align-items-center mb-12">
            <h6>Subcategory cards</h6>
            <button
              type="button"
              className="tf-button style-1"
              onClick={() => addSub(hubIndex)}
            >
              Add card
            </button>
          </div>
          <div className="d-grid gap-3">
            {(hub.subcategories ?? []).map((sub, subIndex) => (
              <div
                key={sub.id}
                className="border border-secondary rounded p-16 d-grid gap-3"
              >
                <div className="d-flex justify-between gap10">
                  <span className="text-button">Card {subIndex + 1}</span>
                  <button
                    type="button"
                    className="tf-button"
                    onClick={() => removeSub(hubIndex, subIndex)}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <fieldset>
                    <div className="text-caption-1 mb-8">Title</div>
                    <input
                      value={sub.title}
                      onChange={(e) =>
                        updateSub(hubIndex, subIndex, { title: e.target.value })
                      }
                    />
                  </fieldset>
                  <fieldset>
                    <div className="text-caption-1 mb-8">Link (href)</div>
                    <input
                      value={sub.href}
                      onChange={(e) =>
                        updateSub(hubIndex, subIndex, { href: e.target.value })
                      }
                    />
                  </fieldset>
                </div>
                <fieldset>
                  <div className="text-caption-1 mb-8">Description</div>
                  <textarea
                    rows={2}
                    value={sub.description ?? ""}
                    onChange={(e) =>
                      updateSub(hubIndex, subIndex, {
                        description: e.target.value,
                      })
                    }
                  />
                </fieldset>
                <fieldset>
                  <div className="text-caption-1 mb-8">Image URL</div>
                  <input
                    value={sub.image ?? ""}
                    onChange={(e) =>
                      updateSub(hubIndex, subIndex, { image: e.target.value })
                    }
                  />
                </fieldset>
              </div>
            ))}
          </div>
        </div>
      ))}
    </form>
  );
}
