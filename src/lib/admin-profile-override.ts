import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { isPostgresEnabled, pgQuery, pgUpsertReturning } from "@/lib/postgres";
import type { ConfiguredAdmin } from "@/lib/admin-token";

const OVERRIDE_FILE = path.join(
  process.cwd(),
  "data",
  "admin-profile-overrides.json",
);

type OverrideRow = {
  name?: string;
  passwordHash?: string;
};

type OverridesFile = {
  byEmail: Record<string, OverrideRow>;
};

function canWriteJsonOverrideFile() {
  if (isPostgresEnabled()) return false;
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME)
    return false;
  return true;
}

async function readOverridesFromFile(): Promise<OverridesFile> {
  try {
    const raw = await readFile(OVERRIDE_FILE, "utf8");
    const parsed = JSON.parse(raw) as OverridesFile;
    if (!parsed?.byEmail || typeof parsed.byEmail !== "object") {
      return { byEmail: {} };
    }
    return parsed;
  } catch {
    return { byEmail: {} };
  }
}

async function readOverridesFromPostgres(): Promise<OverridesFile | null> {
  if (!isPostgresEnabled()) return null;

  const { rows } = await pgQuery(
    "select email, name, password_hash from admin_profile_overrides",
  );

  const byEmail: Record<string, OverrideRow> = {};
  for (const row of rows) {
    const key = String(row.email ?? "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    const entry: OverrideRow = {};
    if (typeof row.name === "string" && row.name.trim()) {
      entry.name = row.name.trim();
    }
    if (typeof row.password_hash === "string" && row.password_hash.trim()) {
      entry.passwordHash = row.password_hash.trim();
    }
    if (entry.name || entry.passwordHash) byEmail[key] = entry;
  }
  return { byEmail };
}

async function readOverrides(): Promise<OverridesFile> {
  try {
    const fromDb = await readOverridesFromPostgres();
    if (fromDb) return fromDb;
  } catch {
    /* fall through to JSON for local dev */
  }
  return readOverridesFromFile();
}

async function writeOverridesToFile(data: OverridesFile) {
  if (!canWriteJsonOverrideFile()) {
    throw new Error(
      "Cannot persist admin profile on disk. Set DATABASE_URL and run migration 20260523000000_admin_profile_overrides.sql on your VPS Postgres.",
    );
  }
  await mkdir(path.dirname(OVERRIDE_FILE), { recursive: true });
  await writeFile(OVERRIDE_FILE, JSON.stringify(data, null, 2), "utf8");
}

async function writeOverridesToPostgres(data: OverridesFile) {
  if (!isPostgresEnabled()) {
    await writeOverridesToFile(data);
    return;
  }

  const rows = Object.entries(data.byEmail).map(([email, row]) => ({
    email: email.toLowerCase(),
    name: row.name ?? null,
    password_hash: row.passwordHash ?? null,
    updated_at: new Date().toISOString(),
  }));

  if (!rows.length) return;

  for (const row of rows) {
    await pgUpsertReturning("admin_profile_overrides", row, "email");
  }
}

async function writeOverrides(data: OverridesFile) {
  if (isPostgresEnabled()) {
    await writeOverridesToPostgres(data);
    return;
  }
  await writeOverridesToFile(data);
}

/** Merge disk/DB overrides (display name, rotated password hash) onto base env config. */
export async function mergedConfiguredAdmins(
  base: ConfiguredAdmin[],
): Promise<ConfiguredAdmin[]> {
  const { byEmail } = await readOverrides();
  return base.map((admin) => {
    const key = admin.email.toLowerCase();
    const o = byEmail[key];
    if (!o) return admin;
    const next: ConfiguredAdmin = { ...admin };
    if (typeof o.name === "string" && o.name.trim().length > 0) {
      next.name = o.name.trim();
    }
    if (
      typeof o.passwordHash === "string" &&
      o.passwordHash.trim().length > 0
    ) {
      next.passwordHash = o.passwordHash.trim();
      next.password = undefined;
    }
    return next;
  });
}

export async function updateAdminProfileOverride(
  email: string,
  patch: { name?: string; passwordHash?: string },
) {
  const key = email.toLowerCase();
  const file = await readOverrides();
  const prev = file.byEmail[key] ?? {};
  file.byEmail[key] = {
    ...prev,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.passwordHash !== undefined
      ? { passwordHash: patch.passwordHash }
      : {}),
  };
  await writeOverrides(file);
}
