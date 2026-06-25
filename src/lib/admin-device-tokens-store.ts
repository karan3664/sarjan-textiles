import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { AdminRole } from "@/lib/admin-token";
import type { DevicePlatform } from "@/lib/device-tokens";

type StoredAdminDeviceToken = {
  token: string;
  adminEmail: string;
  adminRole: AdminRole;
  platform: DevicePlatform;
  updatedAt: string;
};

const FILE = path.join(process.cwd(), "data", "admin-device-tokens.json");

async function readAll(): Promise<StoredAdminDeviceToken[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredAdminDeviceToken[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: StoredAdminDeviceToken[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function registerLocalAdminDeviceToken(input: {
  adminEmail: string;
  adminRole: AdminRole;
  token: string;
  platform: DevicePlatform;
}) {
  const all = await readAll();
  const now = new Date().toISOString();
  const without = all.filter((row) => row.token !== input.token);
  without.push({
    token: input.token,
    adminEmail: input.adminEmail.trim().toLowerCase(),
    adminRole: input.adminRole,
    platform: input.platform,
    updatedAt: now,
  });
  await writeAll(without);
}

export async function getLocalAdminDeviceTokens(): Promise<
  StoredAdminDeviceToken[]
> {
  return readAll();
}

export async function removeLocalAdminDeviceTokens(tokens: string[]) {
  if (!tokens.length) return;
  const stale = new Set(tokens.map((token) => token.trim()).filter(Boolean));
  const all = await readAll();
  await writeAll(all.filter((row) => !stale.has(row.token)));
}
