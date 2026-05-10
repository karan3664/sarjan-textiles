export type GstVerificationResult = {
  gstin: string;
  legalName: string;
  tradeName?: string;
  status?: string;
  address?: string;
};

const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function normalizeGstin(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidGstin(value: string) {
  return gstinPattern.test(normalizeGstin(value));
}

function pickCompanyName(data: Record<string, unknown>) {
  const candidates = [
    data.lgnm,
    data.legalName,
    data.legal_name,
    data.companyName,
    data.company_name,
    data.tradeNam,
    data.tradeName,
  ];
  return candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function pickTradeName(data: Record<string, unknown>) {
  const candidates = [data.tradeNam, data.tradeName, data.trade_name];
  return candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function pickStatus(data: Record<string, unknown>) {
  const candidates = [data.sts, data.status, data.gstStatus];
  return candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function parseGstResponse(gstin: string, payload: unknown): GstVerificationResult | null {
  const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  const legalName = pickCompanyName(data);
  if (!legalName) return null;
  return {
    gstin,
    legalName,
    tradeName: pickTradeName(data),
    status: pickStatus(data),
  };
}

export async function verifyGstinFromPortal(gstinInput: string): Promise<GstVerificationResult> {
  const gstin = normalizeGstin(gstinInput);
  if (!isValidGstin(gstin)) throw new Error("Invalid GST number format");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://services.gst.gov.in/services/api/search/taxpayerDetails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: "https://services.gst.gov.in",
        Referer: "https://services.gst.gov.in/services/searchtp",
        "User-Agent": "Mozilla/5.0 SarjanTextiles/1.0",
      },
      body: JSON.stringify({ gstin }),
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error("GST portal verification failed");
    const parsed = parseGstResponse(gstin, payload);
    if (!parsed) throw new Error("GST portal did not return company name");
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid GST number format") throw error;
    throw new Error("GST portal unavailable or blocked verification. Please try again later.");
  } finally {
    clearTimeout(timeout);
  }
}
