"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { MobileAppConfig } from "@/lib/mobile-app-cms";
import {
  flattenMobileAppForAdmin,
  mobileAppIconOptions,
} from "@/lib/mobile-app-cms";
import {
  computeCampaignStatus,
  mobileBrandingAnimationOptions,
  mobileBrandingCampaignTypeOptions,
  type MobileBrandingAnalyticsRow,
  type MobileBrandingCampaign,
  type MobileBrandingCampaignStatus,
} from "@/lib/mobile-branding-cms";

type Props = {
  initialMobileApp: MobileAppConfig;
};

function statusBadge(status: MobileBrandingCampaignStatus) {
  return status;
}

export function AdminMobileBrandingClient({ initialMobileApp }: Props) {
  const [mobileApp, setMobileApp] = useState(initialMobileApp);
  const [openId, setOpenId] = useState<string | null>(
    initialMobileApp.branding?.campaigns[0]?.id ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [analytics, setAnalytics] = useState<MobileBrandingAnalyticsRow[]>([]);

  const branding = mobileApp.branding ?? { enabled: true, campaigns: [] };

  const campaigns = useMemo(
    () =>
      branding.campaigns.map((campaign) => ({
        ...campaign,
        status: computeCampaignStatus(campaign),
      })),
    [branding.campaigns],
  );

  useEffect(() => {
    void fetch("/api/admin/mobile-branding/analytics")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.rows) {
          setAnalytics(data.rows as MobileBrandingAnalyticsRow[]);
        }
      })
      .catch(() => null);
  }, [saving]);

  const updateCampaign = (
    index: number,
    patch: Partial<MobileBrandingCampaign>,
  ) => {
    const next = [...branding.campaigns];
    next[index] = { ...next[index], ...patch };
    setMobileApp((current) => ({
      ...current,
      branding: { ...branding, campaigns: next },
    }));
  };

  const addCampaign = () => {
    const id = `campaign-${Date.now()}`;
    const next: MobileBrandingCampaign = {
      id,
      enabled: false,
      campaignName: "New campaign",
      campaignType: "marketing",
      animationTemplate: "default",
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      priority: 50,
      splashAnimationEnabled: true,
      dynamicIconEnabled: true,
      themeEnabled: true,
      ctaEnabled: false,
      status: "draft",
      iconId: "default",
      durationMs: 2000,
      skipAfterMs: 1000,
      themePrimary: "#0A0A0A",
      themeAccent: "#C89B3C",
    };
    setMobileApp((current) => ({
      ...current,
      branding: {
        ...branding,
        campaigns: [...branding.campaigns, next],
      },
    }));
    setOpenId(id);
  };

  const removeCampaign = (index: number) => {
    const next = branding.campaigns.filter((_, i) => i !== index);
    setMobileApp((current) => ({
      ...current,
      branding: { ...branding, campaigns: next },
    }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileApp }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as {
        mobileApp: Parameters<typeof flattenMobileAppForAdmin>[0];
      };
      setMobileApp(flattenMobileAppForAdmin(data.mobileApp));
      setMessage(
        "Saved. App picks up campaigns on next open — no app update required.",
      );
    } catch {
      setMessage("Save failed. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="form-products-create form-type-2 sarjan-mobile-branding"
      onSubmit={save}
    >
      <div className="sarjan-mobile-app-cms__toolbar">
        <div className="sarjan-mobile-app-cms__toolbar-copy">
          <p className="body-text text-secondary mb-0">
            CMS-controlled splash animations, festival themes, sale campaigns,
            and dynamic app icons. Priority: marketing → festival → premium →
            dealer → default. Max splash 3s; skip allowed after 1s.
          </p>
        </div>
        <button
          type="submit"
          className="tf-button text-btn-uppercase"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save branding"}
        </button>
      </div>

      {message ? (
        <div className="sarjan-admin-message sarjan-mobile-app-cms__message">
          {message}
        </div>
      ) : null}

      <div className="sarjan-admin-card mb-24">
        <label className="d-flex align-items-center gap-12">
          <input
            type="checkbox"
            checked={branding.enabled}
            onChange={(event) =>
              setMobileApp((current) => ({
                ...current,
                branding: { ...branding, enabled: event.target.checked },
              }))
            }
          />
          <span className="body-title mb-0">Mobile branding enabled</span>
        </label>
      </div>

      <div className="sarjan-banner-slides">
        <div className="sarjan-banner-slides-intro">
          <button
            type="button"
            className="tf-button style-1"
            onClick={addCampaign}
          >
            Add campaign
          </button>
          <p className="text-caption-1 text-secondary mb-0">
            Set status to Active + date window. Higher priority wins when
            multiple campaigns overlap.
          </p>
        </div>

        <div className="sarjan-banner-slide-list">
          {campaigns.map((campaign, index) => {
            const isOpen = openId === campaign.id;
            return (
              <article
                key={campaign.id}
                className={`sarjan-banner-slide-card${isOpen ? " is-open" : ""}`}
              >
                <button
                  type="button"
                  className="sarjan-banner-slide-summary"
                  onClick={() => setOpenId(isOpen ? null : campaign.id)}
                >
                  <div className="sarjan-banner-slide-summary-copy">
                    <strong>{campaign.campaignName}</strong>
                    <span>
                      {campaign.campaignType} · {statusBadge(campaign.status)} ·
                      P{campaign.priority}
                    </span>
                  </div>
                  <span className="sarjan-banner-slide-chevron">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="sarjan-banner-slide-body">
                    <div className="sarjan-banner-slide-actions">
                      <button
                        type="button"
                        className="tf-button style-3"
                        onClick={() => removeCampaign(index)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="sarjan-banner-slide-fields">
                      <div className="sarjan-banner-field-grid">
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            Campaign name
                          </span>
                          <input
                            className="form-control"
                            value={campaign.campaignName}
                            onChange={(event) =>
                              updateCampaign(index, {
                                campaignName: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            Status
                          </span>
                          <select
                            className="form-control"
                            value={campaign.status}
                            onChange={(event) =>
                              updateCampaign(index, {
                                status: event.target
                                  .value as MobileBrandingCampaignStatus,
                              })
                            }
                          >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="expired">Expired</option>
                          </select>
                        </div>
                      </div>

                      <div className="sarjan-banner-field-grid">
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            Campaign type
                          </span>
                          <select
                            className="form-control"
                            value={campaign.campaignType}
                            onChange={(event) =>
                              updateCampaign(index, {
                                campaignType: event.target
                                  .value as MobileBrandingCampaign["campaignType"],
                              })
                            }
                          >
                            {mobileBrandingCampaignTypeOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            Animation
                          </span>
                          <select
                            className="form-control"
                            value={campaign.animationTemplate}
                            onChange={(event) => {
                              const template = event.target
                                .value as MobileBrandingCampaign["animationTemplate"];
                              const preset =
                                mobileBrandingAnimationOptions.find(
                                  (item) => item.id === template,
                                );
                              updateCampaign(index, {
                                animationTemplate: template,
                                iconId:
                                  preset?.defaultIconId ?? campaign.iconId,
                              });
                            }}
                          >
                            {mobileBrandingAnimationOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="sarjan-banner-field-grid">
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            Start
                          </span>
                          <input
                            type="datetime-local"
                            className="form-control"
                            value={campaign.startAt.slice(0, 16)}
                            onChange={(event) =>
                              updateCampaign(index, {
                                startAt: new Date(
                                  event.target.value,
                                ).toISOString(),
                              })
                            }
                          />
                        </div>
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">End</span>
                          <input
                            type="datetime-local"
                            className="form-control"
                            value={campaign.endAt.slice(0, 16)}
                            onChange={(event) =>
                              updateCampaign(index, {
                                endAt: new Date(
                                  event.target.value,
                                ).toISOString(),
                              })
                            }
                          />
                        </div>
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            Priority
                          </span>
                          <input
                            type="number"
                            className="form-control"
                            value={campaign.priority}
                            onChange={(event) =>
                              updateCampaign(index, {
                                priority: Number(event.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="sarjan-banner-field-grid">
                        <label className="d-flex align-items-center gap-8">
                          <input
                            type="checkbox"
                            checked={campaign.enabled}
                            onChange={(event) =>
                              updateCampaign(index, {
                                enabled: event.target.checked,
                              })
                            }
                          />
                          Enabled
                        </label>
                        <label className="d-flex align-items-center gap-8">
                          <input
                            type="checkbox"
                            checked={campaign.splashAnimationEnabled}
                            onChange={(event) =>
                              updateCampaign(index, {
                                splashAnimationEnabled: event.target.checked,
                              })
                            }
                          />
                          Splash animation
                        </label>
                        <label className="d-flex align-items-center gap-8">
                          <input
                            type="checkbox"
                            checked={campaign.dynamicIconEnabled}
                            onChange={(event) =>
                              updateCampaign(index, {
                                dynamicIconEnabled: event.target.checked,
                              })
                            }
                          />
                          Dynamic icon
                        </label>
                        <label className="d-flex align-items-center gap-8">
                          <input
                            type="checkbox"
                            checked={campaign.themeEnabled}
                            onChange={(event) =>
                              updateCampaign(index, {
                                themeEnabled: event.target.checked,
                              })
                            }
                          />
                          Theme
                        </label>
                        <label className="d-flex align-items-center gap-8">
                          <input
                            type="checkbox"
                            checked={campaign.ctaEnabled}
                            onChange={(event) =>
                              updateCampaign(index, {
                                ctaEnabled: event.target.checked,
                              })
                            }
                          />
                          CTA
                        </label>
                      </div>

                      <div className="sarjan-banner-field-grid">
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            App icon
                          </span>
                          <select
                            className="form-control"
                            value={campaign.iconId ?? "default"}
                            onChange={(event) =>
                              updateCampaign(index, {
                                iconId: event.target.value,
                              })
                            }
                          >
                            {mobileAppIconOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            Duration (ms)
                          </span>
                          <input
                            type="number"
                            className="form-control"
                            min={800}
                            max={3000}
                            value={campaign.durationMs ?? 2000}
                            onChange={(event) =>
                              updateCampaign(index, {
                                durationMs: Math.min(
                                  3000,
                                  Math.max(
                                    800,
                                    Number(event.target.value) || 2000,
                                  ),
                                ),
                              })
                            }
                          />
                        </div>
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            Skip after (ms)
                          </span>
                          <input
                            type="number"
                            className="form-control"
                            min={500}
                            max={3000}
                            value={campaign.skipAfterMs ?? 1000}
                            onChange={(event) =>
                              updateCampaign(index, {
                                skipAfterMs: Math.min(
                                  3000,
                                  Math.max(
                                    500,
                                    Number(event.target.value) || 1000,
                                  ),
                                ),
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="sarjan-banner-field">
                        <span className="sarjan-banner-field-label">
                          Headline
                        </span>
                        <input
                          className="form-control"
                          value={campaign.headline ?? ""}
                          onChange={(event) =>
                            updateCampaign(index, {
                              headline: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="sarjan-banner-field">
                        <span className="sarjan-banner-field-label">
                          Subheadline
                        </span>
                        <input
                          className="form-control"
                          value={campaign.subheadline ?? ""}
                          onChange={(event) =>
                            updateCampaign(index, {
                              subheadline: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="sarjan-banner-field">
                        <span className="sarjan-banner-field-label">
                          Line 3
                        </span>
                        <input
                          className="form-control"
                          value={campaign.line3 ?? ""}
                          onChange={(event) =>
                            updateCampaign(index, { line3: event.target.value })
                          }
                        />
                      </div>
                      <div className="sarjan-banner-field-grid">
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            CTA label
                          </span>
                          <input
                            className="form-control"
                            value={campaign.ctaLabel ?? ""}
                            onChange={(event) =>
                              updateCampaign(index, {
                                ctaLabel: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            CTA link
                          </span>
                          <input
                            className="form-control"
                            value={campaign.ctaHref ?? ""}
                            onChange={(event) =>
                              updateCampaign(index, {
                                ctaHref: event.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="sarjan-banner-field-grid">
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            Theme primary
                          </span>
                          <input
                            type="color"
                            className="form-control"
                            value={campaign.themePrimary ?? "#0A0A0A"}
                            onChange={(event) =>
                              updateCampaign(index, {
                                themePrimary: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="sarjan-banner-field">
                          <span className="sarjan-banner-field-label">
                            Theme accent
                          </span>
                          <input
                            type="color"
                            className="form-control"
                            value={campaign.themeAccent ?? "#C89B3C"}
                            onChange={(event) =>
                              updateCampaign(index, {
                                themeAccent: event.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      <div className="sarjan-admin-card mt-32">
        <h5 className="body-title mb-16">Campaign performance</h5>
        {analytics.length ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Views</th>
                  <th>Completed</th>
                  <th>Skipped</th>
                  <th>Completion %</th>
                  <th>Conversion %</th>
                  <th>Icon activations</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((row) => (
                  <tr key={row.campaignId}>
                    <td>{row.campaignName}</td>
                    <td>{row.views}</td>
                    <td>{row.completed}</td>
                    <td>{row.skipped}</td>
                    <td>{row.completionRate}%</td>
                    <td>{row.conversionRate}%</td>
                    <td>{row.iconActivations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-secondary mb-0">No splash analytics yet.</p>
        )}
      </div>
    </form>
  );
}
