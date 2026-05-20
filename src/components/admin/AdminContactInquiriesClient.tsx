"use client";

import { useMemo, useState } from "react";
import { EmojiTextarea } from "@/components/shared/EmojiTextarea";

type Inquiry = {
  id: string;
  companyName: string;
  email: string;
  contactPerson?: string;
  phone?: string;
  requirement?: string;
  orderId?: string;
  message: string;
  status?: "new" | "replied";
  createdAt: string;
  replySubject?: string;
  replyMessage?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function defaultReply(inquiry: Inquiry) {
  return {
    subject:
      inquiry.replySubject ||
      `Sarjan Textiles inquiry - ${inquiry.companyName}`,
    /** Body only — sent mail wraps this in the same Sarjan HTML layout (logo header + footer) as order/account emails. */
    message:
      inquiry.replyMessage ||
      [
        `Hello ${inquiry.contactPerson || inquiry.companyName},`,
        "",
        "Thank you for reaching out.",
        "",
        "We received your requirement:",
        inquiry.requirement ? `Requirement: ${inquiry.requirement}` : "",
        `Their note: ${inquiry.message}`,
        "",
        "Our team will follow up with catalog / MOQ and next steps shortly.",
      ]
        .filter(Boolean)
        .join("\n"),
  };
}

export function AdminContactInquiriesClient({
  initialInquiries,
}: {
  initialInquiries: Inquiry[];
}) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "new" | "replied">("all");
  const [activeReplyId, setActiveReplyId] = useState(
    initialInquiries[0]?.id ?? "",
  );
  const [replyDrafts, setReplyDrafts] = useState<
    Record<string, { subject: string; message: string }>
  >({});
  const [sendingId, setSendingId] = useState("");
  const [notice, setNotice] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const filteredInquiries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return inquiries.filter((inquiry) => {
      const matchesStatus =
        status === "all" || (inquiry.status ?? "new") === status;
      const matchesQuery =
        !normalized ||
        [
          inquiry.companyName,
          inquiry.email,
          inquiry.contactPerson,
          inquiry.phone,
          inquiry.requirement,
          inquiry.message,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));
      return matchesStatus && matchesQuery;
    });
  }, [inquiries, query, status]);

  const markReplied = async (id: string) => {
    const res = await fetch("/api/admin/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { inquiries: Inquiry[] };
    setInquiries(data.inquiries);
  };

  const draftFor = (inquiry: Inquiry) =>
    replyDrafts[inquiry.id] ?? defaultReply(inquiry);

  const setDraft = (
    id: string,
    patch: Partial<{ subject: string; message: string }>,
  ) => {
    const inquiry = inquiries.find((item) => item.id === id);
    if (!inquiry) return;
    setReplyDrafts((current) => ({
      ...current,
      [id]: { ...draftFor(inquiry), ...patch },
    }));
  };

  const sendReply = async (inquiry: Inquiry) => {
    const draft = draftFor(inquiry);
    setSendingId(inquiry.id);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: inquiry.id,
          to: inquiry.email,
          subject: draft.subject,
          message: draft.message,
        }),
      });
      const data = (await res.json()) as {
        inquiries?: Inquiry[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Mail send failed");
      setInquiries(data.inquiries ?? inquiries);
      setNotice({ kind: "ok", text: `Mail sent to ${inquiry.email}` });
    } catch (error) {
      setNotice({
        kind: "err",
        text: error instanceof Error ? error.message : "Mail send failed",
      });
    } finally {
      setSendingId("");
    }
  };

  return (
    <>
      <div className="sarjan-home-kpi-grid sarjan-testimonial-kpi-grid">
        {[
          ["Total Inquiries", inquiries.length],
          [
            "New",
            inquiries.filter((item) => (item.status ?? "new") === "new").length,
          ],
          [
            "Replied",
            inquiries.filter((item) => item.status === "replied").length,
          ],
          ["Showing", filteredInquiries.length],
        ].map(([label, value]) => (
          <div className="sarjan-home-kpi-card" key={label}>
            <div className="sarjan-home-kpi-icon">
              <i className="icon-message" />
            </div>
            <div>
              <div className="body-text text-secondary">{label}</div>
              <h5>{value}</h5>
            </div>
          </div>
        ))}
      </div>

      <div className="wg-box sarjan-products-list-box">
        <div className="box-top">
          <form
            className="form-search-2"
            onSubmit={(event) => event.preventDefault()}
          >
            <fieldset className="name">
              <input
                type="text"
                placeholder="Search inquiries"
                className="show-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </fieldset>
            <div className="button-submit">
              <button type="submit">
                <i className="icon-search-1 link" />
              </button>
            </div>
          </form>
          <div className="tf-select">
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="replied">Replied</option>
            </select>
          </div>
        </div>

        <div className="sarjan-inquiry-list">
          {notice ? (
            <div
              className={`sarjan-mail-notice${notice.kind === "ok" ? " sarjan-mail-notice--success" : " sarjan-mail-notice--danger"}`}
              role="status"
            >
              {notice.text}
            </div>
          ) : null}
          {filteredInquiries.map((inquiry) => (
            <div className="sarjan-inquiry-card" key={inquiry.id}>
              <div className="sarjan-inquiry-head">
                <div className="sarjan-inquiry-title">
                  <h6>{inquiry.companyName}</h6>
                  <p className="sarjan-inquiry-contact-line">
                    <span>{inquiry.contactPerson || "Contact person"}</span>
                    <span className="sarjan-inquiry-sep" aria-hidden>
                      ·
                    </span>
                    <a
                      href={`mailto:${inquiry.email}`}
                      className="sarjan-inquiry-mailto"
                    >
                      {inquiry.email}
                    </a>
                    {inquiry.phone ? (
                      <>
                        <span className="sarjan-inquiry-sep" aria-hidden>
                          ·
                        </span>
                        <span>{inquiry.phone}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div
                  className={`box-status text-button ${(inquiry.status ?? "new") === "new" ? "type-pending" : "type-completed"}`}
                >
                  {inquiry.status ?? "new"}
                </div>
              </div>
              <div className="sarjan-inquiry-meta">
                <span>{formatDate(inquiry.createdAt)}</span>
                {inquiry.requirement ? (
                  <span>{inquiry.requirement}</span>
                ) : null}
                {inquiry.orderId ? <span>Order: {inquiry.orderId}</span> : null}
              </div>
              <div className="sarjan-inquiry-body">
                <div className="sarjan-inquiry-body-label text-caption-1 text-secondary">
                  Message from customer
                </div>
                <p className="sarjan-inquiry-body-text sarjan-emoji-text">
                  {inquiry.message}
                </p>
              </div>
              {activeReplyId === inquiry.id ? (
                <div className="sarjan-mail-draft">
                  <div className="sarjan-mail-draft-head">
                    <div className="text-title">Compose reply</div>
                    <p className="sarjan-mail-draft-hint text-caption-1 text-secondary mb-0">
                      This box is only the <strong>body text</strong>. When you
                      click <strong>Send mail</strong>, the server wraps it in
                      the same Sarjan email as orders and account mail:{" "}
                      <strong>logo header</strong>, greeting, inquiry summary,
                      your text, then the branded <strong>footer</strong>{" "}
                      (phone, email, socials, site link).
                    </p>
                  </div>
                  <fieldset>
                    <label
                      className="sarjan-mail-field-label"
                      htmlFor={`inquiry-to-${inquiry.id}`}
                    >
                      To
                    </label>
                    <input
                      id={`inquiry-to-${inquiry.id}`}
                      value={inquiry.email}
                      readOnly
                    />
                  </fieldset>
                  <fieldset>
                    <label
                      className="sarjan-mail-field-label"
                      htmlFor={`inquiry-subject-${inquiry.id}`}
                    >
                      Subject
                    </label>
                    <input
                      id={`inquiry-subject-${inquiry.id}`}
                      value={draftFor(inquiry).subject}
                      onChange={(event) =>
                        setDraft(inquiry.id, { subject: event.target.value })
                      }
                    />
                  </fieldset>
                  <fieldset>
                    <label
                      className="sarjan-mail-field-label"
                      htmlFor={`inquiry-message-${inquiry.id}`}
                    >
                      Message
                    </label>
                    <EmojiTextarea
                      id={`inquiry-message-${inquiry.id}`}
                      rows={8}
                      textareaClassName="form-control"
                      value={draftFor(inquiry).message}
                      onChange={(event) =>
                        setDraft(inquiry.id, { message: event.target.value })
                      }
                    />
                  </fieldset>
                </div>
              ) : null}
              <div className="sarjan-inquiry-actions">
                <button
                  type="button"
                  className="tf-button style-2"
                  onClick={() =>
                    setActiveReplyId((current) =>
                      current === inquiry.id ? "" : inquiry.id,
                    )
                  }
                >
                  {activeReplyId === inquiry.id ? "Hide draft" : "Reply draft"}
                </button>
                <button
                  type="button"
                  className="tf-button style-1"
                  disabled={sendingId === inquiry.id}
                  onClick={() => void sendReply(inquiry)}
                >
                  {sendingId === inquiry.id ? "Sending…" : "Send mail"}
                </button>
                <button
                  type="button"
                  className="tf-button style-2"
                  onClick={() => void markReplied(inquiry.id)}
                >
                  Mark replied
                </button>
              </div>
            </div>
          ))}
          {!filteredInquiries.length ? (
            <div className="body-text text-secondary p-4">
              No inquiries found.
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
