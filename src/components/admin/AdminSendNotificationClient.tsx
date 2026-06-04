"use client";

import { useMemo, useState } from "react";

type ClientOption = {
  id: string;
  label: string;
};

const TYPE_OPTIONS = [
  { value: "offer", label: "Special offer" },
  { value: "collection", label: "New collection" },
  { value: "arrival", label: "New arrival / post" },
  { value: "general", label: "General update" },
] as const;

export function AdminSendNotificationClient({
  clients,
}: {
  clients: ClientOption[];
}) {
  const [audience, setAudience] = useState<"all" | "client">("all");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [type, setType] =
    useState<(typeof TYPE_OPTIONS)[number]["value"]>("offer");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.label.localeCompare(b.label)),
    [clients],
  );

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      setNotice({ kind: "err", text: "Title and message are required." });
      return;
    }
    if (audience === "client" && !clientId) {
      setNotice({ kind: "err", text: "Select a client." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/client-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          clientId: audience === "client" ? clientId : undefined,
          type,
          title: title.trim(),
          body: body.trim(),
          linkUrl: linkUrl.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        pushSent?: number;
        devices?: number;
        clientName?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Send failed");
      }
      if (audience === "client") {
        setNotice({
          kind: "ok",
          text: `Notification sent to ${data.clientName ?? "client"} (inbox + push if device registered).`,
        });
      } else {
        setNotice({
          kind: "ok",
          text: `Broadcast saved. Push attempted on ${data.pushSent ?? 0} of ${data.devices ?? 0} device(s). Logged-out users see it in the app offers feed.`,
        });
      }
      setTitle("");
      setBody("");
      setLinkUrl("");
    } catch (e) {
      setNotice({
        kind: "err",
        text: e instanceof Error ? e.message : "Could not send",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h4 className="mb-1">Send app notification</h4>
        <p className="text-muted mb-0">
          Push to mobile devices and save in the in-app notification centre.
          Choose <strong>All users</strong> for offers, new posts, and promos
          (including guests). Choose <strong>One client</strong> for a private
          message. Order placed, approved, and dispatched alerts are sent
          automatically when you update orders.
        </p>
      </div>

      {notice ? (
        <div
          className={`alert ${notice.kind === "ok" ? "alert-success" : "alert-danger"}`}
          role="alert"
        >
          {notice.text}
        </div>
      ) : null}

      <div className="card p-4 border">
        <div className="mb-3">
          <label className="form-label fw-bold">Audience</label>
          <div className="d-flex flex-wrap gap-3">
            <label className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="audience"
                checked={audience === "all"}
                onChange={() => setAudience("all")}
              />
              <span className="form-check-label ms-1">
                All app users (logged in + guests)
              </span>
            </label>
            <label className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="audience"
                checked={audience === "client"}
                onChange={() => setAudience("client")}
              />
              <span className="form-check-label ms-1">One client only</span>
            </label>
          </div>
        </div>

        {audience === "client" ? (
          <div className="mb-3">
            <label className="form-label" htmlFor="clientId">
              Client
            </label>
            <select
              id="clientId"
              className="form-select"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              {sortedClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="mb-3">
          <label className="form-label" htmlFor="notifType">
            Type
          </label>
          <select
            id="notifType"
            className="form-select"
            value={type}
            onChange={(e) =>
              setType(e.target.value as (typeof TYPE_OPTIONS)[number]["value"])
            }
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="notifTitle">
            Title
          </label>
          <input
            id="notifTitle"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New Ajrakh collection live"
            maxLength={120}
          />
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="notifBody">
            Message
          </label>
          <textarea
            id="notifBody"
            className="form-control"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Short message shown in the app and push tray"
            maxLength={500}
          />
        </div>

        <div className="mb-4">
          <label className="form-label" htmlFor="notifLink">
            Deep link (optional)
          </label>
          <input
            id="notifLink"
            className="form-control"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Product id, category name, or URL"
          />
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void send()}
        >
          {busy ? "Sending…" : "Send notification"}
        </button>
      </div>
    </div>
  );
}
