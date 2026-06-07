import pg from "pg";

declare global {
  // eslint-disable-next-line no-var
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

export async function pgSelectAll<
  T extends pg.QueryResultRow = pg.QueryResultRow,
>(table: string) {
  return pgQuery<T>(`select * from ${table}`);
}

export async function pgInsertReturning<
  T extends pg.QueryResultRow = pg.QueryResultRow,
>(table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const placeholders = keys.map((_, index) => `$${index + 1}`);
  const { rows } = await pgQuery<T>(
    `insert into ${table} (${keys.join(", ")}) values (${placeholders.join(", ")}) returning *`,
    keys.map((key) => row[key]),
  );
  return rows[0] ?? null;
}

export async function pgUpsertReturning<
  T extends pg.QueryResultRow = pg.QueryResultRow,
>(table: string, row: Record<string, unknown>, conflictTarget: string) {
  const keys = Object.keys(row);
  const placeholders = keys.map((_, index) => `$${index + 1}`);
  const updates = keys
    .filter((key) => key !== conflictTarget)
    .map((key) => `${key} = excluded.${key}`);
  const { rows } = await pgQuery<T>(
    `insert into ${table} (${keys.join(", ")}) values (${placeholders.join(", ")})
     on conflict (${conflictTarget}) do update set ${updates.join(", ")}
     returning *`,
    keys.map((key) => row[key]),
  );
  return rows[0] ?? null;
}
