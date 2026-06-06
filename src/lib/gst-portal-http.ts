import https from "node:https";

export const GST_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const GST_REFERER = "https://services.gst.gov.in/services/searchtp";
export const GST_ORIGIN = "https://services.gst.gov.in";

type GstPortalResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

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

function cookiePairsFromHeader(cookieHeader: string): string[] {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.includes("="));
}

export function gstPortalRequest(
  method: "GET" | "POST",
  path: string,
  options: {
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
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

/** Load the public search page so F5 / session cookies exist before captcha. */
export async function warmGstPortalSession(): Promise<string> {
  const res = await gstPortalRequest("GET", "/services/searchtp", {
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
  const capRes = await gstPortalRequest(
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
