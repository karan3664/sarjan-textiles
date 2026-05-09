"use client";

import { useMemo, useState } from "react";
import type { CmsTestimonial } from "@/lib/cms-store";

type StatusFilter = "all" | CmsTestimonial["status"];
const defaultAvatar = "/sarjan-assets/sarjan-favicon-192.png";

function testimonialAvatar(avatar?: string) {
  return avatar && !avatar.includes("/template/storefront/images/avatar/") ? avatar : defaultAvatar;
}

function statusClass(status: CmsTestimonial["status"]) {
  if (status === "approved") return "type-completed";
  if (status === "rejected") return "type-inactive";
  return "type-pending";
}

export function AdminTestimonialsClient({ initialTestimonials }: { initialTestimonials: CmsTestimonial[] }) {
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const filteredTestimonials = useMemo(
    () => testimonials.filter((testimonial) => filter === "all" || testimonial.status === filter),
    [filter, testimonials],
  );

  const counts = {
    all: testimonials.length,
    pending: testimonials.filter((testimonial) => testimonial.status === "pending").length,
    approved: testimonials.filter((testimonial) => testimonial.status === "approved").length,
    rejected: testimonials.filter((testimonial) => testimonial.status === "rejected").length,
  };

  const updateStatus = async (id: string, status: CmsTestimonial["status"]) => {
    setSavingId(id);
    try {
      const res = await fetch("/api/admin/testimonials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Status update failed");
      const data = (await res.json()) as { testimonials: CmsTestimonial[] };
      setTestimonials(data.testimonials);
    } finally {
      setSavingId(null);
    }
  };

  const filters: Array<{ label: string; value: StatusFilter; count: number }> = [
    { label: "All", value: "all", count: counts.all },
    { label: "Pending", value: "pending", count: counts.pending },
    { label: "Approved", value: "approved", count: counts.approved },
    { label: "Rejected", value: "rejected", count: counts.rejected },
  ];

  return (
    <>
      <div className="sarjan-home-kpi-grid sarjan-testimonial-kpi-grid">
        {filters.map((item) => (
          <button type="button" className={`sarjan-home-kpi-card sarjan-filter-card${filter === item.value ? " active" : ""}`} onClick={() => setFilter(item.value)} key={item.value}>
            <div className="sarjan-home-kpi-icon">
              <i className={item.value === "approved" ? "icon-sealCheck" : item.value === "rejected" ? "icon-close" : item.value === "pending" ? "icon-calendar" : "icon-message"} />
            </div>
            <div>
              <div className="body-text text-secondary">{item.label}</div>
              <h5>{item.count}</h5>
            </div>
          </button>
        ))}
      </div>

      <div className="wg-box sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Customer Testimonials</h5>
            <div className="body-text text-secondary">Customer/frontend submissions appear here first. Only approved testimonials show on homepage.</div>
          </div>
          <div className="box-status text-button type-delivery">{filteredTestimonials.length} Showing</div>
        </div>

        <div className="sarjan-admin-testimonial-list">
          {filteredTestimonials.map((testimonial) => (
            <div className="sarjan-admin-testimonial-card" key={testimonial.id}>
              <div className="sarjan-admin-testimonial-media">
                <img src={testimonial.image} alt={testimonial.product} />
              </div>
              <div className="sarjan-admin-testimonial-content">
                <div className="sarjan-admin-testimonial-head">
                  <div className="sarjan-testimonial-author-row">
                    <img src={testimonialAvatar(testimonial.avatar)} alt={testimonial.author} />
                    <div>
                      <h6>{testimonial.author}</h6>
                      <p>{testimonial.product} {testimonial.price ? `- ${testimonial.price}` : ""}</p>
                    </div>
                  </div>
                  <div className={`box-status text-button ${statusClass(testimonial.status)}`}>{testimonial.status}</div>
                </div>
                <blockquote>{testimonial.quote}</blockquote>
                <div className="sarjan-admin-testimonial-actions">
                  <button type="button" className="tf-button style-1" disabled={savingId === testimonial.id || testimonial.status === "approved"} onClick={() => updateStatus(testimonial.id, "approved")}>
                    Approve
                  </button>
                  <button type="button" className="tf-button" disabled={savingId === testimonial.id || testimonial.status === "pending"} onClick={() => updateStatus(testimonial.id, "pending")}>
                    Mark Pending
                  </button>
                  <button type="button" className="tf-button" disabled={savingId === testimonial.id || testimonial.status === "rejected"} onClick={() => updateStatus(testimonial.id, "rejected")}>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!filteredTestimonials.length && <div className="body-text text-secondary">No testimonials found.</div>}
        </div>
      </div>
    </>
  );
}
