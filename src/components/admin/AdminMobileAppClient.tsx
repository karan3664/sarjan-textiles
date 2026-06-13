"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type {
  MobileAppConfig,
  MobileAppIconCampaign,
  MobileHomeSection,
} from "@/lib/mobile-app-cms";
import {
  flattenMobileAppForAdmin,
  mobileAppIconOptions,
  mobileHomeSectionOptions,
} from "@/lib/mobile-app-cms";
import { AdminHomeAudiencesEditor } from "@/components/admin/AdminHomeAudiencesEditor";

type Props = {
  initialConfig: MobileAppConfig;
};

const SECTION_NAV = [
  { id: "mobile-splash", label: "Splash" },
  { id: "mobile-onboarding", label: "Onboarding" },
  { id: "mobile-header", label: "Home header" },
  { id: "mobile-audiences", label: "Audience tabs" },
  { id: "mobile-sections", label: "Home sections" },
  { id: "mobile-app-icon", label: "App icon" },
  { id: "mobile-support", label: "Support & footer" },
] as const;

function newCampaignIcon(): MobileAppIconCampaign {
  return {
    id: `campaign-${Date.now()}`,
    label: "Campaign",
    iconId: "mega_sale",
    startAt: "",
    endAt: "",
    enabled: true,
    priority: 10,
  };
}

function newSection(type: MobileHomeSection["type"]): MobileHomeSection {
  const label =
    mobileHomeSectionOptions.find((item) => item.type === type)?.label ?? type;
  return {
    id: `${type}-${Date.now()}`,
    type,
    enabled: true,
    title: label,
  };
}

