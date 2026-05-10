"use client";

import { useEffect, useState } from "react";

function approvedClient() {
  try {
    const client = JSON.parse(window.localStorage.getItem("sarjan-client") ?? "null") as { status?: string } | null;
    return client?.status === "approved";
  } catch {
    return false;
  }
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
    const sync = () => setApproved(approvedClient());
    sync();
    window.addEventListener("sarjan-auth-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sarjan-auth-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (approved) {
    return <span className={className}>₹{amount.toLocaleString("en-IN")}{suffix}</span>;
  }

  return (
    <span className="sarjan-price-locked">
      {compact ? "Login for price" : "Create account for price. Price visible after admin approval."}
    </span>
  );
}
