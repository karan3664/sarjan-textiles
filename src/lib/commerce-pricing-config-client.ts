"use client";

import type { PlatformFeeConfig } from "@/lib/platform-fee-config";
import { DEFAULT_PLATFORM_FEE_CONFIG } from "@/lib/platform-fee-config";
import {
  DEFAULT_SHIPPING_CONFIG,
  type ShippingConfig,
} from "@/lib/shipping-config";

export type CommercePricingConfig = {
  gstRate: number;
  platformFee: PlatformFeeConfig;
  shipping: ShippingConfig;
};

const DEFAULT_CONFIG: CommercePricingConfig = {
  gstRate: 0.05,
  platformFee: DEFAULT_PLATFORM_FEE_CONFIG,
  shipping: DEFAULT_SHIPPING_CONFIG,
};

let cached: CommercePricingConfig | null = null;
let inflight: Promise<CommercePricingConfig> | null = null;

export async function fetchCommercePricingConfig(): Promise<CommercePricingConfig> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetch("/api/commerce/pricing-config", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : DEFAULT_CONFIG))
    .then((data) => {
      cached = {
        gstRate: Number(data.gstRate) || DEFAULT_CONFIG.gstRate,
        platformFee: {
          ...DEFAULT_PLATFORM_FEE_CONFIG,
          ...(data.platformFee ?? {}),
        },
        shipping: {
          ...DEFAULT_SHIPPING_CONFIG,
          ...(data.shipping ?? {}),
        },
      };
      return cached;
    })
    .catch(() => DEFAULT_CONFIG)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
