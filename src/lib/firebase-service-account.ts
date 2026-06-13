import type { ServiceAccount } from "firebase-admin/app";

function normalizePrivateKey(key: string): string {
  let normalized = key.trim().replace(/\\n/g, "\n");
  if (
    normalized.includes("BEGIN PRIVATE KEY") ||
    normalized.includes("BEGIN RSA PRIVATE KEY")
  ) {
    if (!normalized.includes("\n")) {
      normalized = normalized
        .replace(/-----BEGIN ([A-Z ]+)-----/, "-----BEGIN $1-----\n")
        .replace(/-----END ([A-Z ]+)-----/, "\n-----END $1-----");
    }
    return normalized.replace(/\r\n/g, "\n");
  }
  return normalized;
}

function decodeServiceAccountText(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) return trimmed;

  try {
    const once = Buffer.from(trimmed, "base64").toString("utf8").trim();
    if (once.startsWith("{")) return once;
    if (!once.startsWith("{")) {
      const twice = Buffer.from(once, "base64").toString("utf8").trim();
      if (twice.startsWith("{")) return twice;
    }
  } catch {
    /* fall through */
  }

  return null;
}

export function parseFirebaseServiceAccount(
  raw: string | undefined,
): ServiceAccount | null {
  if (!raw?.trim()) return null;

  const text = decodeServiceAccountText(raw);
  if (!text) return null;

  try {
    const json = JSON.parse(text) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!json.project_id || !json.client_email || !json.private_key) {
      return null;
    }
    return {
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: normalizePrivateKey(json.private_key),
    };
  } catch {
    return null;
  }
}

export function parseFirebaseServiceAccountFromEnv(): ServiceAccount | null {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw?.trim()) {
    const parsed = parseFirebaseServiceAccount(raw);
    if (parsed) return parsed;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKey),
    };
  }

  return null;
}
