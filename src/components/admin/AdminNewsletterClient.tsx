"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmojiTextarea } from "@/components/shared/EmojiTextarea";
import { LAUNCH_NEWSLETTER_TEMPLATE_ID } from "@/lib/launch-newsletter-constants";
import type {
  NewsletterCampaignLog,
  NewsletterSubscriber,
} from "@/lib/newsletter-store";
import type { NewsletterTemplateMeta } from "@/lib/newsletter-templates";

type Stats = { total: number; active: number; unsubscribed: number };

type LaunchAutoSend = {
  atLabel: string;
  pending: boolean;
  alreadySent: boolean;
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function fieldDefaults(template: NewsletterTemplateMeta | null) {
  if (!template) return {};
  return template.fields.reduce<Record<string, string>>((acc, f) => {
    acc[f.key] = f.defaultValue;
    return acc;
  }, {});
}

export function AdminNewsletterClient({
  initialStats,
  initialSubscribers,
  initialCampaigns,
  initialTemplates,
  launchAutoSend = null,
}: {
  initialStats: Stats;
  initialSubscribers: NewsletterSubscriber[];
  initialCampaigns: NewsletterCampaignLog[];
  initialTemplates: NewsletterTemplateMeta[];
  launchAutoSend?: LaunchAutoSend | null;
}) {
  const [stats, setStats] = useState(initialStats);
  const [subscribers] = useState(initialSubscribers);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [templates] = useState(initialTemplates);

  const defaultTemplateId =
    initialTemplates.find((t) => t.id === LAUNCH_NEWSLETTER_TEMPLATE_ID)?.id ??
    initialTemplates[0]?.id ??
    "classic-announcement";
  const defaultTemplate =
    initialTemplates.find((t) => t.id === defaultTemplateId) ?? null;

  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  );

  const [subject, setSubject] = useState(
    defaultTemplate?.defaultSubject ?? "News from Sarjan Textiles",
  );
  const [fields, setFields] = useState<Record<string, string>>(() =>
    fieldDefaults(defaultTemplate),
  );
  const [previewHtml, setPreviewHtml] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [subQuery, setSubQuery] = useState("");
  const [subFilter, setSubFilter] = useState<"all" | "active" | "unsubscribed">(
    "all",
  );
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const applyTemplate = useCallback(
    (id: string) => {
      const t = templates.find((x) => x.id === id);
      if (!t) return;
      setTemplateId(id);
      setSubject(t.defaultSubject);
      setFields(fieldDefaults(t));
      setPreviewHtml("");
    },
    [templates],
  );

  const filteredSubscribers = useMemo(() => {
    const q = subQuery.trim().toLowerCase();
    return subscribers.filter((s) => {
      const okStatus = subFilter === "all" || s.status === subFilter;
      const okQ =
        !q || s.email.includes(q) || s.source.toLowerCase().includes(q);
      return okStatus && okQ;
    });
  }, [subscribers, subQuery, subFilter]);

  const templatesByCategory = useMemo(() => {
    const map = new Map<string, NewsletterTemplateMeta[]>();
    for (const t of templates) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return [...map.entries()];
  }, [templates]);

  const updateField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const loadPreview = async () => {
    setBusy("preview");
    setNotice(null);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          templateId,
          subject,
          fields,
        }),
      });
      const data = (await res.json()) as { error?: string; html?: string };
      if (!res.ok) {
        setNotice({ kind: "err", text: data.error ?? "Preview failed" });
        return;
      }
      setPreviewHtml(data.html ?? "");
    } catch {
      setNotice({ kind: "err", text: "Network error" });
    } finally {
      setBusy("");
    }
  };

  const sendTest = async () => {
    if (!testEmail.trim()) {
      setNotice({ kind: "err", text: "Enter a test email address" });
      return;
    }
    setBusy("test");
    setNotice(null);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-test",
          templateId,
          subject,
          fields,
          testEmail: testEmail.trim(),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        sentCount?: number;
        failedCount?: number;
      };
      if (!res.ok) {
        setNotice({ kind: "err", text: data.error ?? "Test send failed" });
        return;
      }
      setNotice({
        kind: "ok",
        text: `Test email sent to ${testEmail.trim()} (${data.sentCount ?? 0} ok, ${data.failedCount ?? 0} failed).`,
      });
    } catch {
      setNotice({ kind: "err", text: "Network error" });
    } finally {
      setBusy("");
    }
  };

  const sendToAll = async () => {
    if (stats.active < 1) {
      setNotice({
        kind: "err",
        text: "No active subscribers. Footer sign-ups are saved when users subscribe.",
      });
      return;
    }
    if (
      !window.confirm(
        `Send "${subject}" to ${stats.active} active subscriber(s)? Unsubscribed users are skipped automatically.`,
      )
    ) {
      return;
    }
    setBusy("send-all");
    setNotice(null);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-all",
          templateId,
          subject,
          fields,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        sentCount?: number;
        failedCount?: number;
        stats?: Stats;
        campaigns?: NewsletterCampaignLog[];
        failures?: Array<{ email: string; error: string }>;
      };
      if (!res.ok) {
        setNotice({ kind: "err", text: data.error ?? "Campaign failed" });
        return;
      }
      if (data.stats) setStats(data.stats);
      if (data.campaigns) setCampaigns(data.campaigns);
      const failNote =
        data.failures?.length && data.failures.length > 0
          ? ` ${data.failures.length} failed.`
          : "";
      setNotice({
        kind: "ok",
        text: `Campaign sent: ${data.sentCount ?? 0} delivered, ${data.failedCount ?? 0} failed.${failNote}`,
      });
    } catch {
      setNotice({ kind: "err", text: "Network error" });
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadPreview();
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced preview on editor change
  }, [templateId, subject, fields]);

  return (
    <div className="sarjan-admin-newsletter">
      {launchAutoSend ? (
        <div className="wg-box mb-4 sarjan-admin-newsletter-launch-banner">
          <h5 className="mb-2">Automatic launch email</h5>
          {launchAutoSend.alreadySent ? (
            <p className="mb-0 text-success">
              <strong>Website launch</strong> template was sent to all active
              subscribers. Check campaign history below.
            </p>
          ) : launchAutoSend.pending ? (
            <p className="mb-0">
              At <strong>{launchAutoSend.atLabel}</strong>, the cron job sends
              the <strong>Website launch</strong> template to every active
              subscriber (launch page, inquiry, and registration signups). No
              manual send needed — you can preview or test that template below.
            </p>
          ) : (
            <p className="mb-0 text-muted">
              Go-live time has passed. If the automatic send did not run, choose{" "}
              <strong>Website launch</strong> below and send manually once.
            </p>
          )}
        </div>
      ) : null}

      {notice ? (
        <p
          className={
            notice.kind === "ok" ? "text-success mb-3" : "text-danger mb-3"
          }
        >
          {notice.text}
        </p>
      ) : null}

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="wg-box">
            <h6 className="mb-1">Total subscribers</h6>
            <p className="display-6 mb-0">{stats.total}</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="wg-box">
            <h6 className="mb-1 text-success">Active</h6>
            <p className="display-6 mb-0">{stats.active}</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="wg-box">
            <h6 className="mb-1 text-secondary">Unsubscribed</h6>
            <p className="display-6 mb-0">{stats.unsubscribed}</p>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-xl-5">
          <div className="wg-box sarjan-admin-newsletter-editor">
            <h5 className="mb-3">Compose campaign</h5>

            <label className="form-label" htmlFor="newsletter-subject">
              Email subject
            </label>
            <input
              id="newsletter-subject"
              className="form-control sarjan-admin-newsletter-subject mb-3"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />

            <label className="form-label">Template</label>
            <div className="sarjan-admin-newsletter-templates mb-3">
              {templatesByCategory.map(([category, items]) => (
                <div key={category} className="sarjan-admin-newsletter-cat">
                  <div className="sarjan-admin-newsletter-cat-title">
                    {category}
                  </div>
                  <div className="sarjan-admin-newsletter-template-grid">
                    {items.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={
                          t.id === templateId
                            ? "sarjan-admin-newsletter-tpl active"
                            : "sarjan-admin-newsletter-tpl"
                        }
                        onClick={() => applyTemplate(t.id)}
                      >
                        <strong>{t.name}</strong>
                        <span>{t.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedTemplate?.fields.map((field) => (
              <div key={field.key} className="mb-3">
                <label className="form-label">
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                {field.type === "textarea" ? (
                  <EmojiTextarea
                    className="form-control"
                    rows={5}
                    value={fields[field.key] ?? ""}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    className="form-control"
                    type={field.type === "url" ? "url" : "text"}
                    value={fields[field.key] ?? ""}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}

            <div className="sarjan-admin-newsletter-actions">
              <button
                type="button"
                className="tf-button style-1"
                disabled={busy !== ""}
                onClick={() => void loadPreview()}
              >
                Refresh preview
              </button>
              <input
                className="form-control sarjan-admin-newsletter-test-input"
                type="email"
                placeholder="Test email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <button
                type="button"
                className="tf-button style-2"
                disabled={busy !== ""}
                onClick={() => void sendTest()}
              >
                Send test
              </button>
              <button
                type="button"
                className="tf-button"
                disabled={busy !== "" || stats.active < 1}
                onClick={() => void sendToAll()}
              >
                Send to all active ({stats.active})
              </button>
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="wg-box sarjan-admin-newsletter-preview-wrap">
            <h5 className="mb-3">Live preview</h5>
            {previewHtml ? (
              <iframe
                title="Newsletter preview"
                className="sarjan-admin-newsletter-preview-frame"
                srcDoc={previewHtml}
                sandbox=""
              />
            ) : (
              <p className="text-muted">Loading preview…</p>
            )}
          </div>
        </div>
      </div>

      <div className="wg-box mt-4">
        <h5 className="mb-3">Recent campaigns</h5>
        {campaigns.length === 0 ? (
          <p className="text-muted mb-0">No campaigns sent yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Template</th>
                  <th>Recipients</th>
                  <th>Sent</th>
                  <th>Failed</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>{formatDate(c.createdAt)}</td>
                    <td>{c.subject}</td>
                    <td>
                      <code>{c.templateId}</code>
                    </td>
                    <td>{c.recipientCount}</td>
                    <td>{c.sentCount}</td>
                    <td>{c.failedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="wg-box mt-4 sarjan-admin-newsletter-subs">
        <div className="sarjan-admin-newsletter-subs-toolbar">
          <h5 className="sarjan-admin-newsletter-subs-title">Subscribers</h5>
          <div className="sarjan-admin-newsletter-subs-controls">
            <input
              className="form-control sarjan-admin-newsletter-subs-search"
              placeholder="Search email or source…"
              value={subQuery}
              onChange={(e) => setSubQuery(e.target.value)}
              spellCheck={false}
            />
            <select
              className="form-select sarjan-admin-newsletter-subs-filter"
              value={subFilter}
              onChange={(e) =>
                setSubFilter(
                  e.target.value as "all" | "active" | "unsubscribed",
                )
              }
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>
        </div>
        <div className="table-responsive mt-3">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Source</th>
                <th>Subscribed</th>
                <th>Unsubscribed</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-muted">
                    No subscribers match this filter.
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((s) => (
                  <tr key={s.id}>
                    <td>{s.email}</td>
                    <td>
                      <span
                        className={
                          s.status === "active"
                            ? "badge bg-success"
                            : "badge bg-secondary"
                        }
                      >
                        {s.status}
                      </span>
                    </td>
                    <td>{s.source}</td>
                    <td>{formatDate(s.subscribedAt)}</td>
                    <td>
                      {s.unsubscribedAt ? formatDate(s.unsubscribedAt) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
