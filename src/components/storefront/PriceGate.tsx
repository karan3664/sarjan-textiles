"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Product } from "@/data/mock";
import { showProductSoldOutToViewer } from "@/lib/product-availability";

function subscribeClientApproved(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("sarjan-auth-updated", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("sarjan-auth-updated", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** Same rule as PriceGate: only approved B2B clients see numeric prices. */
export function clientHasApprovedPricing(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const client = JSON.parse(
      window.localStorage.getItem("sarjan-client") ?? "null",
    ) as { status?: unknown } | null;
    const raw = client?.status;
    const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    return s === "approved";
  } catch {
    return false;
  }
}

/** True when a client JWT is stored (same signal the header uses for “logged in”). */
function readClientB2BTokenPresent(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem("sarjan-client-token")?.trim());
}

export function useClientHasB2BToken(): boolean {
  return useSyncExternalStore(
    subscribeClientApproved,
    readClientB2BTokenPresent,
    () => false,
  );
}

/** Out-of-stock UI is shown only when a client session token exists. */
export function useShowProductSoldOut(
  product: Pick<Product, "stock">,
): boolean {
  const loggedIn = useClientHasB2BToken();
  return showProductSoldOutToViewer(product, loggedIn);
}

export function PriceGate({
  amount,
  suffix = "",
  className = "price",
  compact = false,
}: {
  amount: number;
  suffix?: string;
  className?: string;
  compact?: boolean;
}) {
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const sync = () => setApproved(clientHasApprovedPricing());
    sync();
    window.addEventListener("sarjan-auth-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sarjan-auth-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (approved) {
    return (
      <span className={className}>
        ₹{amount.toLocaleString("en-IN")}
        {suffix}
      </span>
    );
  }

  return (
    <span className="sarjan-price-locked">
      {compact
        ? "Login for price"
        : "Create account for price. Price visible after admin approval."}
    </span>
  );
}
