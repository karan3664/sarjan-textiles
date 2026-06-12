"use client";

import { FormEvent, useEffect, useState } from "react";
import type {
  PromotionAd,
  PromotionAnalyticsRow,
  PromotionAudience,
  PromotionPlacement,
} from "@/lib/promotions-cms";
import {
  promotionAudienceOptions,
  promotionPlacementOptions,
} from "@/lib/promotions-cms";

type PromotionRow = PromotionAd & {
  status: string;
  metrics?: PromotionAnalyticsRow;
};

function toLocalInput(iso: string) {
  try {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return "";
  }
}

function fromLocalInput(value: string) {
  if (!value.trim()) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

function emptyAd(): PromotionAd {
  const now = Date.now();
  return {
    id: `promo-${now}`,
    title: "",
    image: "",
    ctaLabel: "Shop now",
    ctaHref: "/products",
    placement: "web_home",
    audience: "all",
    startAt: new Date(now).toISOString(),
    endAt: new Date(now + 14 * 86400000).toISOString(),
    priority: 50,
    enabled: true,
  };
}

export function AdminPromotionsClient() {
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [analytics, setAnalytics] = useState<PromotionAnalyticsRow[]>([]);
  const [editing, setEditing] = useState<PromotionAd | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promotions");
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        promotions: PromotionRow[];
        analytics: PromotionAnalyticsRow[];
      };
      setPromotions(data.promotions ?? []);
      setAnalytics(data.analytics ?? []);
    } catch {
      setMessage("Could not load promotions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveAll = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promotions }),
      });
      if (!res.ok) throw new Error("save failed");
      setMessage("Promotions saved. Web and app pick up changes immediately.");
      await load();
    } catch {
      setMessage("Save failed. Check required fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveOne = async () => {
    if (!editing) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error("save failed");
      setEditing(null);
      setMessage("Promotion saved.");
      await load();
    } catch {
      setMessage("Could not save promotion.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this promotion?")) return;
    await fetch(`/api/admin/promotions?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setPromotions((current) => current.filter((ad) => ad.id !== id));
    setMessage("Promotion deleted.");
    await load();
  };

  const updateRow = (index: number, patch: Partial<PromotionAd>) => {
    setPromotions((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  return (
    <div className="form-products-create form-type-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb_24">
        <div>
          <h4 className="mb_4">Internal promotions</h4>
          <p className="text-secondary mb_0">
            Sarjan-owned banners with view/click analytics — no third-party ads.
          </p>
        </div>
        <button
          type="button"
          className="tf-btn btn-fill"
          onClick={() => setEditing(emptyAd())}
        >
          New promotion
        </button>
      </div>

      {message ? <p className="text-secondary mb_20">{message}</p> : null}

      {editing ? (
        <div className="sarjan-admin-card mb_30 p-4">
          <h5 className="mb_16">Edit promotion</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Title</label>
              <input
                className="form-control"
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Image URL</label>
              <input
                className="form-control"
                value={editing.image}
                onChange={(e) =>
                  setEditing({ ...editing, image: e.target.value })
                }
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">CTA label</label>
              <input
                className="form-control"
                value={editing.ctaLabel ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, ctaLabel: e.target.value })
                }
              />
            </div>
            <div className="col-md-8">
              <label className="form-label">CTA link</label>
              <input
                className="form-control"
                value={editing.ctaHref}
                onChange={(e) =>
                  setEditing({ ...editing, ctaHref: e.target.value })
                }
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Placement</label>
              <select
                className="form-select"
                value={editing.placement}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    placement: e.target.value as PromotionPlacement,
                  })
                }
              >
                {promotionPlacementOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Audience</label>
              <select
                className="form-select"
                value={editing.audience}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    audience: e.target.value as PromotionAudience,
                  })
                }
              >
                {promotionAudienceOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Priority</label>
              <input
                type="number"
                className="form-control"
                value={editing.priority}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    priority: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Start</label>
              <input
                type="datetime-local"
                className="form-control"
                value={toLocalInput(editing.startAt)}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    startAt: fromLocalInput(e.target.value),
                  })
                }
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">End</label>
              <input
                type="datetime-local"
                className="form-control"
                value={toLocalInput(editing.endAt)}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    endAt: fromLocalInput(e.target.value),
                  })
                }
              />
            </div>
            <div className="col-12">
              <label className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={editing.enabled}
                  onChange={(e) =>
                    setEditing({ ...editing, enabled: e.target.checked })
                  }
                />
                <span className="form-check-label">Enabled</span>
              </label>
            </div>
          </div>
          <div className="d-flex gap-2 mt_20">
            <button
              type="button"
              className="tf-btn btn-fill"
              disabled={saving}
              onClick={() => void saveOne()}
            >
              {saving ? "Saving…" : "Save promotion"}
            </button>
            <button
              type="button"
              className="tf-btn btn-line"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={saveAll}>
        {loading ? (
          <p className="text-secondary">Loading…</p>
        ) : promotions.length ? (
          <div className="table-responsive mb_30">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Placement</th>
                  <th>Audience</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th>Enabled</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {promotions.map((ad, index) => (
                  <tr key={ad.id}>
                    <td>{ad.title}</td>
                    <td>{ad.placement}</td>
                    <td>{ad.audience}</td>
                    <td>{ad.status}</td>
                    <td>{ad.metrics?.views ?? 0}</td>
                    <td>{ad.metrics?.clicks ?? 0}</td>
                    <td>{ad.metrics?.ctr ?? 0}%</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={ad.enabled}
                        onChange={(e) =>
                          updateRow(index, { enabled: e.target.checked })
                        }
                      />
                    </td>
                    <td className="text-nowrap">
                      <button
                        type="button"
                        className="btn btn-link p-0 me-2"
                        onClick={() => setEditing(ad)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-link p-0 text-danger"
                        onClick={() => void remove(ad.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-secondary mb_30">
            No promotions yet. Create one to show on the homepage or categories.
          </p>
        )}

        {promotions.length ? (
          <button type="submit" className="tf-btn btn-fill" disabled={saving}>
            {saving ? "Saving…" : "Save all changes"}
          </button>
        ) : null}
      </form>

      {analytics.length ? (
        <div className="mt_40">
          <h5 className="mb_16">Analytics summary</h5>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Placement</th>
                  <th>Views</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th>Last event</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((row) => (
                  <tr key={row.adId}>
                    <td>{row.title}</td>
                    <td>{row.placement}</td>
                    <td>{row.views}</td>
                    <td>{row.clicks}</td>
                    <td>{row.ctr}%</td>
                    <td>
                      {row.lastEventAt
                        ? new Date(row.lastEventAt).toLocaleString("en-IN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
