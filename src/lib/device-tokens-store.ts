import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { DevicePlatform } from "@/lib/device-tokens";

type StoredDeviceToken = {
  token: string;
  clientId: string;
  platform: DevicePlatform;
  updatedAt: string;
};

const FILE = path.join(process.cwd(), "data", "device-tokens.json");

async function readAll(): Promise<StoredDeviceToken[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredDeviceToken[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: StoredDeviceToken[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function registerLocalDeviceToken(input: {
  clientId: string;
  token: string;
  platform: DevicePlatform;
}) {
  const all = await readAll();
  const now = new Date().toISOString();
  const without = all.filter((row) => row.token !== input.token);
  without.push({
    token: input.token,
    clientId: input.clientId,
    platform: input.platform,
    updatedAt: now,
  });
  await writeAll(without);
}

export async function getLocalClientDeviceTokens(
  clientId: string,
): Promise<string[]> {
  const all = await readAll();
  return all
    .filter((row) => row.clientId === clientId)
    .map((row) => row.token.trim())
    .filter(Boolean);
}

export async function getLocalAllDeviceTokens(): Promise<string[]> {
  const all = await readAll();
  return Array.from(
    new Set(all.map((row) => row.token.trim()).filter(Boolean)),
  );
}

export async function removeLocalDeviceTokens(tokens: string[]) {
  if (!tokens.length) return;
  const stale = new Set(tokens.map((token) => token.trim()).filter(Boolean));
  const all = await readAll();
  await writeAll(all.filter((row) => !stale.has(row.token)));
}
