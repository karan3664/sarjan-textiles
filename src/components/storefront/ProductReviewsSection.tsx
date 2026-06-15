"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCardRating } from "@/components/storefront/ProductCardRating";
import { clientAuthJsonHeaders } from "@/lib/client-auth-browser";

type PublicReview = {
  id: string;
  clientName: string;
  rating: number;
  title: string;
  body: string;
  images: string[];
  videos: string[];
  helpfulCount: number;
  createdAt: string;
  verifiedPurchase: boolean;
  isTopReviewer?: boolean;
};

type ReviewStats = {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

type Sort = "newest" | "oldest" | "highest" | "lowest" | "helpful";

type Props = {
  productSlug: string;
  productName: string;
  canWrite?: boolean;
  orderId?: string;
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

export function ProductReviewsSection(props: Props) {
  return (
    <Suspense
      fallback={
        <ProductReviewsSectionFallback productName={props.productName} />
      }
    >
      <ProductReviewsSectionInner {...props} />
    </Suspense>
  );
}

function ProductReviewsSectionFallback({
  productName,
}: {
  productName: string;
}) {
  return (
    <section className="sarjan-product-reviews flat-spacing-3" aria-busy="true">
      <div className="container text-center">
        <h3 className="title">Customer reviews</h3>
        <p className="text-secondary">Loading reviews for {productName}…</p>
      </div>
    </section>
  );
}

function ProductReviewsSectionInner({
  productSlug,
  productName,
  canWrite: canWriteProp = false,
  orderId: orderIdProp,
}: Props) {
  const searchParams = useSearchParams();
  const urlReviewIntent = searchParams.get("review") === "1";
  const urlOrderId = searchParams.get("orderId")?.trim() || undefined;
  const urlReviewId = searchParams.get("reviewId")?.trim() || undefined;
  const urlRating = Number(searchParams.get("rating") ?? "");

  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [eligibleToWrite, setEligibleToWrite] = useState(false);
  const [canEditReview, setCanEditReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | undefined>(
    urlReviewId,
  );
  const [resolvedOrderId, setResolvedOrderId] = useState<string | undefined>(
    orderIdProp ?? urlOrderId,
  );

  const orderId = resolvedOrderId ?? orderIdProp ?? urlOrderId;
  const canWrite = canWriteProp || eligibleToWrite || canEditReview;
  const isEditing = Boolean(editingReviewId);

  const load = useCallback(
    async (nextPage: number, replace = false) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/products/${encodeURIComponent(productSlug)}/reviews?sort=${sort}&page=${nextPage}&limit=6`,
        );
        if (!res.ok) throw new Error("Failed to load reviews");
        const data = (await res.json()) as {
          reviews: PublicReview[];
          stats: ReviewStats;
          hasMore: boolean;
        };
        setStats(data.stats);
        setHasMore(data.hasMore);
        setReviews((current) =>
          replace ? data.reviews : [...current, ...data.reviews],
        );
      } catch {
        setMessage("Could not load reviews.");
      } finally {
        setLoading(false);
      }
    },
    [productSlug, sort],
  );

  useEffect(() => {
    setPage(1);
    void load(1, true);
  }, [load]);

  useEffect(() => {
    const activeOrderId = orderIdProp ?? urlOrderId;
    if (!activeOrderId) {
      setEligibleToWrite(false);
      return;
    }
    setResolvedOrderId(activeOrderId);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/reviews/eligible?orderId=${encodeURIComponent(activeOrderId)}&productSlug=${encodeURIComponent(productSlug)}`,
          { credentials: "include", headers: clientAuthJsonHeaders() },
        );
        if (!res.ok) {
          if (res.status === 401) {
            setMessage("Sign in to write a review for this order.");
          }
          return;
        }
        const data = (await res.json()) as {
          canReview?: boolean;
          canEdit?: boolean;
          hasReview?: boolean;
          reviewId?: string;
          reviewStatus?: string;
        };
        if (cancelled) return;
        setEligibleToWrite(Boolean(data.canReview));
        setCanEditReview(Boolean(data.canEdit));
        if (data.canEdit && data.reviewId) {
          setEditingReviewId(data.reviewId);
        }
        if (data.hasReview && !data.canEdit) {
          setMessage(
            data.reviewStatus === "pending"
              ? "Your review for this product is pending moderation."
              : "You already submitted a review for this product.",
          );
        }
      } catch {
        if (!cancelled) {
          setMessage("Could not verify review eligibility.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderIdProp, urlOrderId, productSlug]);

  useEffect(() => {
    const reviewId = urlReviewId ?? editingReviewId;
    if (!reviewId || !canEditReview) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/reviews/${encodeURIComponent(reviewId)}`,
          {
            credentials: "include",
            headers: clientAuthJsonHeaders(),
          },
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          review?: {
            rating: number;
            title: string;
            body: string;
            images: string[];
            orderId: string;
          };
        };
        if (cancelled || !data.review) return;
        setRating(data.review.rating);
        setTitle(data.review.title);
        setBody(data.review.body);
        setImages(data.review.images ?? []);
        setResolvedOrderId(data.review.orderId);
      } catch {
        if (!cancelled) {
          setMessage("Could not load your review for editing.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urlReviewId, editingReviewId, canEditReview]);

  useEffect(() => {
    if (!urlReviewIntent || !canWrite) return;
    setShowForm(true);
    if (Number.isFinite(urlRating) && urlRating >= 1 && urlRating <= 5) {
      setRating(urlRating);
    }
    requestAnimationFrame(() => {
      document
        .getElementById("product-reviews-heading")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [urlReviewIntent, canWrite, urlRating]);

  const distributionRows = useMemo(() => {
    if (!stats) return [];
    return ([5, 4, 3, 2, 1] as const).map((star) => ({
      star,
      count: stats.distribution[star] ?? 0,
      pct:
        stats.totalReviews > 0
          ? Math.round(
              ((stats.distribution[star] ?? 0) / stats.totalReviews) * 100,
            )
          : 0,
    }));
  }, [stats]);

  const submitReview = async () => {
    if (!orderId) {
      setMessage(
        "Open this product from your delivered order to write a review.",
      );
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const res =
        isEditing && editingReviewId
          ? await fetch(`/api/reviews/${encodeURIComponent(editingReviewId)}`, {
              method: "PUT",
              headers: clientAuthJsonHeaders(),
              credentials: "include",
              body: JSON.stringify({
                rating,
                title,
                body,
                images,
              }),
            })
          : await fetch("/api/reviews", {
              method: "POST",
              headers: clientAuthJsonHeaders(),
              credentials: "include",
              body: JSON.stringify({
                productSlug,
                orderId,
                rating,
                title,
                body,
                images,
              }),
            });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      setShowForm(false);
      setTitle("");
      setBody("");
      setImages([]);
      setCanEditReview(false);
      setEditingReviewId(undefined);
      setEligibleToWrite(false);
      setMessage(
        data.message ?? (isEditing ? "Review updated." : "Review submitted."),
      );
      await load(1, true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not submit review.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const uploadImage = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", "image");
    const res = await fetch("/api/reviews/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      throw new Error(data.error ?? "Upload failed");
    }
    setImages((current) => [...current, data.url!].slice(0, 5));
  };

  const markHelpful = async (reviewId: string) => {
    const res = await fetch(`/api/reviews/${reviewId}/helpful`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { helpfulCount: number };
    setReviews((current) =>
      current.map((review) =>
        review.id === reviewId
          ? { ...review, helpfulCount: data.helpfulCount }
          : review,
      ),
    );
  };

  return (
    <section
      className="sarjan-product-reviews flat-spacing-3"
      aria-labelledby="product-reviews-heading"
    >
      <div className="container">
        <div className="heading-section text-center mb-30">
          <h3 id="product-reviews-heading" className="title">
            Customer reviews
          </h3>
          <p className="text-secondary mb-0">
            Verified purchases only · moderated before publishing
          </p>
        </div>

        <div className="row g-4 mb-30">
          <div className="col-md-4">
            <div className="sarjan-review-summary p-4 rounded-3 h-100">
              <div className="d-flex align-items-center gap-2 mb-2">
                <ProductCardRating rating={stats?.averageRating ?? 0} />
              </div>
              <div className="h3 mb-0">
                {(stats?.averageRating ?? 0).toFixed(1)} out of 5
              </div>
              <div className="text-secondary">
                {stats?.totalReviews ?? 0} verified reviews
              </div>
            </div>
          </div>
          <div className="col-md-8">
            <div className="sarjan-review-distribution p-4 rounded-3 h-100">
              {distributionRows.map((row) => (
                <div
                  key={row.star}
                  className="d-flex align-items-center gap-3 mb-2"
                >
                  <span style={{ minWidth: 52 }}>{row.star} Star</span>
                  <div
                    className="progress flex-grow-1"
                    style={{ height: 8 }}
                    role="progressbar"
                    aria-valuenow={row.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="progress-bar"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="text-secondary" style={{ minWidth: 32 }}>
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-20">
          <label className="d-flex align-items-center gap-2">
            <span className="text-secondary">Sort by</span>
            <select
              className="form-select form-select-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort reviews"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest">Highest rating</option>
              <option value="lowest">Lowest rating</option>
              <option value="helpful">Most helpful</option>
            </select>
          </label>
          {canWrite ? (
            <button
              type="button"
              className="tf-btn btn-fill"
              onClick={() => setShowForm((open) => !open)}
            >
              {isEditing ? "Edit review" : "Write a review"}
            </button>
          ) : null}
        </div>

        {message ? (
          <div className="sarjan-review-notice" role="status">
            {message}
          </div>
        ) : null}

        {showForm ? (
          <div className="sarjan-review-form p-4 rounded-3 mb-30">
            <h5 className="mb-3">
              {isEditing ? "Edit your review" : `Review ${productName}`}
            </h5>
            <div className="mb-3">
              <label className="form-label">Rating</label>
              <div
                className="d-flex gap-2"
                role="radiogroup"
                aria-label="Rating"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`btn btn-sm ${rating >= star ? "btn-warning" : "btn-outline-secondary"}`}
                    onClick={() => setRating(star)}
                    aria-label={`${star} stars`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="review-title">
                Title
              </label>
              <input
                id="review-title"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="review-body">
                Review
              </label>
              <textarea
                id="review-body"
                className="form-control"
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <span className="form-label d-block" id="review-photos-label">
                Photos
              </span>
              <label
                className="sarjan-review-file-upload"
                htmlFor="review-photos"
              >
                <input
                  id="review-photos"
                  type="file"
                  accept="image/*"
                  className="sarjan-review-file-upload__input"
                  aria-labelledby="review-photos-label"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void uploadImage(file).catch(() =>
                        setMessage("Upload failed."),
                      );
                    e.target.value = "";
                  }}
                />
                <span className="sarjan-review-file-upload__btn tf-btn btn-fill btn-sm">
                  Choose file
                </span>
                <span className="sarjan-review-file-upload__hint text-secondary">
                  {images.length
                    ? `${images.length} photo(s) selected`
                    : "No file chosen"}
                </span>
              </label>
            </div>
            <button
              type="button"
              className="tf-btn btn-fill"
              disabled={submitting}
              onClick={() => void submitReview()}
            >
              {submitting
                ? isEditing
                  ? "Saving…"
                  : "Submitting…"
                : isEditing
                  ? "Update review"
                  : "Submit review"}
            </button>
          </div>
        ) : null}

        <div className="sarjan-review-list">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="sarjan-review-card p-4 rounded-3 mb-3"
            >
              <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                <div>
                  <strong>{review.clientName}</strong>
                  {review.isTopReviewer ? (
                    <span className="badge bg-dark ms-2">Top reviewer</span>
                  ) : null}
                  {review.verifiedPurchase ? (
                    <span className="badge bg-success ms-2">
                      Verified purchase
                    </span>
                  ) : null}
                </div>
                <span className="text-secondary">
                  {formatDate(review.createdAt)}
                </span>
              </div>
              <div
                className="mb-2"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {"★".repeat(review.rating)}
                <span className="visually-hidden">{review.rating} stars</span>
              </div>
              <h5 className="mb-2">{review.title}</h5>
              <p className="mb-3">{review.body}</p>
              {review.images.length ? (
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {review.images.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      width={88}
                      height={88}
                      style={{ objectFit: "cover", borderRadius: 8 }}
                    />
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={() => void markHelpful(review.id)}
              >
                Helpful ({review.helpfulCount})
              </button>
            </article>
          ))}
        </div>

        {loading ? <p className="text-secondary">Loading reviews…</p> : null}
        {hasMore ? (
          <div className="text-center mt-20">
            <button
              type="button"
              className="tf-btn btn-outline"
              onClick={() => {
                const next = page + 1;
                setPage(next);
                void load(next);
              }}
            >
              Load more reviews
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