export function AdminMobileAppClient({ initialConfig }: Props) {
  const [config, setConfig] = useState<MobileAppConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileApp: config }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as {
        mobileApp: Parameters<typeof flattenMobileAppForAdmin>[0];
      };
      setConfig(flattenMobileAppForAdmin(data.mobileApp));
      setMessage(
        "Saved. Hindi & Gujarati translations were generated automatically. Users see changes on next app open.",
      );
    } catch {
      setMessage("Save failed. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (
    file: File | null,
    onUrl: (url: string) => void,
  ) => {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/uploads", { method: "POST", body });
    if (!res.ok) throw new Error("Upload failed");
    const data = (await res.json()) as { url: string };
    onUrl(data.url);
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    setConfig((current) => {
      const next = [...current.homeSections];
      const target = index + dir;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, homeSections: next };
    });
  };

  return (
    <form
      className="form-products-create form-type-2 sarjan-mobile-app-cms"
      onSubmit={save}
    >
      <div className="sarjan-mobile-app-cms__toolbar">
        <div className="sarjan-mobile-app-cms__toolbar-copy">
          <p className="body-text text-secondary mb-0">
            Type in English only — Hindi and Gujarati are auto-generated when
            you save. Controls splash, onboarding, home header, and section
            order for the Sarjan Textiles app.
          </p>
        </div>
        <button
          type="submit"
          className="tf-button text-btn-uppercase"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save mobile app"}
        </button>
      </div>

      {message ? (
        <div className="sarjan-admin-message sarjan-mobile-app-cms__message">
          {message}
        </div>
      ) : null}

      <nav
        className="sarjan-mobile-app-cms__nav"
        aria-label="Mobile CMS sections"
      >
        {SECTION_NAV.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="sarjan-mobile-app-cms__nav-link"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <section
        id="mobile-splash"
        className="wg-box sarjan-mobile-app-cms__panel"
      >
        <div className="sarjan-mobile-app-cms__panel-head">
          <h5 className="mb-0">Splash screen</h5>
          <span className="body-text text-secondary">
            First screen on app launch
          </span>
        </div>
        <div className="sarjan-mobile-app-cms__grid">
          <fieldset>
            <label className="body-title mb-10">Tagline</label>
            <input
              className="form-control"
              value={config.splash.tagline}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  splash: { ...c.splash, tagline: e.target.value },
                }))
              }
            />
          </fieldset>
          <fieldset>
            <label className="body-title mb-10">Loading text</label>
            <input
              className="form-control"
              value={config.splash.loadingText}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  splash: { ...c.splash, loadingText: e.target.value },
                }))
              }
            />
          </fieldset>
          <fieldset>
            <label className="body-title mb-10">
              Minimum splash duration (ms)
            </label>
            <input
              type="number"
              className="form-control"
              min={800}
              max={8000}
              value={config.splash.minDurationMs}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  splash: {
                    ...c.splash,
                    minDurationMs: Number(e.target.value) || 2200,
                  },
                }))
              }
            />
          </fieldset>
          <fieldset className="sarjan-mobile-app-cms__field-full">
            <label className="body-title mb-10">Logo URL (optional)</label>
            <input
              className="form-control"
              value={config.splash.logoUrl ?? ""}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  splash: { ...c.splash, logoUrl: e.target.value },
                }))
              }
            />
            <input
              type="file"
              accept="image/*"
              className="sarjan-mobile-app-cms__file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void uploadImage(file, (url) =>
                  setConfig((c) => ({
                    ...c,
                    splash: { ...c.splash, logoUrl: url },
                  })),
                ).catch(() => setMessage("Logo upload failed."));
              }}
            />
          </fieldset>
        </div>
      </section>

      <section
        id="mobile-onboarding"
        className="wg-box sarjan-mobile-app-cms__panel"
      >
        <div className="sarjan-mobile-app-cms__panel-head sarjan-mobile-app-cms__panel-head--split">
          <div>
            <h5 className="mb-0">Onboarding</h5>
            <span className="body-text text-secondary">
              Slides for first-time installs
            </span>
          </div>
          <label className="sarjan-mobile-app-cms__toggle">
            <input
              type="checkbox"
              checked={config.onboarding.enabled}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  onboarding: { ...c.onboarding, enabled: e.target.checked },
                }))
              }
            />
            <span>Show onboarding for new installs</span>
          </label>
        </div>

        <div className="sarjan-mobile-app-cms__stack">
          {config.onboarding.slides.map((slide, index) => (
            <article
              key={slide.id}
              className="sarjan-mobile-app-cms__item-card"
            >
              <div className="sarjan-mobile-app-cms__item-head">
                <strong>Slide {index + 1}</strong>
                <button
                  type="button"
                  className="tf-button style-2"
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      onboarding: {
                        ...c.onboarding,
                        slides: c.onboarding.slides.filter(
                          (s) => s.id !== slide.id,
                        ),
                      },
                    }))
                  }
                >
                  Remove
                </button>
              </div>
              <div className="sarjan-mobile-app-cms__grid">
                <fieldset className="sarjan-mobile-app-cms__field-full">
                  <label className="body-title mb-10">Title</label>
                  <input
                    className="form-control"
                    value={slide.title}
                    onChange={(e) =>
                      setConfig((c) => {
                        const slides = [...c.onboarding.slides];
                        slides[index] = {
                          ...slides[index],
                          title: e.target.value,
                        };
                        return {
                          ...c,
                          onboarding: { ...c.onboarding, slides },
                        };
                      })
                    }
                  />
                </fieldset>
                <fieldset className="sarjan-mobile-app-cms__field-full">
                  <label className="body-title mb-10">Subtitle</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={slide.subtitle}
                    onChange={(e) =>
                      setConfig((c) => {
                        const slides = [...c.onboarding.slides];
                        slides[index] = {
                          ...slides[index],
                          subtitle: e.target.value,
                        };
                        return {
                          ...c,
                          onboarding: { ...c.onboarding, slides },
                        };
                      })
                    }
                  />
                </fieldset>
                <fieldset>
                  <label className="body-title mb-10">Icon</label>
                  <input
                    className="form-control"
                    placeholder="sparkles, tag, cart, truck, shield, star"
                    value={slide.icon ?? ""}
                    onChange={(e) =>
                      setConfig((c) => {
                        const slides = [...c.onboarding.slides];
                        slides[index] = {
                          ...slides[index],
                          icon: e.target.value,
                        };
                        return {
                          ...c,
                          onboarding: { ...c.onboarding, slides },
                        };
                      })
                    }
                  />
                </fieldset>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="tf-button style-2"
          onClick={() =>
            setConfig((c) => ({
              ...c,
              onboarding: {
                ...c.onboarding,
                slides: [
                  ...c.onboarding.slides,
                  {
                    id: `slide-${Date.now()}`,
                    title: "New slide",
                    subtitle: "Describe your wholesale experience.",
                    icon: "sparkles",
                    enabled: true,
                  },
                ],
              },
            }))
          }
        >
          + Add slide
        </button>
      </section>

      <section
        id="mobile-header"
        className="wg-box sarjan-mobile-app-cms__panel"
      >
        <div className="sarjan-mobile-app-cms__panel-head">
          <h5 className="mb-0">Home header</h5>
          <span className="body-text text-secondary">
            Maroon hero + search bar copy
          </span>
        </div>
        <div className="sarjan-mobile-app-cms__grid">
          <fieldset>
            <label className="body-title mb-10">Promo title</label>
            <input
              className="form-control"
              value={config.homeHeader.promoTitle}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  homeHeader: { ...c.homeHeader, promoTitle: e.target.value },
                }))
              }
            />
          </fieldset>
          <fieldset>
            <label className="body-title mb-10">Explore button label</label>
            <input
              className="form-control"
              value={config.homeHeader.exploreLabel}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  homeHeader: { ...c.homeHeader, exploreLabel: e.target.value },
                }))
              }
            />
          </fieldset>
          <fieldset className="sarjan-mobile-app-cms__field-full">
            <label className="body-title mb-10">Promo subtitle</label>
            <textarea
              className="form-control"
              rows={2}
              value={config.homeHeader.promoSubtitle}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  homeHeader: {
                    ...c.homeHeader,
                    promoSubtitle: e.target.value,
                  },
                }))
              }
            />
          </fieldset>
          <fieldset>
            <label className="body-title mb-10">Search placeholder</label>
            <input
              className="form-control"
              value={config.homeHeader.searchPlaceholder}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  homeHeader: {
                    ...c.homeHeader,
                    searchPlaceholder: e.target.value,
                  },
                }))
              }
            />
          </fieldset>
          <fieldset className="sarjan-mobile-app-cms__field-span">
            <label className="sarjan-mobile-app-cms__toggle">
              <input
                type="checkbox"
                checked={config.homeHeader.showVisualSearch}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    homeHeader: {
                      ...c.homeHeader,
                      showVisualSearch: e.target.checked,
                    },
                  }))
                }
              />
              <span>Show camera / photo search in header</span>
            </label>
          </fieldset>
        </div>
      </section>

      <AdminHomeAudiencesEditor
        audiences={config.homeAudiences ?? []}
        onChange={(homeAudiences) =>
          setConfig((c) => ({ ...c, homeAudiences }))
        }
      />

      <section
        id="mobile-sections"
        className="wg-box sarjan-mobile-app-cms__panel"
      >
        <div className="sarjan-mobile-app-cms__panel-head">
          <h5 className="mb-0">Home sections</h5>
          <span className="body-text text-secondary">
            Reorder, toggle visibility, or add Offer / Deal countdown blocks
          </span>
        </div>

        <div className="sarjan-mobile-app-cms__stack">
          {config.homeSections.map((section, index) => (
            <article
              key={section.id}
              className="sarjan-mobile-app-cms__item-card"
            >
              <div className="sarjan-mobile-app-cms__item-head">
                <strong>
                  {mobileHomeSectionOptions.find((o) => o.type === section.type)
                    ?.label ?? section.type}
                </strong>
                <div className="sarjan-mobile-app-cms__item-actions">
                  <button
                    type="button"
                    className="sarjan-mobile-app-cms__icon-btn"
                    onClick={() => moveSection(index, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="sarjan-mobile-app-cms__icon-btn"
                    onClick={() => moveSection(index, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <label className="sarjan-mobile-app-cms__toggle sarjan-mobile-app-cms__toggle--compact">
                    <input
                      type="checkbox"
                      checked={section.enabled}
                      onChange={(e) =>
                        setConfig((c) => {
                          const homeSections = [...c.homeSections];
                          homeSections[index] = {
                            ...homeSections[index],
                            enabled: e.target.checked,
                          };
                          return { ...c, homeSections };
                        })
                      }
                    />
                    <span>On</span>
                  </label>
                  <button
                    type="button"
                    className="tf-button style-2"
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        homeSections: c.homeSections.filter(
                          (s) => s.id !== section.id,
                        ),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="sarjan-mobile-app-cms__grid">
                <fieldset>
                  <label className="body-title mb-10">Section title</label>
                  <input
                    className="form-control"
                    placeholder="Optional"
                    value={section.title ?? ""}
                    onChange={(e) =>
                      setConfig((c) => {
                        const homeSections = [...c.homeSections];
                        homeSections[index] = {
                          ...homeSections[index],
                          title: e.target.value,
                        };
                        return { ...c, homeSections };
                      })
                    }
                  />
                </fieldset>
                <fieldset>
                  <label className="body-title mb-10">Section subtitle</label>
                  <input
                    className="form-control"
                    placeholder="Optional"
                    value={section.subtitle ?? ""}
                    onChange={(e) =>
                      setConfig((c) => {
                        const homeSections = [...c.homeSections];
                        homeSections[index] = {
                          ...homeSections[index],
                          subtitle: e.target.value,
                        };
                        return { ...c, homeSections };
                      })
                    }
                  />
                </fieldset>

                {(section.type === "offer" ||
                  section.type === "dealEnds" ||
                  section.type === "custom") && (
                  <>
                    <fieldset className="sarjan-mobile-app-cms__field-full">
                      <label className="body-title mb-10">
                        Body / offer text
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={section.body ?? ""}
                        onChange={(e) =>
                          setConfig((c) => {
                            const homeSections = [...c.homeSections];
                            homeSections[index] = {
                              ...homeSections[index],
                              body: e.target.value,
                            };
                            return { ...c, homeSections };
                          })
                        }
                      />
                    </fieldset>
                    <fieldset>
                      <label className="body-title mb-10">Image URL</label>
                      <input
                        className="form-control"
                        value={section.image ?? ""}
                        onChange={(e) =>
                          setConfig((c) => {
                            const homeSections = [...c.homeSections];
                            homeSections[index] = {
                              ...homeSections[index],
                              image: e.target.value,
                            };
                            return { ...c, homeSections };
                          })
                        }
                      />
                    </fieldset>
                    <fieldset>
                      <label className="body-title mb-10">CTA label</label>
                      <input
                        className="form-control"
                        value={section.ctaLabel ?? ""}
                        onChange={(e) =>
                          setConfig((c) => {
                            const homeSections = [...c.homeSections];
                            homeSections[index] = {
                              ...homeSections[index],
                              ctaLabel: e.target.value,
                            };
                            return { ...c, homeSections };
                          })
                        }
                      />
                    </fieldset>
                    <fieldset className="sarjan-mobile-app-cms__field-full">
                      <label className="body-title mb-10">CTA target</label>
                      <input
                        className="form-control"
                        placeholder="Category name or product slug"
                        value={section.ctaTarget ?? ""}
                        onChange={(e) =>
                          setConfig((c) => {
                            const homeSections = [...c.homeSections];
                            homeSections[index] = {
                              ...homeSections[index],
                              ctaTarget: e.target.value,
                            };
                            return { ...c, homeSections };
                          })
                        }
                      />
                    </fieldset>
                  </>
                )}

                {section.type === "dealEnds" ? (
                  <fieldset className="sarjan-mobile-app-cms__field-full">
                    <label className="body-title mb-10">End date & time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={
                        section.endDate ? section.endDate.slice(0, 16) : ""
                      }
                      onChange={(e) =>
                        setConfig((c) => {
                          const homeSections = [...c.homeSections];
                          homeSections[index] = {
                            ...homeSections[index],
                            endDate: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : "",
                          };
                          return { ...c, homeSections };
                        })
                      }
                    />
                  </fieldset>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="sarjan-mobile-app-cms__chip-row">
          {(
            ["offer", "dealEnds", "custom", "marquee", "highlights"] as const
          ).map((type) => (
            <button
              key={type}
              type="button"
              className="tf-button style-2"
              onClick={() =>
                setConfig((c) => ({
                  ...c,
                  homeSections: [...c.homeSections, newSection(type)],
                }))
              }
            >
              +{" "}
              {mobileHomeSectionOptions.find((o) => o.type === type)?.label ??
                type}
            </button>
          ))}
        </div>
      </section>

      <section
        id="mobile-app-icon"
        className="wg-box sarjan-mobile-app-cms__panel"
      >
        <div className="sarjan-mobile-app-cms__panel-head sarjan-mobile-app-cms__panel-head--split">
          <div>
            <h5 className="mb-0">Dynamic app icon</h5>
            <span className="body-text text-secondary">
              Remote campaign icons override festival and role icons
              automatically
            </span>
          </div>
          <label className="sarjan-mobile-app-cms__toggle">
            <input
              type="checkbox"
              checked={config.appIcon?.enabled !== false}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  appIcon: {
                    ...c.appIcon,
                    enabled: e.target.checked,
                    enablePremiumIcon: c.appIcon?.enablePremiumIcon !== false,
                    enableDealerIcon: c.appIcon?.enableDealerIcon !== false,
                    campaigns: c.appIcon?.campaigns ?? [],
                    festivalOverrides: c.appIcon?.festivalOverrides ?? [],
                  },
                }))
              }
            />
            Enabled
          </label>
        </div>

        <div className="sarjan-mobile-app-cms__grid">
          <fieldset>
            <label className="sarjan-mobile-app-cms__toggle">
              <input
                type="checkbox"
                checked={config.appIcon?.enablePremiumIcon !== false}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    appIcon: {
                      enabled: c.appIcon?.enabled !== false,
                      enablePremiumIcon: e.target.checked,
                      enableDealerIcon: c.appIcon?.enableDealerIcon !== false,
                      campaigns: c.appIcon?.campaigns ?? [],
                      festivalOverrides: c.appIcon?.festivalOverrides ?? [],
                    },
                  }))
                }
              />
              Premium user icon
            </label>
          </fieldset>
          <fieldset>
            <label className="sarjan-mobile-app-cms__toggle">
              <input
                type="checkbox"
                checked={config.appIcon?.enableDealerIcon !== false}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    appIcon: {
                      enabled: c.appIcon?.enabled !== false,
                      enablePremiumIcon: c.appIcon?.enablePremiumIcon !== false,
                      enableDealerIcon: e.target.checked,
                      campaigns: c.appIcon?.campaigns ?? [],
                      festivalOverrides: c.appIcon?.festivalOverrides ?? [],
                    },
                  }))
                }
              />
              Dealer icon
            </label>
          </fieldset>
        </div>

        <div className="sarjan-mobile-app-cms__panel-head sarjan-mobile-app-cms__panel-head--split">
          <div>
            <h6 className="mb-0">Marketing campaigns</h6>
            <span className="body-text text-secondary">
              Priority: campaign → festival → premium → dealer → default
            </span>
          </div>
          <button
            type="button"
            className="tf-button style-2"
            onClick={() =>
              setConfig((c) => ({
                ...c,
                appIcon: {
                  enabled: c.appIcon?.enabled !== false,
                  enablePremiumIcon: c.appIcon?.enablePremiumIcon !== false,
                  enableDealerIcon: c.appIcon?.enableDealerIcon !== false,
                  campaigns: [
                    ...(c.appIcon?.campaigns ?? []),
                    newCampaignIcon(),
                  ],
                  festivalOverrides: c.appIcon?.festivalOverrides ?? [],
                },
              }))
            }
          >
            + Add campaign
          </button>
        </div>

        <div className="sarjan-mobile-app-cms__stack">
          {(config.appIcon?.campaigns ?? []).map((campaign, index) => (
            <article
              key={campaign.id}
              className="sarjan-mobile-app-cms__item-card"
            >
              <div className="sarjan-mobile-app-cms__item-head">
                <strong>{campaign.label || `Campaign ${index + 1}`}</strong>
                <div className="sarjan-mobile-app-cms__item-actions">
                  <button
                    type="button"
                    className="sarjan-mobile-app-cms__icon-btn"
                    aria-label="Remove campaign"
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        appIcon: {
                          enabled: c.appIcon?.enabled !== false,
                          enablePremiumIcon:
                            c.appIcon?.enablePremiumIcon !== false,
                          enableDealerIcon:
                            c.appIcon?.enableDealerIcon !== false,
                          campaigns: (c.appIcon?.campaigns ?? []).filter(
                            (item) => item.id !== campaign.id,
                          ),
                          festivalOverrides: c.appIcon?.festivalOverrides ?? [],
                        },
                      }))
                    }
                  >
                    ×
                  </button>
                  <label className="sarjan-mobile-app-cms__toggle sarjan-mobile-app-cms__toggle--compact">
                    <input
                      type="checkbox"
                      checked={campaign.enabled !== false}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          appIcon: {
                            enabled: c.appIcon?.enabled !== false,
                            enablePremiumIcon:
                              c.appIcon?.enablePremiumIcon !== false,
                            enableDealerIcon:
                              c.appIcon?.enableDealerIcon !== false,
                            campaigns: (c.appIcon?.campaigns ?? []).map(
                              (item) =>
                                item.id === campaign.id
                                  ? { ...item, enabled: e.target.checked }
                                  : item,
                            ),
                            festivalOverrides:
                              c.appIcon?.festivalOverrides ?? [],
                          },
                        }))
                      }
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="sarjan-mobile-app-cms__grid">
                <fieldset>
                  <label className="body-title mb-10">Label</label>
                  <input
                    className="form-control"
                    value={campaign.label ?? ""}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        appIcon: {
                          enabled: c.appIcon?.enabled !== false,
                          enablePremiumIcon:
                            c.appIcon?.enablePremiumIcon !== false,
                          enableDealerIcon:
                            c.appIcon?.enableDealerIcon !== false,
                          campaigns: (c.appIcon?.campaigns ?? []).map((item) =>
                            item.id === campaign.id
                              ? { ...item, label: e.target.value }
                              : item,
                          ),
                          festivalOverrides: c.appIcon?.festivalOverrides ?? [],
                        },
                      }))
                    }
                  />
                </fieldset>
                <fieldset>
                  <label className="body-title mb-10">Icon type</label>
                  <select
                    className="form-control"
                    value={campaign.iconId}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        appIcon: {
                          enabled: c.appIcon?.enabled !== false,
                          enablePremiumIcon:
                            c.appIcon?.enablePremiumIcon !== false,
                          enableDealerIcon:
                            c.appIcon?.enableDealerIcon !== false,
                          campaigns: (c.appIcon?.campaigns ?? []).map((item) =>
                            item.id === campaign.id
                              ? { ...item, iconId: e.target.value }
                              : item,
                          ),
                          festivalOverrides: c.appIcon?.festivalOverrides ?? [],
                        },
                      }))
                    }
                  >
                    {mobileAppIconOptions
                      .filter((option) => option.id !== "default")
                      .map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </fieldset>
                <fieldset>
                  <label className="body-title mb-10">Start date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={campaign.startAt}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        appIcon: {
                          enabled: c.appIcon?.enabled !== false,
                          enablePremiumIcon:
                            c.appIcon?.enablePremiumIcon !== false,
                          enableDealerIcon:
                            c.appIcon?.enableDealerIcon !== false,
                          campaigns: (c.appIcon?.campaigns ?? []).map((item) =>
                            item.id === campaign.id
                              ? { ...item, startAt: e.target.value }
                              : item,
                          ),
                          festivalOverrides: c.appIcon?.festivalOverrides ?? [],
                        },
                      }))
                    }
                  />
                </fieldset>
                <fieldset>
                  <label className="body-title mb-10">End date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={campaign.endAt}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        appIcon: {
                          enabled: c.appIcon?.enabled !== false,
                          enablePremiumIcon:
                            c.appIcon?.enablePremiumIcon !== false,
                          enableDealerIcon:
                            c.appIcon?.enableDealerIcon !== false,
                          campaigns: (c.appIcon?.campaigns ?? []).map((item) =>
                            item.id === campaign.id
                              ? { ...item, endAt: e.target.value }
                              : item,
                          ),
                          festivalOverrides: c.appIcon?.festivalOverrides ?? [],
                        },
                      }))
                    }
                  />
                </fieldset>
                <fieldset>
                  <label className="body-title mb-10">Priority</label>
                  <input
                    type="number"
                    className="form-control"
                    value={campaign.priority ?? 0}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        appIcon: {
                          enabled: c.appIcon?.enabled !== false,
                          enablePremiumIcon:
                            c.appIcon?.enablePremiumIcon !== false,
                          enableDealerIcon:
                            c.appIcon?.enableDealerIcon !== false,
                          campaigns: (c.appIcon?.campaigns ?? []).map((item) =>
                            item.id === campaign.id
                              ? {
                                  ...item,
                                  priority: Number(e.target.value) || 0,
                                }
                              : item,
                          ),
                          festivalOverrides: c.appIcon?.festivalOverrides ?? [],
                        },
                      }))
                    }
                  />
                </fieldset>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="mobile-support"
        className="wg-box sarjan-mobile-app-cms__panel"
      >
        <div className="sarjan-mobile-app-cms__panel-head">
          <h5 className="mb-0">Support & footer</h5>
          <span className="body-text text-secondary">
            Contact details shown in the app
          </span>
        </div>
        <div className="sarjan-mobile-app-cms__grid">
          <fieldset>
            <label className="body-title mb-10">Phone</label>
            <input
              className="form-control"
              value={config.support.phone}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  support: { ...c.support, phone: e.target.value },
                }))
              }
            />
          </fieldset>
          <fieldset>
            <label className="body-title mb-10">Email</label>
            <input
              className="form-control"
              value={config.support.email}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  support: { ...c.support, email: e.target.value },
                }))
              }
            />
          </fieldset>
          <fieldset>
            <label className="body-title mb-10">WhatsApp</label>
            <input
              className="form-control"
              placeholder="Digits with country code"
              value={config.support.whatsapp}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  support: { ...c.support, whatsapp: e.target.value },
                }))
              }
            />
          </fieldset>
          <fieldset className="sarjan-mobile-app-cms__field-full">
            <label className="body-title mb-10">Footer credit line</label>
            <input
              className="form-control"
              value={config.footerCredit}
              onChange={(e) =>
                setConfig((c) => ({ ...c, footerCredit: e.target.value }))
              }
            />
          </fieldset>
        </div>
      </section>

      <div className="sarjan-mobile-app-cms__footer-bar">
        <span className="body-text text-secondary">
          Changes apply when users reopen the app or pull to refresh on home.
        </span>
        <button
          type="submit"
          className="tf-button text-btn-uppercase"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save mobile app"}
        </button>
      </div>
    </form>
  );
}
