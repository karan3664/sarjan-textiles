import pg from "pg";
import {
  assertPgColumnName,
  assertPgColumnNames,
  assertPgTableName,
} from "@/lib/pg-sql-identifiers";

declare global {
   
  var __sarjanPgPool: pg.Pool | undefined;
}

export function isPostgresEnabled() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPgPool() {
  if (!isPostgresEnabled()) return null;
  if (!global.__sarjanPgPool) {
    global.__sarjanPgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 12,
    });
  }
  return global.__sarjanPgPool;
}

/** node-pg sends JS arrays as Postgres `{…}` arrays, not JSON — stringify for json/jsonb columns. */
export function serializePgValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value;
  return JSON.stringify(value);
}

export async function pgQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
) {
  const pool = getPgPool();
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }
  return pool.query<T>(text, params);
}

export async function pgWithTransaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPgPool();
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function pgInsertReturning<
  T extends pg.QueryResultRow = pg.QueryResultRow,
>(table: string, row: Record<string, unknown>) {
  assertPgTableName(table);
  const keys = Object.keys(row);
  assertPgColumnNames(keys);
  const placeholders = keys.map((_, index) => `$${index + 1}`);
  const { rows } = await pgQuery<T>(
    `insert into ${table} (${keys.join(", ")}) values (${placeholders.join(", ")}) returning *`,
    keys.map((key) => serializePgValue(row[key])),
  );
  return rows[0] ?? null;
}

export async function pgUpsertReturning<
  T extends pg.QueryResultRow = pg.QueryResultRow,
>(table: string, row: Record<string, unknown>, conflictTarget: string) {
  assertPgTableName(table);
  assertPgColumnName(conflictTarget);
  const keys = Object.keys(row);
  assertPgColumnNames(keys);
  const placeholders = keys.map((_, index) => `$${index + 1}`);
  const updates = keys
    .filter((key) => key !== conflictTarget)
    .map((key) => `${key} = excluded.${key}`);
  const { rows } = await pgQuery<T>(
    `insert into ${table} (${keys.join(", ")}) values (${placeholders.join(", ")})
     on conflict (${conflictTarget}) do update set ${updates.join(", ")}
     returning *`,
    keys.map((key) => serializePgValue(row[key])),
  );
  return rows[0] ?? null;
}

export async function pgUpdateReturning<
  T extends pg.QueryResultRow = pg.QueryResultRow,
>(table: string, idColumn: string, id: string, patch: Record<string, unknown>) {
  assertPgTableName(table);
  assertPgColumnName(idColumn);
  const keys = Object.keys(patch);
  if (!keys.length) return null;
  assertPgColumnNames(keys);
  const sets = keys.map((key, index) => `${key} = $${index + 1}`);
  const params = [...keys.map((key) => serializePgValue(patch[key])), id];
  const { rows } = await pgQuery<T>(
    `update ${table} set ${sets.join(", ")} where ${idColumn} = $${keys.length + 1} returning *`,
    params,
  );
  return rows[0] ?? null;
}
