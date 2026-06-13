import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { getAuth, type Auth } from "firebase-admin/auth";
import { parseFirebaseServiceAccountFromEnv } from "@/lib/firebase-service-account";

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

function loadServiceAccount() {
  return parseFirebaseServiceAccountFromEnv();
}

/** Initialises (or reuses) the shared Firebase Admin app, or `null`. */
function getAdminApp(): App | null {
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) return null;
  try {
    return (
      getApps().find((existing) => existing.name === "fcm") ??
      initializeApp({ credential: cert(serviceAccount) }, "fcm")
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Firebase init error";
    console.error("[firebase-admin] Invalid credentials:", message);
    throw new Error(
      message.includes("private key")
        ? "Firebase private key is invalid. Re-encode FIREBASE_SERVICE_ACCOUNT as base64 in Coolify and redeploy."
        : `Firebase admin init failed: ${message}`,
    );
  }
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
