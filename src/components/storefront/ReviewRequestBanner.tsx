"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clientAuthJsonHeaders } from "@/lib/client-auth-browser";

type PendingReview = {
  orderId: string;
  productSlug: string;
  productName: string;
};

export function ReviewRequestBanner() {
  const [pending, setPending] = useState<PendingReview | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/reviews/eligible", {
          credentials: "include",
          headers: clientAuthJsonHeaders(),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          pending?: PendingReview[];
        };
        if (!cancelled) {
          setPending(data.pending?.[0] ?? null);
        }
      } catch {
        if (!cancelled) setPending(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!pending) return null;

  return (
    <div className="sarjan-review-request-banner mb_24">
      <div>
        <p className="sarjan-review-request-banner__title mb_4">
          How was your experience?
        </p>
        <p className="text-secondary mb_0">
          Rate your purchase of {pending.productName}
        </p>
      </div>
      <Link
        href={`/products/${encodeURIComponent(pending.productSlug)}?review=1&orderId=${encodeURIComponent(pending.orderId)}`}
        className="tf-btn btn-fill btn-sm radius-4"
      >
        Rate product
      </Link>
    </div>
  );
}
