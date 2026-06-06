"use client";

import { useEffect, useState } from "react";
import type { CmsSnapshot } from "@/lib/cms-store";
import type {
  MobileProfileMenuGroup,
  MobileProfileMenuItem,
} from "@/lib/mobile-profile-menus";
import {
  MOBILE_PROFILE_ACTION_OPTIONS,
  MOBILE_PROFILE_ICON_OPTIONS,
  defaultMobileProfileMenus,
  flattenMobileProfileMenusForAdmin,
  newMobileProfileMenuItem,
  normalizeMobileProfileMenus,
} from "@/lib/mobile-profile-menus";
import { flattenMobileAppForAdmin } from "@/lib/mobile-app-cms";

type SaveState = "idle" | "saving" | "saved" | "error";

const GROUP_LABELS: Record<MobileProfileMenuGroup, string> = {
  account: "Signed-in account menu",
  explore: "Explore (everyone)",
  info: "Information & policies",
};

export function AdminProfileMenusEditor() {
  const [menus, setMenus] = useState(defaultMobileProfileMenus);
  const [customPages, setCustomPages] = useState<
    Array<{ slug: string; title: string }>
  >([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    fetch("/api/admin/cms")
      .then((res) => res.json())
      .then((data: CmsSnapshot) => {
        setMenus(
          flattenMobileProfileMenusForAdmin(data.mobileApp.profileMenus),
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

  const actionOptions = [
    ...MOBILE_PROFILE_ACTION_OPTIONS,
    ...customPages.map((page) => ({
      label: `Custom page: ${page.title}`,
      action: `site:${page.slug}`,
      group: "explore" as MobileProfileMenuGroup,
    })),
  ];

  const updateGroup = (
    group: MobileProfileMenuGroup,
    nextItems: MobileProfileMenuItem[],
  ) => {
    setMenus((current) => ({ ...current, [group]: nextItems }));
  };

  const move = (group: MobileProfileMenuGroup, index: number, dir: -1 | 1) => {
    const items = [...menus[group]];
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    updateGroup(group, items);
  };

  const updateItem = (
    group: MobileProfileMenuGroup,
    id: string,
    patch: Partial<MobileProfileMenuItem>,
  ) => {
    updateGroup(
      group,
      menus[group].map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  };

  const removeItem = (group: MobileProfileMenuGroup, id: string) => {
    updateGroup(
      group,
      menus[group].filter((item) => item.id !== id),
    );
  };

  const addItem = (group: MobileProfileMenuGroup) => {
    updateGroup(group, [
      ...menus[group],
      newMobileProfileMenuItem(group, { label: "New item" }),
    ]);
  };

  const save = async () => {
    setSaveState("saving");
    try {
      const cmsRes = await fetch("/api/admin/cms");
      const cms = (await cmsRes.json()) as CmsSnapshot;
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileApp: {
            ...flattenMobileAppForAdmin(cms.mobileApp),
            profileMenus: menus,
          },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as CmsSnapshot;
      setMenus(flattenMobileProfileMenusForAdmin(data.mobileApp.profileMenus));
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const resetDefaults = () => {
    if (!window.confirm("Reset profile menus to defaults?")) return;
    setMenus(defaultMobileProfileMenus);
  };

  return (
    <div className="wg-box mt-24">
      <div className="flex items-center justify-between flex-wrap gap-12 mb-24">
        <div>
          <h5>Mobile profile menus</h5>
          <p className="body-text text-secondary mt-8 mb-0">
            Profile tab lists in the app — add, hide, or reorder without a new
            APK. Use <code>site:slug</code> actions for custom CMS pages.
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
            Save profile menus
          </button>
        </div>
      </div>

      {saveState === "saved" ? (
        <p className="text-success mb-16">Saved — app picks up on next open.</p>
      ) : null}
      {saveState === "error" ? (
        <p className="text-danger mb-16">Save failed.</p>
      ) : null}

      {(["account", "explore", "info"] as MobileProfileMenuGroup[]).map(
        (group) => (
          <div key={group} className="mb-32">
            <h6 className="mb-12">{GROUP_LABELS[group]}</h6>
            <div className="sarjan-header-nav-editor">
              {menus[group].map((item, index) => (
                <div
                  key={item.id}
                  className={`sarjan-header-nav-editor__row${item.visible ? "" : " sarjan-header-nav-editor__row--hidden"}`}
                >
                  <div className="sarjan-header-nav-editor__order">
                    <button
                      type="button"
                      className="tf-button style-3"
                      disabled={index === 0}
                      onClick={() => move(group, index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="tf-button style-3"
                      disabled={index === menus[group].length - 1}
                      onClick={() => move(group, index, 1)}
                    >
                      ↓
                    </button>
                  </div>

                  <label className="sarjan-header-nav-editor__visible">
                    <input
                      type="checkbox"
                      checked={item.visible}
                      onChange={(event) =>
                        updateItem(group, item.id, {
                          visible: event.target.checked,
                        })
                      }
                    />
                    <span>Show</span>
                  </label>

                  <fieldset className="sarjan-header-nav-editor__field">
                    <span className="body-text mb-6 d-block">Label</span>
                    <input
                      value={item.label}
                      onChange={(event) =>
                        updateItem(group, item.id, {
                          label: event.target.value,
                        })
                      }
                    />
                  </fieldset>

                  <fieldset className="sarjan-header-nav-editor__field">
                    <span className="body-text mb-6 d-block">Action</span>
                    <select
                      value={
                        actionOptions.some((opt) => opt.action === item.action)
                          ? item.action
                          : "__custom__"
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "__custom__") return;
                        const option = actionOptions.find(
                          (opt) => opt.action === value,
                        );
                        updateItem(group, item.id, {
                          action: value,
                          label: option?.label ?? item.label,
                        });
                      }}
                    >
                      <option value="__custom__">Custom action…</option>
                      {actionOptions.map((opt) => (
                        <option key={opt.action} value={opt.action}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="mt-8"
                      placeholder="screen:Faqs | site:slug | path:/contact"
                      value={item.action}
                      onChange={(event) =>
                        updateItem(group, item.id, {
                          action: event.target.value,
                        })
                      }
                    />
                  </fieldset>

                  <fieldset className="sarjan-header-nav-editor__field">
                    <span className="body-text mb-6 d-block">Icon</span>
                    <select
                      value={item.icon}
                      onChange={(event) =>
                        updateItem(group, item.id, { icon: event.target.value })
                      }
                    >
                      {MOBILE_PROFILE_ICON_OPTIONS.map((icon) => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      ))}
                    </select>
                  </fieldset>

                  {group === "account" ? (
                    <>
                      <label className="sarjan-header-nav-editor__visible">
                        <input
                          type="checkbox"
                          checked={Boolean(item.requiresAuth)}
                          onChange={(event) =>
                            updateItem(group, item.id, {
                              requiresAuth: event.target.checked,
                            })
                          }
                        />
                        <span>Signed-in</span>
                      </label>
                      <label className="sarjan-header-nav-editor__visible">
                        <input
                          type="checkbox"
                          checked={Boolean(item.requiresApproved)}
                          onChange={(event) =>
                            updateItem(group, item.id, {
                              requiresApproved: event.target.checked,
                            })
                          }
                        />
                        <span>Approved only</span>
                      </label>
                    </>
                  ) : null}

                  {group === "explore" ? (
                    <label className="sarjan-header-nav-editor__visible">
                      <input
                        type="checkbox"
                        checked={Boolean(item.guestOnly)}
                        onChange={(event) =>
                          updateItem(group, item.id, {
                            guestOnly: event.target.checked,
                          })
                        }
                      />
                      <span>Guest only</span>
                    </label>
                  ) : null}

                  <button
                    type="button"
                    className="tf-button style-3"
                    onClick={() => removeItem(group, item.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="tf-button style-2 mt-12"
              onClick={() => addItem(group)}
            >
              + Add to {GROUP_LABELS[group]}
            </button>
          </div>
        ),
      )}
    </div>
  );
}
