"use client";

import { useEffect, useState } from "react";
import type { CmsSnapshot } from "@/lib/cms-store";
import {
  ACCOUNT_NAV_PAGE_OPTIONS,
  defaultAccountNavigation,
  newAccountNavItem,
  normalizeAccountNavigation,
  type AccountNavItem,
  type AccountNavPlacement,
} from "@/lib/account-navigation";

type SaveState = "idle" | "saving" | "saved" | "error";

export function AdminAccountNavEditor() {
  const [cms, setCms] = useState<CmsSnapshot | null>(null);
  const [items, setItems] = useState<AccountNavItem[]>([]);
  const [customPages, setCustomPages] = useState<
    Array<{ slug: string; title: string }>
  >([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    fetch("/api/admin/cms")
      .then((res) => res.json())
      .then((data: CmsSnapshot) => {
        setCms(data);
        setItems(
          normalizeAccountNavigation(
            data.siteSettings?.accountNavigation,
            defaultAccountNavigation,
          ),
        );
        setCustomPages(
          (data.customSitePages ?? [])
            .filter((page) => page.enabled !== false)
            .map((page) => ({
              slug: page.slug,
              title:
                typeof page.title === "string"
                  ? page.title
                  : (page.title?.en ?? page.slug),
            })),
        );
      })
      .catch(() => undefined);
  }, []);

  const pageOptions = [
    ...ACCOUNT_NAV_PAGE_OPTIONS,
    ...customPages.map((page) => ({
      label: `Custom: ${page.title}`,
      href: `/site/${page.slug}`,
    })),
  ];

  const persistItems = (next: AccountNavItem[]) => {
    setItems(next);
    if (cms) {
      setCms({
        ...cms,
        siteSettings: {
          ...cms.siteSettings,
          accountNavigation: next,
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

  const updateItem = (id: string, patch: Partial<AccountNavItem>) => {
    persistItems(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (id: string) => {
    persistItems(items.filter((item) => item.id !== id));
  };

  const addItem = () => {
    persistItems([
      ...items,
      newAccountNavItem({ label: "New link", href: "/", placement: "both" }),
    ]);
  };

  const applyPage = (id: string, href: string) => {
    const option = pageOptions.find((page) => page.href === href);
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
            accountNavigation: normalizeAccountNavigation(items),
          },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as CmsSnapshot;
      setCms(data);
      setItems(
        normalizeAccountNavigation(
          data.siteSettings?.accountNavigation,
          defaultAccountNavigation,
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
        "Reset account menu to defaults? Click Save account menu to publish.",
      )
    ) {
      return;
    }
    persistItems(defaultAccountNavigation.map((item) => ({ ...item })));
  };

  return (
    <div className="wg-box">
      <div className="flex items-center justify-between flex-wrap gap-12 mb-24">
        <div>
          <h5>Account menu</h5>
          <p className="body-text text-secondary mt-8 mb-0">
            Profile dropdown (header) and account sidebar links. Add custom
            pages at /site/your-slug — no app update needed on mobile when
            linked via Mobile app → Profile menus.
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
            Save account menu
          </button>
        </div>
      </div>

      {saveState === "saved" ? (
        <p className="text-success mb-16">
          Saved — live on website immediately.
        </p>
      ) : null}
      {saveState === "error" ? (
        <p className="text-danger mb-16">Save failed. Try again.</p>
      ) : null}

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
              >
                ↑
              </button>
              <button
                type="button"
                className="tf-button style-3 sarjan-header-nav-editor__order-btn"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
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
              <span className="body-text mb-6 d-block">Page / URL</span>
              <select
                value={
                  pageOptions.some((p) => p.href === item.href)
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
                {pageOptions.map((page) => (
                  <option key={page.href} value={page.href}>
                    {page.label} ({page.href})
                  </option>
                ))}
              </select>
              <input
                className="mt-8"
                placeholder="/site/my-page or https://…"
                value={item.href}
                onChange={(event) =>
                  updateItem(item.id, { href: event.target.value })
                }
              />
            </fieldset>

            <fieldset className="sarjan-header-nav-editor__field">
              <span className="body-text mb-6 d-block">Placement</span>
              <select
                value={item.placement}
                onChange={(event) =>
                  updateItem(item.id, {
                    placement: event.target.value as AccountNavPlacement,
                  })
                }
              >
                <option value="header">Header dropdown</option>
                <option value="sidebar">Account sidebar</option>
                <option value="both">Both</option>
              </select>
            </fieldset>

            <label className="sarjan-header-nav-editor__visible">
              <input
                type="checkbox"
                checked={Boolean(item.requiresAuth)}
                onChange={(event) =>
                  updateItem(item.id, { requiresAuth: event.target.checked })
                }
              />
              <span>Signed-in only</span>
            </label>

            <label className="sarjan-header-nav-editor__visible">
              <input
                type="checkbox"
                checked={Boolean(item.guestOnly)}
                onChange={(event) =>
                  updateItem(item.id, { guestOnly: event.target.checked })
                }
              />
              <span>Guest only</span>
            </label>

            <button
              type="button"
              className="tf-button style-3"
              onClick={() => removeItem(item.id)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="tf-button style-2 mt-16"
        onClick={addItem}
      >
        + Add link
      </button>
    </div>
  );
}
