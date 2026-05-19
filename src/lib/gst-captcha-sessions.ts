/**
 * In-memory binding between our captcha session id and the Set-Cookie line
 * returned when we fetch the GST portal captcha image.
 *
 * Note: On multi-instance hosts (e.g. Vercel), GET /api/gst/captcha and
 * POST /api/gst/verify must hit the same instance, or the session is lost.
 * For production scale, replace with Redis / Upstash.
 */

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 600;

type Entry = { cookieHeader: string; createdAt: number };

const store = new Map<string, Entry>();

function prune() {
  const now = Date.now();
  for (const [id, row] of store) {
    if (now - row.createdAt > TTL_MS) store.delete(id);
  }
  if (store.size <= MAX_ENTRIES) return;
  const sorted = [...store.entries()].sort(
    (a, b) => a[1].createdAt - b[1].createdAt,
  );
  while (store.size > MAX_ENTRIES / 2 && sorted.length) {
    store.delete(sorted.shift()![0]);
  }
}

export function putGstCaptchaSession(cookieHeader: string): string {
  prune();
  const id = crypto.randomUUID();
  store.set(id, { cookieHeader, createdAt: Date.now() });
  return id;
}

/** Removes session (one-shot). Returns cookie header or null if missing/expired. */
export function takeGstCaptchaSession(id: string): string | null {
  prune();
  const row = store.get(id);
  store.delete(id);
  if (!row || Date.now() - row.createdAt > TTL_MS) return null;
  return row.cookieHeader;
}
