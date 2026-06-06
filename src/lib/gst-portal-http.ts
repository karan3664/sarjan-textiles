import https from "node:https";

export const GST_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const GST_REFERER = "https://services.gst.gov.in/services/searchtp";
export const GST_ORIGIN = "https://services.gst.gov.in";

export type GstPortalResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

/** Shared agent for captcha fetch (GET-only warm-up). */
const gstPortalAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 8,
  timeout: 20_000,
});

function isRetryableGstNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  return (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EPIPE" ||
    error.message === "GST portal request timed out"
  );
}

function userFacingGstNetworkError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error(
      "GST portal is temporarily unreachable. Refresh the captcha or enter company name manually.",
    );
  }
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "ECONNRESET" || code === "EPIPE") {
    return new Error(
      "GST portal closed the server connection. This can repeat even with the correct captcha — enter trade and legal name manually below, or try again in a few minutes.",
    );
  }
  if (
    code === "ETIMEDOUT" ||
    error.message === "GST portal request timed out"
  ) {
    return new Error("GST lookup timed out. Try again.");
  }
  return error;
}

function parseSetCookieHeaders(
  headers: Record<string, string | string[] | undefined>,
): string[] {
  const raw = headers["set-cookie"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export function cookiePairsFromSetCookie(lines: string[]): string[] {
  return lines
    .map((line) => line.split(";")[0]?.trim())
    .filter((line): line is string => Boolean(line?.includes("=")));
}

export function cookiePairsFromHeader(cookieHeader: string): string[] {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.includes("="));
}

export function mergeCookiePairs(...groups: string[][]): string {
  const map = new Map<string, string>();
  for (const group of groups) {
    for (const pair of group) {
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      map.set(pair.slice(0, eq), pair);
    }
  }
  return [...map.values()].join("; ");
}

function gstPortalRequestOnce(
  method: "GET" | "POST",
  path: string,
  options: {
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    agent?: https.Agent;
  } = {},
): Promise<GstPortalResponse> {
  return new Promise((resolve, reject) => {
    const timeoutMs = options.timeoutMs ?? 15_000;
    const req = https.request(
      {
        protocol: "https:",
        hostname: "services.gst.gov.in",
        path,
        method,
        agent: options.agent ?? gstPortalAgent,
        headers: {
          "User-Agent": GST_UA,
          ...options.headers,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<
              string,
              string | string[] | undefined
            >,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("GST portal request timed out"));
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

export function gstPortalRequest(
  method: "GET" | "POST",
  path: string,
  options: {
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    agent?: https.Agent;
  } = {},
): Promise<GstPortalResponse> {
  return gstPortalRequestOnce(method, path, options);
}

export async function gstPortalRequestWithRetry(
  method: "GET" | "POST",
  path: string,
  options: {
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    agent?: https.Agent;
  } = {},
  attempts = 3,
): Promise<GstPortalResponse> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await gstPortalRequestOnce(method, path, options);
    } catch (error) {
      lastError = error;
      if (!isRetryableGstNetworkError(error) || attempt === attempts - 1) {
        throw userFacingGstNetworkError(error);
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw userFacingGstNetworkError(lastError);
}

/**
 * GST WAF expects search page + POST on the same session cookies from captcha.
 * Use a fresh non-pooled agent per attempt (serverless-safe).
 */
export async function postGstTaxpayerDetailsWithSession(
  captchaCookieHeader: string,
  payload: { gstin: string; captcha: string },
): Promise<GstPortalResponse> {
  if (!captchaCookieHeader.includes("CaptchaCookie=")) {
    throw new Error(
      "Captcha session expired. Refresh the image and try again.",
    );
  }

  const postHeaders: Record<string, string> = {
    "Content-Type": "application/json;charset=UTF-8",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-IN,en;q=0.9",
    Origin: GST_ORIGIN,
    Referer: GST_REFERER,
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    Connection: "close",
  };

  const body = JSON.stringify(payload);
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const verifyAgent = new https.Agent({
      keepAlive: false,
      maxSockets: 1,
      timeout: 25_000,
    });

    try {
      let cookieForPost = captchaCookieHeader;

      if (attempt > 0) {
        const warm = await gstPortalRequestOnce("GET", "/services/searchtp", {
          agent: verifyAgent,
          headers: {
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-IN,en;q=0.9",
            Referer: `${GST_ORIGIN}/`,
            Cookie: captchaCookieHeader,
          },
        });
        if (warm.status !== 200) {
          throw new Error(`GST search page HTTP ${warm.status}`);
        }
        cookieForPost = mergeCookiePairs(
          cookiePairsFromHeader(captchaCookieHeader),
          cookiePairsFromSetCookie(parseSetCookieHeaders(warm.headers)),
        );
      }

      const post = await gstPortalRequestOnce(
        "POST",
        "/services/api/search/taxpayerDetails",
        {
          agent: verifyAgent,
          headers: { ...postHeaders, Cookie: cookieForPost },
          body,
          timeoutMs: 20_000,
        },
      );
      return post;
    } catch (error) {
      lastError = error;
      if (!isRetryableGstNetworkError(error) || attempt === 3) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    } finally {
      verifyAgent.destroy();
    }
  }

  throw userFacingGstNetworkError(lastError);
}

/** @deprecated Use postGstTaxpayerDetailsWithSession */
export async function refreshGstPortalSessionForVerify(
  captchaCookieHeader: string,
): Promise<string> {
  const captchaPairs = cookiePairsFromHeader(captchaCookieHeader).filter(
    (pair) => pair.startsWith("CaptchaCookie="),
  );
  const warm = await gstPortalRequestWithRetry("GET", "/services/searchtp", {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  return mergeCookiePairs(
    cookiePairsFromSetCookie(parseSetCookieHeaders(warm.headers)),
    captchaPairs,
  );
}

/** Load the public search page so F5 / session cookies exist before captcha. */
export async function warmGstPortalSession(): Promise<string> {
  const res = await gstPortalRequestWithRetry("GET", "/services/searchtp", {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (res.status !== 200) {
    throw new Error(`GST search page HTTP ${res.status}`);
  }
  return mergeCookiePairs(
    cookiePairsFromSetCookie(parseSetCookieHeaders(res.headers)),
  );
}

function assertCaptchaImage(body: Buffer) {
  const prefix = body.subarray(0, 64).toString("utf8");
  if (prefix.includes("Request Rejected") || prefix.startsWith("<")) {
    throw new Error("GST portal blocked the captcha request");
  }
  const isPng = body[0] === 0x89 && body[1] === 0x50;
  if (!isPng) {
    throw new Error("GST captcha response was not an image");
  }
}

export async function fetchGstPortalCaptchaPng(): Promise<{
  png: Buffer;
  cookieHeader: string;
  contentType: string;
}> {
  const sessionCookies = await warmGstPortalSession();
  const rnd = Math.random().toString();
  const capRes = await gstPortalRequestWithRetry(
    "GET",
    `/services/captcha?rnd=${encodeURIComponent(rnd)}`,
    {
      headers: {
        Referer: GST_REFERER,
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: sessionCookies,
      },
    },
  );

  if (capRes.status !== 200) {
    throw new Error(`GST captcha HTTP ${capRes.status}`);
  }

  assertCaptchaImage(capRes.body);

  const cookieHeader = mergeCookiePairs(
    cookiePairsFromHeader(sessionCookies),
    cookiePairsFromSetCookie(parseSetCookieHeaders(capRes.headers)),
  );

  if (!cookieHeader.includes("CaptchaCookie=")) {
    throw new Error("GST captcha did not return CaptchaCookie");
  }

  const contentType =
    typeof capRes.headers["content-type"] === "string"
      ? capRes.headers["content-type"]
      : "image/png";

  return { png: capRes.body, cookieHeader, contentType };
}
