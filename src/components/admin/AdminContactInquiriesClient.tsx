"use client";

import { useMemo, useState } from "react";

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
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function defaultReply(inquiry: Inquiry) {
  return {
    subject: inquiry.replySubject || `Sarjan Textiles inquiry - ${inquiry.companyName}`,
    message: inquiry.replyMessage || [
    `Hello ${inquiry.contactPerson || inquiry.companyName},`,
    "",
    "Thank you for contacting Sarjan Textiles.",
    "",
    "We received your requirement:",
    inquiry.requirement ? `Requirement: ${inquiry.requirement}` : "",
    `Message: ${inquiry.message}`,
    "",
    "Our team will review and reply with product/catalog details.",
    "",
    "Regards,",
    "Sarjan Textiles",
  ].filter(Boolean).join("\n"),
  };
}

export function AdminContactInquiriesClient({ initialInquiries }: { initialInquiries: Inquiry[] }) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "new" | "replied">("all");
  const [activeReplyId, setActiveReplyId] = useState(initialInquiries[0]?.id ?? "");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, { subject: string; message: string }>>({});
  const [sendingId, setSendingId] = useState("");
  const [notice, setNotice] = useState("");

  const filteredInquiries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return inquiries.filter((inquiry) => {
      const matchesStatus = status === "all" || (inquiry.status ?? "new") === status;
      const matchesQuery =
        !normalized ||
        [inquiry.companyName, inquiry.email, inquiry.contactPerson, inquiry.phone, inquiry.requirement, inquiry.message]
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

  const draftFor = (inquiry: Inquiry) => replyDrafts[inquiry.id] ?? defaultReply(inquiry);

  const setDraft = (id: string, patch: Partial<{ subject: string; message: string }>) => {
    const inquiry = inquiries.find((item) => item.id === id);
    if (!inquiry) return;
    setReplyDrafts((current) => ({ ...current, [id]: { ...draftFor(inquiry), ...patch } }));
  };

  const sendReply = async (inquiry: Inquiry) => {
    const draft = draftFor(inquiry);
    setSendingId(inquiry.id);
    setNotice("");
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
      const data = (await res.json()) as { inquiries?: Inquiry[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Mail send failed");
      setInquiries(data.inquiries ?? inquiries);
      setNotice(`Mail sent to ${inquiry.email}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Mail send failed");
    } finally {
      setSendingId("");
    }
  };

  return (
    <>
      <div className="sarjan-home-kpi-grid sarjan-testimonial-kpi-grid">
        {[
          ["Total Inquiries", inquiries.length],
          ["New", inquiries.filter((item) => (item.status ?? "new") === "new").length],
          ["Replied", inquiries.filter((item) => item.status === "replied").length],
          ["Showing", filteredInquiries.length],
        ].map(([label, value]) => (
          <button type="button" className="sarjan-home-kpi-card sarjan-filter-card" key={label}>
            <div className="sarjan-home-kpi-icon"><i className="icon-message" /></div>
            <div>
              <div className="body-text text-secondary">{label}</div>
              <h5>{value}</h5>
            </div>
          </button>
        ))}
      </div>

      <div className="wg-box sarjan-products-list-box">
        <div className="box-top">
          <form className="form-search-2" onSubmit={(event) => event.preventDefault()}>
            <fieldset className="name">
              <input type="text" placeholder="Search inquiries" className="show-search" value={query} onChange={(event) => setQuery(event.target.value)} />
            </fieldset>
            <div className="button-submit"><button type="submit"><i className="icon-search-1 link" /></button></div>
          </form>
          <div className="tf-select">
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="replied">Replied</option>
            </select>
          </div>
        </div>

        <div className="sarjan-inquiry-list">
          {notice ? <div className="sarjan-mail-notice">{notice}</div> : null}
          {filteredInquiries.map((inquiry) => (
            <div className="sarjan-inquiry-card" key={inquiry.id}>
              <div className="sarjan-inquiry-head">
                <div>
                  <h6>{inquiry.companyName}</h6>
                  <p>{inquiry.contactPerson || "Contact person"} / {inquiry.email} {inquiry.phone ? `/ ${inquiry.phone}` : ""}</p>
                </div>
                <div className={`box-status text-button ${(inquiry.status ?? "new") === "new" ? "type-pending" : "type-completed"}`}>{inquiry.status ?? "new"}</div>
              </div>
              <div className="sarjan-inquiry-meta">
                <span>{formatDate(inquiry.createdAt)}</span>
                {inquiry.requirement ? <span>{inquiry.requirement}</span> : null}
                {inquiry.orderId ? <span>Order: {inquiry.orderId}</span> : null}
              </div>
              <p>{inquiry.message}</p>
              {activeReplyId === inquiry.id ? (
                <div className="sarjan-mail-draft">
                  <div className="body-title mb-10">Reply from domain mail</div>
                  <fieldset>
                    <div className="body-title mb-10">To</div>
                    <input value={inquiry.email} readOnly />
                  </fieldset>
                  <fieldset>
                    <div className="body-title mb-10">Subject</div>
                    <input value={draftFor(inquiry).subject} onChange={(event) => setDraft(inquiry.id, { subject: event.target.value })} />
                  </fieldset>
                  <fieldset>
                    <div className="body-title mb-10">Message</div>
                    <textarea rows={8} value={draftFor(inquiry).message} onChange={(event) => setDraft(inquiry.id, { message: event.target.value })} />
                  </fieldset>
                </div>
              ) : null}
              <div className="sarjan-inquiry-actions">
                <button type="button" className="tf-button" onClick={() => setActiveReplyId((current) => current === inquiry.id ? "" : inquiry.id)}>
                  {activeReplyId === inquiry.id ? "Hide Draft" : "Reply Draft"}
                </button>
                <button type="button" className="tf-button" disabled={sendingId === inquiry.id} onClick={() => sendReply(inquiry)}>
                  {sendingId === inquiry.id ? "Sending..." : "Send Mail"}
                </button>
                <button type="button" className="tf-button" onClick={() => markReplied(inquiry.id)}>Mark Replied</button>
              </div>
            </div>
          ))}
          {!filteredInquiries.length ? <div className="body-text text-secondary p-4">No inquiries found.</div> : null}
        </div>
      </div>
    </>
  );
}
