import { createHash } from "crypto";
import { isDevelopmentEnv } from "@/lib/app-env";

/** SHA-256 hex of normalized password — sent by clients in dev instead of plaintext. */
export function hashPasswordForTransport(plaintext: string): string {
  const normalized = plaintext.normalize("NFKC");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function isTransportHashedPassword(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value.trim());
}

/** Dev-only: clients send SHA-256 hex; prod keeps plaintext until enabled later. */
export function isPasswordTransportHashEnabled(): boolean {
  if (process.env.PASSWORD_TRANSPORT_HASH === "1") return true;
  if (process.env.PASSWORD_TRANSPORT_HASH === "0") return false;
  return isDevelopmentEnv();
}

export function normalizePasswordFromClient(value: string): string {
  return value.trim();
}

/** Value stored/compared via bcrypt — transport hash or legacy plaintext. */
export function preparePasswordForStorage(fromClient: string): string {
  return normalizePasswordFromClient(fromClient);
}
