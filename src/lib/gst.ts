import {
  GST_ORIGIN,
  GST_REFERER,
  GST_UA,
  gstPortalRequest,
} from "@/lib/gst-portal-http";

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
    data.bnm,
    data.name,
    data.tradeNam,
    data.tradeName,
  ];
  return candidates
    .find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    ?.trim();
}

function pickTradeName(data: Record<string, unknown>) {
  const candidates = [data.tradeNam, data.tradeName, data.trade_name];
  return candidates
    .find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    ?.trim();
}

function pickStatus(data: Record<string, unknown>) {
  const candidates = [data.sts, data.status, data.gstStatus];
  return candidates
    .find(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    )
    ?.trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function portalErrorCode(root: Record<string, unknown>): string | null {
  if (typeof root.errorCode === "string") return root.errorCode;
  const nested = asRecord(root.error);
  const cd = nested?.error_cd;
  return typeof cd === "string" ? cd : null;
}

/** Map official portal / proxy error payloads to user-facing messages. */
function assertNoPortalError(
  payload: unknown,
  ctx?: { captchaAttempt?: boolean },
): void {
  const root = asRecord(payload);
  if (!root) return;

  const code = portalErrorCode(root);
  if (!code) return;

  if (code === "SWEB_9000") {
    if (ctx?.captchaAttempt) {
      throw new Error(
        "The 6-digit code did not match the captcha image. Refresh the image and try again.",
      );
    }
    throw new Error(
      "GST portal requires captcha for public search, so automated lookup cannot complete. Enter the legal name from your GST certificate; admin will verify during approval.",
    );
  }
  if (code === "SWEB_9035" || code === "SWEB_9032") {
    throw new Error(
      "GST portal rejected this number as invalid or not found. Check the GSTIN or enter company name manually.",
    );
  }
  if (code === "SWEB_9034" || code === "SWEB_9021") {
    throw new Error(
      "GST portal could not return taxpayer details for this number. Try again later or enter company name manually.",
    );
  }
  if (code === "SWEB_8000") {
    throw new Error(
      "GST portal is busy or unavailable. Enter company name manually; you can retry verification later.",
    );
  }
  if (code === "FO8000" || code === "FO8007") {
    throw new Error(
      "No taxpayer record returned for this GSTIN. Check the number or enter company name manually.",
    );
  }

  throw new Error(
    `GST lookup failed (${code}). Enter company name manually or configure SARJAN_GST_LOOKUP_URL for a captcha-capable or GSP-backed service.`,
  );
}

function parseGstResponse(
  gstin: string,
  payload: unknown,
): GstVerificationResult | null {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const data = (
    root.data && typeof root.data === "object" ? root.data : root
  ) as Record<string, unknown>;
  const legalName = pickCompanyName(data);
  if (!legalName) return null;
  return {
    gstin,
    legalName,
    tradeName: pickTradeName(data),
    status: pickStatus(data),
  };
}

/**
 * Optional HTTPS endpoint you operate (or a GSP / aggregator) that accepts
 * POST JSON `{ "gstin": "..." }` and returns either the portal-style JSON
 * (`lgnm`, `tradeNam`, …) or `{ "legalName": "...", "tradeName"?: "..." }`.
 */
async function verifyGstinViaConfiguredLookup(
  gstin: string,
  url: string,
  signal: AbortSignal,
): Promise<GstVerificationResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const secret = process.env.SARJAN_GST_LOOKUP_SECRET?.trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ gstin }),
    signal,
    cache: "no-store",
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const err = asRecord(payload)?.error;
    const msg =
      typeof err === "string"
        ? err
        : typeof asRecord(payload)?.message === "string"
          ? String(asRecord(payload)!.message)
          : "Configured GST lookup failed";
    throw new Error(msg);
  }

  assertNoPortalError(payload);
  const parsed = parseGstResponse(gstin, payload);
  if (parsed) return parsed;

  const flat = asRecord(payload);
  const legalName =
    flat && typeof flat.legalName === "string" ? flat.legalName.trim() : "";
  if (legalName) {
    return {
      gstin,
      legalName,
      tradeName:
        flat && typeof flat.tradeName === "string"
          ? flat.tradeName.trim()
          : undefined,
      status:
        flat && typeof flat.status === "string"
          ? flat.status.trim()
          : undefined,
    };
  }

  throw new Error(
    "Configured GST lookup did not return a company name. Check SARJAN_GST_LOOKUP_URL response shape.",
  );
}

