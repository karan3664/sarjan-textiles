export type ClientSession = {
  clientId: string;
  email: string;
  iat: number;
  exp: number;
};

function secret() {
  const value =
    process.env.CLIENT_JWT_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim();
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("CLIENT_JWT_SECRET is required in production");
  }
  return value || "sarjan-demo-client-secret-change-before-production";
}

function tokenFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === "sarjan-client-token") {
      return decodeURIComponent(rest.join("=")).trim() || null;
    }
  }
  return null;
}

function base64UrlEncode(value: string) {
  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

function encodeSegment(value: unknown) {
  return base64UrlEncode(JSON.stringify(value));
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1)
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  const bytes = Array.from(new Uint8Array(signature));
  return base64UrlEncode(String.fromCharCode(...bytes));
}

export async function createClientToken(input: {
  clientId: string;
  email: string;
}) {
  const header = encodeSegment({ alg: "HS256", typ: "JWT" });
  const now = Date.now();
  const payload = encodeSegment({
    ...input,
    iat: now,
    exp: now + 1000 * 60 * 60 * 24 * 7,
  });
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${await hmac(unsigned)}`;
}

export async function verifyClientToken(
  token?: string | null,
): Promise<ClientSession | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const unsigned = `${parts[0]}.${parts[1]}`;
  if (!parts[2] || !constantTimeEqual(parts[2], await hmac(unsigned)))
    return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as ClientSession;
    if (!payload.clientId || !payload.email || Date.now() > payload.exp)
      return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() || null;
  }
  return tokenFromCookieHeader(request.headers.get("cookie"));
}
