"use client";

import { sha256Hex } from "@/lib/sha256";

function isBrowserDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.includes("dev.sarjantextiles.com")
  );
}

export function isPasswordTransportHashEnabledClient(): boolean {
  if (process.env.NEXT_PUBLIC_PASSWORD_TRANSPORT_HASH === "1") return true;
  if (process.env.NEXT_PUBLIC_PASSWORD_TRANSPORT_HASH === "0") return false;
  if (isBrowserDevHost()) return true;
  return (
    process.env.NEXT_PUBLIC_APP_ENV === "development" ||
    process.env.NODE_ENV === "development"
  );
}

export async function hashPasswordForTransportClient(
  plaintext: string,
): Promise<string> {
  const normalized = plaintext.normalize("NFKC");
  if (typeof globalThis.crypto?.subtle?.digest === "function") {
    const bytes = new TextEncoder().encode(normalized);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return sha256Hex(normalized);
}

export async function preparePasswordField(plaintext: string): Promise<string> {
  if (!plaintext || !isPasswordTransportHashEnabledClient()) return plaintext;
  return hashPasswordForTransportClient(plaintext);
}

export async function preparePasswordFields<T extends Record<string, unknown>>(
  body: T,
  fields: readonly string[],
): Promise<T> {
  if (!isPasswordTransportHashEnabledClient()) return body;
  const next = { ...body };
  for (const key of fields) {
    const value = next[key];
    if (typeof value === "string" && value.trim()) {
      (next as Record<string, unknown>)[key] =
        await hashPasswordForTransportClient(value);
    }
  }
  return next;
}
