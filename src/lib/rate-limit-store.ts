import { isPostgresEnabled, pgQuery } from "@/lib/postgres";

type MemoryBucket = { count: number; resetAt: number };
const memory = new Map<string, MemoryBucket>();

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
