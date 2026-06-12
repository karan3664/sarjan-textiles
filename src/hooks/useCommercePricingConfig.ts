"use client";

import { useEffect, useState } from "react";
import {
  fetchCommercePricingConfig,
  type CommercePricingConfig,
} from "@/lib/commerce-pricing-config-client";
import { DEFAULT_PLATFORM_FEE_CONFIG } from "@/lib/platform-fee-config";
import { DEFAULT_SHIPPING_CONFIG } from "@/lib/shipping-config";

const FALLBACK: CommercePricingConfig = {
  gstRate: 0.05,
  platformFee: DEFAULT_PLATFORM_FEE_CONFIG,
  shipping: DEFAULT_SHIPPING_CONFIG,
};

export function useCommercePricingConfig() {
  const [config, setConfig] = useState<CommercePricingConfig>(FALLBACK);

  useEffect(() => {
    let active = true;
    void fetchCommercePricingConfig().then((next) => {
      if (active) setConfig(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return config;
}
