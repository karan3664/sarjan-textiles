"use client";

import { useMemo, useState } from "react";
import type { ProductReview, ProductReviewStatus } from "@/lib/reviews-store";

type Metrics = {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  hiddenReviews: number;
  lowestRatedProducts: Array<{
    productSlug: string;
    averageRating: number;
    reviewCount: number;
  }>;
  highestRatedProducts: Array<{
    productSlug: string;
    averageRating: number;
    reviewCount: number;
  }>;
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusBadge(status: ProductReviewStatus) {
  if (status === "approved") return "badge bg-success";
  if (status === "rejected") return "badge bg-secondary";
  if (status === "hidden") return "badge bg-dark";
  return "badge bg-warning text-dark";
}

export function AdminProductReviewsClient({
  initialReviews,
  initialMetrics,
}: {
  initialReviews: ProductReview[];
  initialMetrics: Metrics;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductReviewStatus>(
    "pending",
  );
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter((review) => {
      const okStatus = statusFilter === "all" || review.status === statusFilter;
      const okRating = ratingFilter === "all" || review.rating === ratingFilter;
      const hay = [
        review.productSlug,
        review.clientName,
        review.title,
        review.body,
        review.orderId,
      ]
        .join(" ")
        .toLowerCase();
      const okQ = !q || hay.includes(q);
      return okStatus && okRating && okQ;
    });
  }, [reviews, query, statusFilter, ratingFilter]);

  const refreshMetrics = async () => {
    const res = await fetch("/api/reviews/pending?status=all");
    if (!res.ok) return;
    const data = (await res.json()) as {
      reviews: ProductReview[];
      metrics: Metrics;
    };
    setReviews(data.reviews);
    setMetrics(data.metrics);
  };

  const patchReview = async (
    id: string,
    action: "approve" | "reject" | "hide" | "delete",
  ) => {
    setBusyId(id);
    setNotice("");
    try {
      const res = await fetch(
        action === "delete"
          ? `/api/reviews/${id}`
          : `/api/reviews/${id}/${action}`,
        { method: action === "delete" ? "DELETE" : "PATCH" },
      );
      if (!res.ok) throw new Error("Action failed");
      await refreshMetrics();
      setNotice(
        action === "approve"
          ? "Review approved."
          : action === "reject"
            ? "Review rejected."
            : action === "hide"
              ? "Review hidden."
              : "Review deleted.",
      );
    } catch {
      setNotice("Action failed. Try again.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="wg-box">
      <div className="mb-20 d-flex flex-wrap justify-content-between gap-10 align-items-center">
        <div>
          <h4 className="mb-4">Product reviews</h4>
          <p className="body-text text-secondary mb-0">
            Moderate verified purchase reviews before they appear on web and
            app.
          </p>
        </div>
      </div>

      <div className="row g-3 mb-20">
        {[
          ["Total", metrics.totalReviews],
          ["Pending", metrics.pendingReviews],
          ["Approved", metrics.approvedReviews],
          ["Rejected", metrics.rejectedReviews],
        ].map(([label, value]) => (
          <div className="col-6 col-md-3" key={String(label)}>
            <div className="p-3 border rounded-3 h-100">
              <div className="body-text text-secondary">{label}</div>
              <div className="h4 mb-0">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {notice ? <div className="alert alert-info">{notice}</div> : null}

      <div className="d-flex flex-wrap gap-10 mb-20">
        <input
          className="form-control"
          style={{ maxWidth: 280 }}
          placeholder="Search product, customer, order…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="form-control"
          style={{ maxWidth: 180 }}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as typeof statusFilter)
          }
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="hidden">Hidden</option>
        </select>
        <select
          className="form-control"
          style={{ maxWidth: 140 }}
          value={ratingFilter}
          onChange={(e) =>
            setRatingFilter(
              e.target.value === "all" ? "all" : Number(e.target.value),
            )
          }
        >
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={rating}>
              {rating} star
            </option>
          ))}
        </select>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Customer</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Status</th>
              <th>Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((review) => (
              <tr key={review.id}>
                <td>
                  <div className="fw-semibold">{review.productSlug}</div>
                  <div className="small text-secondary">{review.orderId}</div>
                </td>
                <td>{review.clientName}</td>
                <td>{"★".repeat(review.rating)}</td>
                <td style={{ minWidth: 240 }}>
                  <div className="fw-semibold">{review.title}</div>
                  <div className="small">{review.body}</div>
                  {review.images.length ? (
                    <div className="small text-secondary mt-1">
                      {review.images.length} photo(s)
                    </div>
                  ) : null}
                  {review.videos.length ? (
                    <div className="small text-secondary">
                      {review.videos.length} video(s)
                    </div>
                  ) : null}
                </td>
                <td>
                  <span className={statusBadge(review.status)}>
                    {review.status}
                  </span>
                </td>
                <td>{formatDate(review.createdAt)}</td>
                <td>
                  <div className="d-flex flex-wrap gap-2">
                    {review.status !== "approved" ? (
                      <button
                        type="button"
                        className="tf-button style-2"
                        disabled={busyId === review.id}
                        onClick={() => void patchReview(review.id, "approve")}
                      >
                        Approve
                      </button>
                    ) : null}
                    {review.status !== "rejected" ? (
                      <button
                        type="button"
                        className="tf-button style-3"
                        disabled={busyId === review.id}
                        onClick={() => void patchReview(review.id, "reject")}
                      >
                        Reject
                      </button>
                    ) : null}
                    {review.status !== "hidden" ? (
                      <button
                        type="button"
                        className="tf-button style-3"
                        disabled={busyId === review.id}
                        onClick={() => void patchReview(review.id, "hide")}
                      >
                        Hide
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="tf-button style-3"
                      disabled={busyId === review.id}
                      onClick={() => void patchReview(review.id, "delete")}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!filtered.length ? (
        <p className="body-text text-secondary">No reviews in this queue.</p>
      ) : null}
    </div>
  );
}
