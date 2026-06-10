"use client";

import { StorefrontErrorState } from "@/components/storefront/StorefrontErrorState";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <StorefrontErrorState onRetry={reset} />;
}
