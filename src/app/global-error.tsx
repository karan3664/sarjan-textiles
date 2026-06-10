"use client";

import { StorefrontErrorState } from "@/components/storefront/StorefrontErrorState";

export default function RootGlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="sarjan-storefront" suppressHydrationWarning>
        <StorefrontErrorState onRetry={reset} />
      </body>
    </html>
  );
}
