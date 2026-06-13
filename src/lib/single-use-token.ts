import { isPostgresEnabled, pgQuery } from "@/lib/postgres";

type MemoryEntry = { consumedAt: number; expiresAt: number };
const memory = new Map<string, MemoryEntry>();

let tableReady: Promise<void> | null = null;

async function ensureSingleUseTable() {
  if (!isPostgresEnabled()) return;
  if (!tableReady) {
    tableReady = pgQuery(`
      CREATE TABLE IF NOT EXISTS single_use_tokens (
        token_key TEXT PRIMARY KEY,
        expires_at BIGINT NOT NULL,
        consumed_at BIGINT NOT NULL
      )
    `).then(() => undefined);
  }
  await tableReady;
}

/** Returns true on first consumption; false if already used or expired. */
export async function consumeSingleUseToken(
  key: string,
  expiresAtMs: number,
): Promise<boolean> {
  const now = Date.now();
  if (now > expiresAtMs) return false;

  if (isPostgresEnabled()) {
    try {
      await ensureSingleUseTable();
      const existing = await pgQuery<{ expires_at: string }>(
        `SELECT expires_at FROM single_use_tokens WHERE token_key = $1`,
        [key],
      );
      if (existing.rows[0]) return false;
      await pgQuery(
        `INSERT INTO single_use_tokens (token_key, expires_at, consumed_at)
         VALUES ($1, $2, $3)`,
        [key, expiresAtMs, now],
      );
      return true;
    } catch {
      /* fall through to memory */
    }
  }

  const current = memory.get(key);
  if (current) return false;
  memory.set(key, { consumedAt: now, expiresAt: expiresAtMs });
  return true;
}
