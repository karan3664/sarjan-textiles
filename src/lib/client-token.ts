import { createHmac } from "crypto";

export type ClientSession = {
  clientId: string;
  email: string;
  iat: number;
  exp: number;
};

function secret() {
  return process.env.CLIENT_JWT_SECRET || process.env.ADMIN_SESSION_SECRET || "sarjan-demo-client-secret-change-before-production";
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export function createClientToken(input: { clientId: string; email: string }) {
  const header = encode({ alg: "HS256", typ: "JWT" });
  const now = Date.now();
  const payload = encode({ ...input, iat: now, exp: now + 1000 * 60 * 60 * 24 * 7 });
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${sign(unsigned)}`;
}

export function verifyClientToken(token?: string | null): ClientSession | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const unsigned = `${parts[0]}.${parts[1]}`;
  if (!constantTimeEqual(sign(unsigned), parts[2])) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as ClientSession;
    if (!payload.clientId || !payload.email || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
}