/**
 * Same public search as https://services.gst.gov.in/services/searchtp :
 * POST taxpayerDetails with GSTIN + 6-digit captcha, using Cookie from the
 * captcha image response (see GET /api/gst/captcha).
 */
export async function verifyGstinWithPortalCaptcha(
  gstinInput: string,
  captcha: string,
  cookieHeader: string,
): Promise<GstVerificationResult> {
  const gstin = normalizeGstin(gstinInput);
  if (!isValidGstin(gstin)) throw new Error("Invalid GST number format");
  const digits = captcha.replace(/\D/g, "");
  if (!/^[0-9]{6}$/.test(digits)) {
    throw new Error(
      "Captcha must be exactly 6 digits as shown on the GST image",
    );
  }

  try {
    const res = await gstPortalRequest(
      "POST",
      "/services/api/search/taxpayerDetails",
      {
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          Accept: "application/json, text/plain",
          "Accept-Language": "en-US,en;q=0.9",
          Origin: GST_ORIGIN,
          Referer: GST_REFERER,
          Cookie: cookieHeader,
        },
        body: JSON.stringify({ gstin, captcha: digits }),
        timeoutMs: 15_000,
      },
    );

    let payload: unknown;
    try {
      payload = JSON.parse(res.body.toString("utf8")) as unknown;
    } catch {
      throw new Error("GST portal verification failed");
    }
    if (res.status !== 200) throw new Error("GST portal verification failed");
    assertNoPortalError(payload, { captchaAttempt: true });
    const parsed = parseGstResponse(gstin, payload);
    if (!parsed) throw new Error("GST portal did not return company name");
    return parsed;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Invalid GST number format"
    ) {
      throw error;
    }
    if (
      error instanceof Error &&
      error.message === "GST portal request timed out"
    ) {
      throw new Error("GST lookup timed out. Try again.");
    }
    if (error instanceof Error) throw error;
    throw new Error("GST portal verification failed");
  }
}

export async function verifyGstinFromPortal(
  gstinInput: string,
): Promise<GstVerificationResult> {
  const gstin = normalizeGstin(gstinInput);
  if (!isValidGstin(gstin)) throw new Error("Invalid GST number format");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const lookupUrl = process.env.SARJAN_GST_LOOKUP_URL?.trim();

  try {
    if (lookupUrl) {
      return await verifyGstinViaConfiguredLookup(
        gstin,
        lookupUrl,
        controller.signal,
      );
    }

    const res = await fetch(
      "https://services.gst.gov.in/services/api/search/taxpayerDetails",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          Accept: "application/json, text/plain",
          "Accept-Language": "en-US,en;q=0.9",
          Origin: "https://services.gst.gov.in",
          Referer: GST_REFERER,
          "User-Agent": GST_UA,
        },
        body: JSON.stringify({ gstin }),
        signal: controller.signal,
        cache: "no-store",
      },
    );

    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error("GST portal verification failed");

    assertNoPortalError(payload);

    const parsed = parseGstResponse(gstin, payload);
    if (!parsed) throw new Error("GST portal did not return company name");
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid GST number format")
      throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "GST lookup timed out. Enter company name manually or try again.",
      );
    }
    if (error instanceof Error) throw error;
    throw new Error(
      "GST portal unavailable or blocked verification. Please try again later.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
