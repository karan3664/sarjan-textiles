export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function normalizeGstin(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidGstin(value: string) {
  return GSTIN_PATTERN.test(normalizeGstin(value));
}

/** Account already has a GSTIN and names from registration or a prior portal verify. */
export function isGstVerifiedOnFile(input: {
  gst?: string | null;
  companyName?: string | null;
  ownerLegalName?: string | null;
}) {
  const gstin = normalizeGstin(input.gst ?? "");
  if (!isValidGstin(gstin)) return false;
  return Boolean(input.companyName?.trim() && input.ownerLegalName?.trim());
}
