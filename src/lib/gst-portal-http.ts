import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import https from "node:https";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

export const GST_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const GST_REFERER = "https://services.gst.gov.in/services/searchtp";
export const GST_ORIGIN = "https://services.gst.gov.in";

export type GstPortalResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

type GstRequestOptions = {
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  agent?: https.Agent;
};

const GST_BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": GST_UA,
  "Accept-Language": "en-IN,en;q=0.9",
  "sec-ch-ua":
    '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

const gstPortalAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 8,
  timeout: 25_000,
  family: 4,
});

function isRetryableGstNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  return (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EPIPE" ||
    code === "ENOTFOUND" ||
    error.name === "AbortError" ||
    error.message === "GST portal request timed out" ||
    /fetch failed|network|socket hang up|empty reply/i.test(error.message)
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
    error.name === "AbortError" ||
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

function cookieHeaderFromNetscapeJar(jarText: string): string {
  const pairs: string[] = [];
  for (const line of jarText.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const parts = line.split("\t");
    if (parts.length < 7) continue;
    const name = parts[5]?.trim();
    const value = parts[6]?.trim();
    if (name && value) pairs.push(`${name}=${value}`);
  }
  return mergeCookiePairs(pairs);
}

function parseCurlHeaderFile(headerText: string): {
  status: number;
  headers: Record<string, string | string[] | undefined>;
} {
  const blocks = headerText.split(/\r?\n\r?\n/).filter(Boolean);
  const last = blocks[blocks.length - 1] ?? "";
  const lines = last.split(/\r?\n/);
  const statusLine = lines[0] ?? "";
  const statusMatch = statusLine.match(/HTTP\/[\d.]+ (\d+)/);
  const status = statusMatch ? Number(statusMatch[1]) : 0;
  const headers: Record<string, string | string[]> = {};

  for (const line of lines.slice(1)) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (!value) continue;
    if (key === "set-cookie") {
      const prev = headers[key];
      if (!prev) headers[key] = [value];
      else if (Array.isArray(prev)) prev.push(value);
      else headers[key] = [prev, value];
    } else {
      headers[key] = value;
    }
  }

  return { status, headers };
}

async function gstPortalRequestViaCurl(
  method: "GET" | "POST",
  urlPath: string,
  options: GstRequestOptions & { jarPath?: string; cookieHeader?: string } = {},
): Promise<GstPortalResponse> {
  const dir = await mkdtemp(path.join(tmpdir(), "gst-portal-"));
  const headerFile = path.join(dir, "headers.txt");
  const bodyFile = path.join(dir, "body.bin");
  const jarPath = options.jarPath ?? path.join(dir, "cookies.jar");
  const timeoutSec = Math.max(
    12,
    Math.ceil((options.timeoutMs ?? 28_000) / 1000),
  );

  try {
    const args = [
      "-sS",
      "-m",
      String(timeoutSec),
      "--http1.1",
      "--compressed",
      "-4",
      "-c",
      jarPath,
      "-D",
      headerFile,
      "-o",
      bodyFile,
    ];

    if (options.jarPath || options.cookieHeader) {
      args.push("-b", options.jarPath ?? options.cookieHeader ?? "");
    }

    if (method === "POST") {
      args.push("-X", "POST");
      if (options.body) args.push("--data-binary", options.body);
    }

    for (const [key, value] of Object.entries({
      ...GST_BROWSER_HEADERS,
      ...options.headers,
    })) {
      args.push("-H", `${key}: ${value}`);
    }

    args.push(`https://services.gst.gov.in${urlPath}`);
    await execFileAsync("curl", args, { maxBuffer: 12 * 1024 * 1024 });

    const body = await readFile(bodyFile);
    const headerText = await readFile(headerFile, "utf8");
    const { status, headers } = parseCurlHeaderFile(headerText);
    return { status, headers, body };
  } finally {
    if (!options.jarPath) {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

async function gstPortalRequestViaFetch(
  method: "GET" | "POST",
  urlPath: string,
  options: GstRequestOptions = {},
): Promise<GstPortalResponse> {
  const timeoutMs = options.timeoutMs ?? 25_000;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("GST portal request timed out")),
    timeoutMs,
  );

  try {
    const res = await fetch(`https://services.gst.gov.in${urlPath}`, {
      method,
      headers: {
        ...GST_BROWSER_HEADERS,
        ...options.headers,
      },
      body: options.body,
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });

    const headers: Record<string, string | string[] | undefined> = {};
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") return;
      headers[key.toLowerCase()] = value;
    });
    const setCookies =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
    if (setCookies.length > 0) {
      headers["set-cookie"] = setCookies;
    }

    return {
      status: res.status,
      headers,
      body: Buffer.from(await res.arrayBuffer()),
    };
  } finally {
    clearTimeout(timer);
  }
}

