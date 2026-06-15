"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clientAuthJsonHeaders } from "@/lib/client-auth-browser";

type Eligibility = {
  canReview?: boolean;
  canEdit?: boolean;
  hasReview?: boolean;
  reviewId?: string;
  reviewStatus?: string;
};

export function OrderLineReviewCta({
  orderId,
  productSlug,
  orderStatus,
}: {
  orderId: string;
  productSlug: string;
  orderStatus: string;
}) {
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);

  useEffect(() => {
    if (orderStatus !== "Delivered") {
      setEligibility(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/reviews/eligible?orderId=${encodeURIComponent(orderId)}&productSlug=${encodeURIComponent(productSlug)}`,
          { credentials: "include", headers: clientAuthJsonHeaders() },
        );
        if (!res.ok) {
          if (!cancelled) setEligibility(null);
          return;
        }
        const data = (await res.json()) as Eligibility;
        if (!cancelled) setEligibility(data);
      } catch {
        if (!cancelled) setEligibility(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, productSlug, orderStatus]);

  if (!eligibility) {
    return null;
  }

  if (eligibility.hasReview && !eligibility.canReview && !eligibility.canEdit) {
    return (
      <p className="sarjan-review-submitted-note mt_8 mb_0">
        {eligibility.reviewStatus === "pending"
          ? "Review pending approval"
          : "Review submitted"}
      </p>
    );
  }

  if (!eligibility.canReview && !eligibility.canEdit) {
    return null;
  }

  const href = eligibility.reviewId
    ? `/products/${encodeURIComponent(productSlug)}?review=1&orderId=${encodeURIComponent(orderId)}&reviewId=${encodeURIComponent(eligibility.reviewId)}`
    : `/products/${encodeURIComponent(productSlug)}?review=1&orderId=${encodeURIComponent(orderId)}`;

  return (
    <Link
      href={href}
      className="sarjan-order-review-cta tf-btn btn-line btn-sm mt_8"
    >
      {eligibility.canEdit ? "Edit review" : "Rate product"}
    </Link>
  );
}
