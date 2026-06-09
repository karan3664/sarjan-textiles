"use client";

import { useEffect, useState } from "react";
import type { CmsSnapshot } from "@/lib/cms-store";
import {
  HEADER_NAV_PAGE_OPTIONS,
  defaultHeaderNavigation,
  newHeaderNavItem,
  normalizeHeaderNavigation,
  type HeaderNavItem,
} from "@/lib/header-navigation";

type SaveState = "idle" | "saving" | "saved" | "error";

export function AdminHeaderNavEditor() {
  const [cms, setCms] = useState<CmsSnapshot | null>(null);
  const [items, setItems] = useState<HeaderNavItem[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    fetch("/api/admin/cms")
      .then((res) => res.json())
      .then((data: CmsSnapshot) => {
        setCms(data);
        setItems(
          normalizeHeaderNavigation(
            data.siteSettings?.headerNavigation,
            defaultHeaderNavigation,
          ),
        );
      })
      .catch(() => undefined);
  }, []);

  const persistItems = (next: HeaderNavItem[]) => {
    setItems(next);
    if (cms) {
      setCms({
        ...cms,
        siteSettings: {
          ...cms.siteSettings,
          headerNavigation: next,
        },
      });
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    persistItems(next);
  };

  const updateItem = (id: string, patch: Partial<HeaderNavItem>) => {
    persistItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const href = patch.href !== undefined ? patch.href : item.href;
        const merged = { ...item, ...patch, href };
        return {
          ...merged,
          showCategoriesDropdown:
            merged.href === "/products" && merged.showCategoriesDropdown,
        };
      }),
    );
  };

  const removeItem = (id: string) => {
    persistItems(items.filter((item) => item.id !== id));
  };

  const addItem = () => {
    persistItems([
      ...items,
      newHeaderNavItem({ label: "New link", href: "/" }),
    ]);
  };

  const applyPage = (id: string, href: string) => {
    const option = HEADER_NAV_PAGE_OPTIONS.find((page) => page.href === href);
    updateItem(id, {
      href,
      label: option?.label ?? items.find((i) => i.id === id)?.label,
    });
  };

  const save = async () => {
    if (!cms) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSettings: {
            ...cms.siteSettings,
            headerNavigation: normalizeHeaderNavigation(items),
          },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as CmsSnapshot;
      setCms(data);
      setItems(
        normalizeHeaderNavigation(
          data.siteSettings?.headerNavigation,
          defaultHeaderNavigation,
        ),
      );
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const resetDefaults = () => {
    if (
      !window.confirm(
        "Reset header menu to default links? This does not save until you click Save menu.",
      )
    ) {
      return;
    }
    persistItems(defaultHeaderNavigation.map((item) => ({ ...item })));
  };

  return (
    <div className="wg-box">
      <div className="flex items-center justify-between flex-wrap gap-12 mb-24">
        <div>
          <h5>Header menu</h5>
          <p className="body-text text-secondary mt-8 mb-0">
            Reorder, hide, add, or remove top navigation links. Changes apply on
            the live site after save (no redeploy).
          </p>
        </div>
        <div className="flex flex-wrap gap-10">
          <button
            type="button"
            className="tf-button style-3"
            onClick={resetDefaults}
          >
            Reset defaults
          </button>
          <button type="button" className="tf-button style-1" onClick={save}>
            Save menu
          </button>
        </div>
      </div>

      <div className="sarjan-header-nav-editor">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`sarjan-header-nav-editor__row${item.visible ? "" : " sarjan-header-nav-editor__row--hidden"}`}
          >
            <div className="sarjan-header-nav-editor__order">
              <button
                type="button"
                className="tf-button style-3 sarjan-header-nav-editor__order-btn"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="tf-button style-3 sarjan-header-nav-editor__order-btn"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Move down"
              >
                ↓
              </button>
            </div>

            <label className="sarjan-header-nav-editor__visible">
              <input
                type="checkbox"
                checked={item.visible}
                onChange={(event) =>
                  updateItem(item.id, { visible: event.target.checked })
                }
              />
              <span>Show</span>
            </label>

            <fieldset className="sarjan-header-nav-editor__field">
              <span className="body-text mb-6 d-block">Label</span>
              <input
                value={item.label}
                onChange={(event) =>
                  updateItem(item.id, { label: event.target.value })
                }
              />
            </fieldset>

            <fieldset className="sarjan-header-nav-editor__field">
              <span className="body-text mb-6 d-block">Link to page</span>
              <select
                value={
                  HEADER_NAV_PAGE_OPTIONS.some((p) => p.href === item.href)
                    ? item.href
                    : "__custom__"
                }
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__custom__") return;
                  applyPage(item.id, value);
                }}
              >
                <option value="__custom__">Custom URL…</option>
                {HEADER_NAV_PAGE_OPTIONS.map((page) => (
                  <option key={page.href} value={page.href}>
                    {page.label} ({page.href})
                  </option>
                ))}
              </select>
              <input
                className="mt-10"
                value={item.href}
                onChange={(event) =>
                  updateItem(item.id, { href: event.target.value })
                }
                placeholder="/faqs or /your-page"
              />
            </fieldset>

            {item.href === "/products" ? (
              <label className="sarjan-header-nav-editor__mega">
                <input
                  type="checkbox"
                  checked={Boolean(item.showCategoriesDropdown)}
                  onChange={(event) =>
                    updateItem(item.id, {
                      showCategoriesDropdown: event.target.checked,
                    })
                  }
                />
                <span>Categories dropdown after Products</span>
              </label>
            ) : null}

            <button
              type="button"
              className="tf-button style-3 text-danger sarjan-header-nav-editor__remove"
              onClick={() => removeItem(item.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="tf-button style-3 mt-20"
        onClick={addItem}
      >
        + Add menu item
      </button>

      <p
        className={`body-text mt-20 ${saveState === "error" ? "text-danger" : ""}`}
      >
        {saveState === "saving"
          ? "Saving…"
          : saveState === "saved"
            ? "Saved. Refresh the storefront to see the updated menu."
            : saveState === "error"
              ? "Save failed."
              : "Hidden items stay in this list but do not appear in the header."}
      </p>
    </div>
  );
}
