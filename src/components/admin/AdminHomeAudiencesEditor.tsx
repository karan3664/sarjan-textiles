"use client";

import type { MobileHomeAudienceTab } from "@/lib/mobile-app-cms";

type Props = {
  audiences: MobileHomeAudienceTab[];
  onChange: (audiences: MobileHomeAudienceTab[]) => void;
};

function newAudienceTab(order: number): MobileHomeAudienceTab {
  const stamp = Date.now();
  return {
    id: `tab_${stamp}`,
    label: "New tab",
    enabled: true,
    searchPlaceholder: "Search collections",
    keywords: [],
    order,
  };
}

function parseKeywords(raw: string) {
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function formatKeywords(keywords?: string[]) {
  return (keywords ?? []).join(", ");
}

export function AdminHomeAudiencesEditor({ audiences, onChange }: Props) {
  const update = (index: number, patch: Partial<MobileHomeAudienceTab>) => {
    onChange(
      audiences.map((tab, i) => (i === index ? { ...tab, ...patch } : tab)),
    );
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= audiences.length) return;
    const next = [...audiences];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((tab, order) => ({ ...tab, order })));
  };

  const remove = (index: number) => {
    const tab = audiences[index];
    if (!tab || tab.id === "all") return;
    onChange(
      audiences
        .filter((_, i) => i !== index)
        .map((item, order) => ({
          ...item,
          order,
        })),
    );
  };

  return (
    <section
      id="mobile-audiences"
      className="wg-box sarjan-mobile-app-cms__panel"
    >
      <div className="sarjan-mobile-app-cms__panel-head">
        <h5 className="mb-0">Home audience tabs</h5>
        <span className="body-text text-secondary">
          ALL / MEN / WOMEN style tabs on the app home screen. Products and
          categories are matched by keywords in their name (see help below).
        </span>
      </div>

      <p className="body-text text-secondary sarjan-mobile-app-cms__hint">
        <strong>How filtering works:</strong> The <code>All</code> tab shows
        everything. Other tabs only show items whose category or product name
        contains one of the keywords (e.g. men → shirt, kurta). Add or remove
        tabs here — changes appear in the app after save and refresh.
      </p>

      {audiences.map((tab, index) => (
        <article
          key={`${tab.id}-${index}`}
          className="sarjan-mobile-app-cms__card sarjan-mobile-app-cms__card--nested"
        >
          <div className="sarjan-mobile-app-cms__card-head">
            <strong>{tab.label || tab.id}</strong>
            <div className="sarjan-mobile-app-cms__card-actions">
              <button
                type="button"
                className="tf-button style-3"
                onClick={() => move(index, -1)}
                disabled={index === 0}
              >
                ↑
              </button>
              <button
                type="button"
                className="tf-button style-3"
                onClick={() => move(index, 1)}
                disabled={index >= audiences.length - 1}
              >
                ↓
              </button>
              {tab.id !== "all" ? (
                <button
                  type="button"
                  className="tf-button style-3"
                  onClick={() => remove(index)}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div className="sarjan-mobile-app-cms__grid">
            <fieldset>
              <label className="body-title mb-10">Tab ID</label>
              <input
                className="form-control"
                value={tab.id}
                disabled={tab.id === "all"}
                onChange={(e) =>
                  update(index, {
                    id: e.target.value
                      .trim()
                      .toLowerCase()
                      .replace(/[^a-z0-9_]+/g, "_"),
                  })
                }
              />
            </fieldset>
            <fieldset>
              <label className="body-title mb-10">Label (English)</label>
              <input
                className="form-control"
                value={tab.label}
                onChange={(e) => update(index, { label: e.target.value })}
              />
            </fieldset>
            <fieldset className="sarjan-mobile-app-cms__field-full">
              <label className="body-title mb-10">Search placeholder</label>
              <input
                className="form-control"
                value={tab.searchPlaceholder ?? ""}
                onChange={(e) =>
                  update(index, { searchPlaceholder: e.target.value })
                }
              />
            </fieldset>
            {tab.id !== "all" ? (
              <fieldset className="sarjan-mobile-app-cms__field-full">
                <label className="body-title mb-10">
                  Match keywords (comma-separated)
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formatKeywords(tab.keywords)}
                  placeholder="men, shirt, kurta, blazer"
                  onChange={(e) =>
                    update(index, { keywords: parseKeywords(e.target.value) })
                  }
                />
              </fieldset>
            ) : null}
            <fieldset className="sarjan-mobile-app-cms__field-span">
              <label className="sarjan-mobile-app-cms__toggle">
                <input
                  type="checkbox"
                  checked={tab.enabled}
                  onChange={(e) => update(index, { enabled: e.target.checked })}
                />
                <span>Show this tab in the app</span>
              </label>
            </fieldset>
          </div>
        </article>
      ))}

      <button
        type="button"
        className="tf-button style-3"
        onClick={() =>
          onChange([...audiences, newAudienceTab(audiences.length)])
        }
      >
        + Add audience tab
      </button>
    </section>
  );
}
