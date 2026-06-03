import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { getAuth, type Auth } from "firebase-admin/auth";

/**
 * Lazily-initialised Firebase Admin messaging client.
 *
 * Credentials are read from the environment so the site keeps working even when
 * push is not configured yet (every getter simply returns `null`). Supported:
 *   - `FIREBASE_SERVICE_ACCOUNT` — full service-account JSON (raw or base64).
 *   - or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.
 */
let cached: Messaging | null | undefined;
let cachedAuth: Auth | null | undefined;

function loadServiceAccount(): ServiceAccount | null {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw && raw.trim()) {
    try {
      const text = raw.trim().startsWith("{")
        ? raw
        : Buffer.from(raw, "base64").toString("utf8");
      const json = JSON.parse(text) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (json.project_id && json.client_email && json.private_key) {
        return {
          projectId: json.project_id,
          clientEmail: json.client_email,
          privateKey: json.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }
  return null;
}

/** Initialises (or reuses) the shared Firebase Admin app, or `null`. */
function getAdminApp(): App | null {
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) return null;
  return (
    getApps().find((existing) => existing.name === "fcm") ??
    initializeApp({ credential: cert(serviceAccount) }, "fcm")
  );
}

/** Returns the Admin Messaging client, or `null` when push is not configured. */
export function getFcm(): Messaging | null {
  if (cached !== undefined) return cached;
  const app = getAdminApp();
  if (!app) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[firebase-admin] Push disabled — set FIREBASE_SERVICE_ACCOUNT to enable.",
      );
    }
    cached = null;
    return cached;
  }
  cached = getMessaging(app);
  return cached;
}

/**
 * Returns the Admin Auth client (used to verify phone-login ID tokens),
 * or `null` when Firebase credentials are not configured.
 */
export function getFirebaseAuth(): Auth | null {
  if (cachedAuth !== undefined) return cachedAuth;
  const app = getAdminApp();
  if (!app) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[firebase-admin] Auth disabled — set FIREBASE_SERVICE_ACCOUNT to enable.",
      );
    }
    cachedAuth = null;
    return cachedAuth;
  }
  cachedAuth = getAuth(app);
  return cachedAuth;
}

export function isPushConfigured(): boolean {
  return getFcm() !== null;
}
