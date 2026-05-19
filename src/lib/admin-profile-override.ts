import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
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

async function readOverrides(): Promise<OverridesFile> {
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

async function writeOverrides(data: OverridesFile) {
  await mkdir(path.dirname(OVERRIDE_FILE), { recursive: true });
  await writeFile(OVERRIDE_FILE, JSON.stringify(data, null, 2), "utf8");
}

/** Merge disk overrides (display name, rotated password hash) onto base env config. */
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
