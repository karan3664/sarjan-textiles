import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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

function supabaseEnabled() {
  const v = (process.env.SUPABASE_ENABLED ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function supabaseDb() {
  if (!supabaseEnabled()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
  });
}

function canWriteJsonOverrideFile() {
  if (supabaseDb()) return false;
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

async function readOverridesFromSupabase(): Promise<OverridesFile | null> {
  const supabase = supabaseDb();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("admin_profile_overrides")
    .select("email, name, password_hash");

  if (error) throw new Error(error.message);

  const byEmail: Record<string, OverrideRow> = {};
  for (const row of data ?? []) {
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
    const fromDb = await readOverridesFromSupabase();
    if (fromDb) return fromDb;
  } catch {
    /* fall through to JSON for local dev */
  }
  return readOverridesFromFile();
}

async function writeOverridesToFile(data: OverridesFile) {
  if (!canWriteJsonOverrideFile()) {
    throw new Error(
      "Cannot persist admin profile on disk. Enable Supabase (SUPABASE_ENABLED=true) and run migration 20260523000000_admin_profile_overrides.sql.",
    );
  }
  await mkdir(path.dirname(OVERRIDE_FILE), { recursive: true });
  await writeFile(OVERRIDE_FILE, JSON.stringify(data, null, 2), "utf8");
}

async function writeOverridesToSupabase(data: OverridesFile) {
  const supabase = supabaseDb();
  if (!supabase) {
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

  const { error } = await supabase
    .from("admin_profile_overrides")
    .upsert(rows, { onConflict: "email" });
  if (error) throw new Error(error.message);
}

async function writeOverrides(data: OverridesFile) {
  const supabase = supabaseDb();
  if (supabase) {
    await writeOverridesToSupabase(data);
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
