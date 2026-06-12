function envBool(name: string, defaultValue = false) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return defaultValue;
  return ["1", "true", "yes", "on"].includes(raw);
}

function envNumber(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export type ShippingConfig = {
  enabled: boolean;
  /** INR charged per 100 pieces (or part thereof). */
  amountPer100Pieces: number;
};

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  enabled: true,
  amountPer100Pieces: 500,
};

export function normalizeShippingConfig(
  raw?: Partial<ShippingConfig> | null,
): ShippingConfig {
  const amount = Number(
    raw?.amountPer100Pieces ?? DEFAULT_SHIPPING_CONFIG.amountPer100Pieces,
  );
  return {
    enabled: raw?.enabled !== false,
    amountPer100Pieces: Number.isFinite(amount)
      ? Math.max(0, amount)
      : DEFAULT_SHIPPING_CONFIG.amountPer100Pieces,
  };
}

export function resolveShippingConfig(
  site?: { shipping?: Partial<ShippingConfig> | null } | null,
): ShippingConfig {
  const envDefaults: Partial<ShippingConfig> = {
    enabled: envBool("COMMERCE_SHIPPING_ENABLED", true),
    amountPer100Pieces: envNumber("COMMERCE_SHIPPING_PER_100_PIECES", 500),
  };
  return normalizeShippingConfig({
    ...envDefaults,
    ...site?.shipping,
  });
}

/** Shipping = ceil(totalPieces / 100) × amountPer100Pieces */
export function computeShippingCharges(
  totalPieces: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): number {
  const pieces = Math.max(0, Math.floor(Number(totalPieces) || 0));
  if (!config.enabled || pieces <= 0) return 0;
  const slabs = Math.ceil(pieces / 100);
  return slabs * config.amountPer100Pieces;
}
