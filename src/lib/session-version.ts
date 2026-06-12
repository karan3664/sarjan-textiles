import { readFile, writeFile } from "fs/promises";
import path from "path";
import { isPostgresEnabled, pgQuery } from "@/lib/postgres";

const localDbPath = path.join(process.cwd(), "data", "local-db.json");

async function readJsonClientSessionVersion(clientId: string) {
  try {
    const raw = await readFile(localDbPath, "utf8");
    const db = JSON.parse(raw) as {
      clients?: Array<{ id: string; sessionVersion?: number }>;
    };
    const client = db.clients?.find((row) => row.id === clientId);
    return client?.sessionVersion ?? 0;
  } catch {
    return 0;
  }
}

async function bumpJsonClientSessionVersion(clientId: string) {
  try {
    const raw = await readFile(localDbPath, "utf8");
    const db = JSON.parse(raw) as {
      clients?: Array<{ id: string; sessionVersion?: number }>;
    };
    if (!Array.isArray(db.clients)) return;
    const client = db.clients.find((row) => row.id === clientId);
    if (!client) return;
    client.sessionVersion = (client.sessionVersion ?? 0) + 1;
    await writeFile(localDbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  } catch {
    /* best effort */
  }
}

async function ensureClientSessionVersionColumn() {
  if (!isPostgresEnabled()) return;
  await pgQuery(
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0`,
  ).catch(() => null);
}

export async function getClientSessionVersion(clientId: string) {
  if (isPostgresEnabled()) {
    try {
      await ensureClientSessionVersionColumn();
      const result = await pgQuery<{ session_version: number }>(
        `SELECT COALESCE(session_version, 0) AS session_version FROM clients WHERE id = $1 LIMIT 1`,
        [clientId],
      );
      if (result.rows[0]) {
        return Number(result.rows[0].session_version) || 0;
      }
    } catch {
      /* fall through — build container may lack DB access */
    }
  }
  return readJsonClientSessionVersion(clientId);
}

export async function bumpClientSessionVersion(clientId: string) {
  if (isPostgresEnabled()) {
    try {
      await ensureClientSessionVersionColumn();
      await pgQuery(
        `UPDATE clients SET session_version = COALESCE(session_version, 0) + 1 WHERE id = $1`,
        [clientId],
      );
      return;
    } catch {
      /* fall through */
    }
  }
  await bumpJsonClientSessionVersion(clientId);
}

async function ensureAdminVersionTable() {
  if (!isPostgresEnabled()) return;
  await pgQuery(`
    CREATE TABLE IF NOT EXISTS admin_session_versions (
      email TEXT PRIMARY KEY,
      version INTEGER NOT NULL DEFAULT 0
    )
  `);
}

export async function getAdminSessionVersion(email: string) {
  const normalized = email.trim().toLowerCase();
  if (isPostgresEnabled()) {
    try {
      await ensureAdminVersionTable();
      const result = await pgQuery<{ version: number }>(
        `SELECT version FROM admin_session_versions WHERE email = $1`,
        [normalized],
      );
      return result.rows[0]?.version ?? 0;
    } catch {
      /* fall through */
    }
  }
  return 0;
}

export async function bumpAdminSessionVersion(email: string) {
  const normalized = email.trim().toLowerCase();
  if (isPostgresEnabled()) {
    try {
      await ensureAdminVersionTable();
      await pgQuery(
        `INSERT INTO admin_session_versions (email, version)
         VALUES ($1, 1)
         ON CONFLICT (email)
         DO UPDATE SET version = admin_session_versions.version + 1`,
        [normalized],
      );
    } catch {
      /* best effort */
    }
  }
}