function gstPortalRequestViaHttps(
  method: "GET" | "POST",
  urlPath: string,
  options: GstRequestOptions = {},
): Promise<GstPortalResponse> {
  return new Promise((resolve, reject) => {
    const timeoutMs = options.timeoutMs ?? 25_000;
    const req = https.request(
      {
        protocol: "https:",
        hostname: "services.gst.gov.in",
        path: urlPath,
        method,
        agent: options.agent ?? gstPortalAgent,
        headers: {
          ...GST_BROWSER_HEADERS,
          ...options.headers,
        },
        family: 4,
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

type GstTransport = "curl" | "fetch" | "https";

const TRANSPORT_ORDER: GstTransport[] = ["curl", "fetch", "https"];

async function gstPortalRequestOnce(
  method: "GET" | "POST",
  urlPath: string,
  options: GstRequestOptions & { jarPath?: string; cookieHeader?: string } = {},
  transport: GstTransport = "curl",
): Promise<GstPortalResponse> {
  if (transport === "curl") {
    return gstPortalRequestViaCurl(method, urlPath, options);
  }
  if (transport === "https") {
    return gstPortalRequestViaHttps(method, urlPath, options);
  }
  return gstPortalRequestViaFetch(method, urlPath, options);
}

export function gstPortalRequest(
  method: "GET" | "POST",
  urlPath: string,
  options: GstRequestOptions = {},
): Promise<GstPortalResponse> {
  return gstPortalRequestWithRetry(method, urlPath, options, 4);
}

export async function gstPortalRequestWithRetry(
  method: "GET" | "POST",
  urlPath: string,
  options: GstRequestOptions = {},
  attempts = 5,
): Promise<GstPortalResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const transport = TRANSPORT_ORDER[attempt % TRANSPORT_ORDER.length];
    try {
      return await gstPortalRequestOnce(method, urlPath, options, transport);
    } catch (error) {
      lastError = error;
      if (!isRetryableGstNetworkError(error) || attempt === attempts - 1) {
        throw userFacingGstNetworkError(error);
      }
      await new Promise((resolve) => setTimeout(resolve, 450 * (attempt + 1)));
    }
  }

  throw userFacingGstNetworkError(lastError);
}

async function refreshCookiesViaSearchPage(
  captchaCookieHeader: string,
): Promise<string> {
  const warm = await gstPortalRequestViaCurl("GET", "/services/searchtp", {
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      Referer: `${GST_ORIGIN}/`,
    },
    cookieHeader: captchaCookieHeader,
    timeoutMs: 28_000,
  });
  if (warm.status !== 200) {
    throw new Error(`GST search page HTTP ${warm.status}`);
  }
  return mergeCookiePairs(
    cookiePairsFromHeader(captchaCookieHeader),
    cookiePairsFromSetCookie(parseSetCookieHeaders(warm.headers)),
  );
}

/**
 * GST WAF expects search page + POST on the same session cookies from captcha.
 * Uses curl first (closest to a real browser session on VPS/datacenter hosts).
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
    Origin: GST_ORIGIN,
    Referer: GST_REFERER,
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
  };

  const body = JSON.stringify(payload);
  let lastError: unknown;
  const maxAttempts = 6;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const transport = TRANSPORT_ORDER[attempt % TRANSPORT_ORDER.length];

    try {
      const cookieForPost =
        await refreshCookiesViaSearchPage(captchaCookieHeader);

      const post = await gstPortalRequestOnce(
        "POST",
        "/services/api/search/taxpayerDetails",
        {
          headers: postHeaders,
          body,
          cookieHeader: cookieForPost,
          timeoutMs: 30_000,
        },
        transport,
      );
      return post;
    } catch (error) {
      lastError = error;
      if (!isRetryableGstNetworkError(error) || attempt === maxAttempts - 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
    }
  }

  throw userFacingGstNetworkError(lastError);
}

/** @deprecated Use postGstTaxpayerDetailsWithSession */
export async function refreshGstPortalSessionForVerify(
  captchaCookieHeader: string,
): Promise<string> {
  return refreshCookiesViaSearchPage(captchaCookieHeader);
}

/** Load the public search page so F5 / session cookies exist before captcha. */
export async function warmGstPortalSession(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "gst-warm-"));
  const jarPath = path.join(dir, "cookies.jar");

  try {
    const res = await gstPortalRequestViaCurl("GET", "/services/searchtp", {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      jarPath,
      timeoutMs: 28_000,
    });
    if (res.status !== 200) {
      throw new Error(`GST search page HTTP ${res.status}`);
    }
    const jarText = await readFile(jarPath, "utf8");
    return cookieHeaderFromNetscapeJar(jarText);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
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
  const dir = await mkdtemp(path.join(tmpdir(), "gst-cap-"));
  const jarPath = path.join(dir, "cookies.jar");

  try {
    const warm = await gstPortalRequestViaCurl("GET", "/services/searchtp", {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      jarPath,
      timeoutMs: 28_000,
    });
    if (warm.status !== 200) {
      throw new Error(`GST search page HTTP ${warm.status}`);
    }

    const rnd = Math.random().toString();
    const capRes = await gstPortalRequestViaCurl(
      "GET",
      `/services/captcha?rnd=${encodeURIComponent(rnd)}`,
      {
        headers: {
          Referer: GST_REFERER,
          Accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
        jarPath,
        timeoutMs: 28_000,
      },
    );

    if (capRes.status !== 200) {
      throw new Error(`GST captcha HTTP ${capRes.status}`);
    }

    assertCaptchaImage(capRes.body);

    const cookieHeader = mergeCookiePairs(
      cookiePairsFromHeader(
        cookieHeaderFromNetscapeJar(await readFile(jarPath, "utf8")),
      ),
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
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
