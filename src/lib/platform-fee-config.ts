export type PlatformFeeConfig = {
  enabled: boolean;
  amountInr: number;
  /** GST rate on platform fee (0.18 = 18%). */
  gstRate: number;
  label: string;
};

export const DEFAULT_PLATFORM_FEE_CONFIG: PlatformFeeConfig = {
  enabled: false,
  amountInr: 10,
  gstRate: 0.18,
  label: "Platform Fee",
};

export function normalizePlatformFeeConfig(
  raw?: Partial<PlatformFeeConfig> | null,
): PlatformFeeConfig {
  const amount = Number(
    raw?.amountInr ?? DEFAULT_PLATFORM_FEE_CONFIG.amountInr,
  );
  const gstRate = Number(raw?.gstRate ?? DEFAULT_PLATFORM_FEE_CONFIG.gstRate);
  return {
    enabled: Boolean(raw?.enabled),
    amountInr: Number.isFinite(amount) ? Math.max(0, amount) : 0,
    gstRate: Number.isFinite(gstRate) ? Math.max(0, gstRate) : 0.18,
    label: raw?.label?.trim() || DEFAULT_PLATFORM_FEE_CONFIG.label,
  };
}

export function resolvePlatformFeeConfig(
  site?: { platformFee?: Partial<PlatformFeeConfig> | null } | null,
): PlatformFeeConfig {
  return normalizePlatformFeeConfig(site?.platformFee);
}
