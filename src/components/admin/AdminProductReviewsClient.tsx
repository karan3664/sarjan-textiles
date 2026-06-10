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

const STAT_CARDS: Array<{
  key: keyof Pick<
    Metrics,
    "totalReviews" | "pendingReviews" | "approvedReviews" | "rejectedReviews"
  >;
  label: string;
  tone?: "pending" | "approved" | "rejected";
}> = [
  { key: "totalReviews", label: "Total" },
  { key: "pendingReviews", label: "Pending", tone: "pending" },
  { key: "approvedReviews", label: "Approved", tone: "approved" },
  { key: "rejectedReviews", label: "Rejected", tone: "rejected" },
];

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
    <div className="wg-box sarjan-admin-product-reviews">
      <div className="sarjan-admin-product-reviews-stats">
        {STAT_CARDS.map(({ key, label, tone }) => (
          <div
            key={key}
            className={`sarjan-admin-product-reviews-stat${tone ? ` is-${tone}` : ""}`}
          >
            <div className="sarjan-admin-product-reviews-stat__label">
              {label}
            </div>
            <div className="sarjan-admin-product-reviews-stat__value">
              {metrics[key]}
            </div>
          </div>
        ))}
      </div>

      <div className="sarjan-admin-product-reviews-toolbar">
        <input
          type="search"
          className="form-control sarjan-admin-product-reviews-search"
          placeholder="Search product, customer, order…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="form-select sarjan-admin-product-reviews-filter"
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
          className="form-select sarjan-admin-product-reviews-filter sarjan-admin-product-reviews-filter--rating"
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

      {notice ? (
        <p className="sarjan-admin-product-reviews-notice" role="status">
          {notice}
        </p>
      ) : null}

      <div className="table-responsive">
        <table className="table table-bordered sarjan-admin-product-reviews-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Customer</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Status</th>
              <th>Date</th>
              <th className="sarjan-admin-product-reviews-actions-th">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((review) => (
                <tr key={review.id}>
                  <td>
                    <div className="text-title">{review.productSlug}</div>
                    <div className="text-caption-1 text-muted">
                      {review.orderId}
                    </div>
                  </td>
                  <td>{review.clientName}</td>
                  <td>
                    <span
                      className="sarjan-admin-product-reviews-stars"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {"★".repeat(review.rating)}
                    </span>
                  </td>
                  <td className="sarjan-admin-product-reviews-copy">
                    <div className="text-title">{review.title}</div>
                    <div className="body-text text-secondary">
                      {review.body}
                    </div>
                    {review.images.length ? (
                      <div className="text-caption-1 text-muted">
                        {review.images.length} photo(s)
                      </div>
                    ) : null}
                    {review.videos.length ? (
                      <div className="text-caption-1 text-muted">
                        {review.videos.length} video(s)
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className={statusBadge(review.status)}>
                      {review.status}
                    </span>
                  </td>
                  <td className="text-nowrap">
                    {formatDate(review.createdAt)}
                  </td>
                  <td className="sarjan-admin-product-reviews-actions-cell">
                    <div className="sarjan-admin-product-reviews-actions">
                      {review.status !== "approved" ? (
                        <button
                          type="button"
                          className="tf-button style-1"
                          disabled={busyId === review.id}
                          onClick={() => void patchReview(review.id, "approve")}
                        >
                          Approve
                        </button>
                      ) : null}
                      {review.status !== "rejected" ? (
                        <button
                          type="button"
                          className="tf-button sarjan-danger-button"
                          disabled={busyId === review.id}
                          onClick={() => void patchReview(review.id, "reject")}
                        >
                          Reject
                        </button>
                      ) : null}
                      {review.status !== "hidden" ? (
                        <button
                          type="button"
                          className="tf-button"
                          disabled={busyId === review.id}
                          onClick={() => void patchReview(review.id, "hide")}
                        >
                          Hide
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="tf-button sarjan-danger-button"
                        disabled={busyId === review.id}
                        onClick={() => void patchReview(review.id, "delete")}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="sarjan-admin-product-reviews-empty">
                  No reviews in this queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
