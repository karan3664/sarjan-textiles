import { isPostgresEnabled, pgQuery } from "@/lib/postgres";

type MemoryBucket = { count: number; resetAt: number };
const memory = new Map<string, MemoryBucket>();

function purgeExpiredMemoryBuckets(
  store: Map<string, MemoryBucket>,
  now: number,
) {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

let tableReady: Promise<void> | null = null;

async function ensureRateLimitTable() {
  if (!isPostgresEnabled()) return;
  if (!tableReady) {
    tableReady = pgQuery(`
      CREATE TABLE IF NOT EXISTS rate_limit_buckets (
        bucket_key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at BIGINT NOT NULL
      )
    `).then(() => undefined);
  }
  await tableReady;
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();

  if (isPostgresEnabled()) {
    try {
      await ensureRateLimitTable();
      const existing = await pgQuery<{
        count: number;
        reset_at: string;
      }>(
        `SELECT count, reset_at FROM rate_limit_buckets WHERE bucket_key = $1`,
        [key],
      );
      const row = existing.rows[0];
      if (!row || Number(row.reset_at) <= now) {
        const resetAt = now + windowMs;
        await pgQuery(
          `INSERT INTO rate_limit_buckets (bucket_key, count, reset_at)
           VALUES ($1, 1, $2)
           ON CONFLICT (bucket_key)
           DO UPDATE SET count = 1, reset_at = EXCLUDED.reset_at`,
          [key, resetAt],
        );
        return { allowed: true, remaining: limit - 1, resetAt };
      }

      const resetAt = Number(row.reset_at);
      const nextCount = Number(row.count) + 1;
      await pgQuery(
        `UPDATE rate_limit_buckets SET count = $1 WHERE bucket_key = $2`,
        [nextCount, key],
      );
      return {
        allowed: nextCount <= limit,
        remaining: Math.max(0, limit - nextCount),
        resetAt,
      };
    } catch {
      /* fall through to memory */
    }
  }

  const current = memory.get(key);
  if (!current || current.resetAt <= now) {
    purgeExpiredMemoryBuckets(memory, now);
    const resetAt = now + windowMs;
    memory.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  current.count += 1;
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

const otpAttemptMemory = new Map<string, MemoryBucket>();

async function readAttemptBucket(key: string) {
  const now = Date.now();
  if (isPostgresEnabled()) {
    try {
      await ensureRateLimitTable();
      const existing = await pgQuery<{ count: number; reset_at: string }>(
        `SELECT count, reset_at FROM rate_limit_buckets WHERE bucket_key = $1`,
        [key],
      );
      const row = existing.rows[0];
      if (!row || Number(row.reset_at) <= now) return null;
      return { count: Number(row.count), resetAt: Number(row.reset_at) };
    } catch {
      /* fall through to memory */
    }
  }
  const current = otpAttemptMemory.get(key);
  if (!current || current.resetAt <= now) return null;
  return current;
}

async function writeAttemptBucket(key: string, count: number, resetAt: number) {
  if (isPostgresEnabled()) {
    try {
      await ensureRateLimitTable();
      await pgQuery(
        `INSERT INTO rate_limit_buckets (bucket_key, count, reset_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (bucket_key)
         DO UPDATE SET count = EXCLUDED.count, reset_at = EXCLUDED.reset_at`,
        [key, count, resetAt],
      );
      return;
    } catch {
      /* fall through to memory */
    }
  }
  otpAttemptMemory.set(key, { count, resetAt });
  purgeExpiredMemoryBuckets(otpAttemptMemory, Date.now());
}

/** Failed OTP guesses for one signed session (invalidates OTP after maxAttempts). */
export async function incrementOtpFailedAttempt(
  key: string,
  expiresAtMs: number,
) {
  const now = Date.now();
  const resetAt = Math.max(expiresAtMs, now);
  const current = await readAttemptBucket(key);
  const nextCount = !current || current.resetAt <= now ? 1 : current.count + 1;
  await writeAttemptBucket(key, nextCount, resetAt);
  return nextCount;
}

export async function isOtpAttemptsBlocked(key: string, maxAttempts: number) {
  const current = await readAttemptBucket(key);
  if (!current) return false;
  return current.count >= maxAttempts;
}

export async function clearOtpAttempts(key: string) {
  if (isPostgresEnabled()) {
    try {
      await ensureRateLimitTable();
      await pgQuery(`DELETE FROM rate_limit_buckets WHERE bucket_key = $1`, [
        key,
      ]);
      return;
    } catch {
      /* fall through to memory */
    }
  }
  otpAttemptMemory.delete(key);
}
