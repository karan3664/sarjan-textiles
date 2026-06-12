import {
  getClient,
  readLocalDb,
  writeLocalDb,
  type LocalClient,
} from "@/lib/local-db";
import { isPostgresEnabled, pgQuery } from "@/lib/postgres";

export type ClientActivitySegment = "active" | "inactive" | "dormant";

export type ClientActivityRow = {
  id: string;
  companyName: string;
  email: string;
  status: LocalClient["status"];
  segment: ClientActivitySegment;
  lastLoginAt?: string;
  lastAppOpenAt?: string;
  lastPurchaseAt?: string;
  lastActivityAt?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseTime(value?: string) {
  if (!value?.trim()) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function latestActivity(client: LocalClient) {
  return Math.max(
    parseTime(client.lastLoginAt),
    parseTime(client.lastAppOpenAt),
    parseTime(client.lastPurchaseAt),
  );
}

export function resolveClientActivitySegment(
  client: LocalClient,
  now = Date.now(),
): ClientActivitySegment {
  const last = latestActivity(client);
  if (!last) return "dormant";
  const ageDays = (now - last) / DAY_MS;
  if (ageDays <= 30) return "active";
  if (ageDays <= 90) return "inactive";
  return "dormant";
}

async function patchClientActivity(
  id: string,
  patch: Partial<
    Pick<LocalClient, "lastLoginAt" | "lastAppOpenAt" | "lastPurchaseAt">
  >,
) {
  if (isPostgresEnabled()) {
    try {
      const row: Record<string, unknown> = {};
      if (patch.lastLoginAt !== undefined)
        row.last_login_at = patch.lastLoginAt;
      if (patch.lastAppOpenAt !== undefined) {
        row.last_app_open_at = patch.lastAppOpenAt;
      }
      if (patch.lastPurchaseAt !== undefined) {
        row.last_purchase_at = patch.lastPurchaseAt;
      }
      if (Object.keys(row).length) {
        const keys = Object.keys(row);
        const sets = keys.map((key, index) => `${key} = $${index + 1}`);
        const params = [...keys.map((key) => row[key]), id];
        await pgQuery(
          `update clients set ${sets.join(", ")} where id = $${keys.length + 1}`,
          params,
        );
        return;
      }
    } catch {
      /* JSON fallback */
    }
  }

  const db = await readLocalDb();
  const client = db.clients.find((entry) => entry.id === id);
  if (!client) return;
  Object.assign(client, patch);
  await writeLocalDb(db);
}

export async function recordClientLogin(clientId: string) {
  const at = new Date().toISOString();
  await patchClientActivity(clientId, { lastLoginAt: at });
}

export async function recordClientAppOpen(clientId: string) {
  const at = new Date().toISOString();
  await patchClientActivity(clientId, { lastAppOpenAt: at });
}

export async function recordClientPurchase(clientId: string) {
  const at = new Date().toISOString();
  await patchClientActivity(clientId, { lastPurchaseAt: at });
}

export async function getClientActivityAnalytics() {
  const db = await readLocalDb();
  const rows: ClientActivityRow[] = db.clients.map((client) => {
    const lastActivityAtMs = latestActivity(client);
    return {
      id: client.id,
      companyName: client.companyName,
      email: client.email,
      status: client.status,
      segment: resolveClientActivitySegment(client),
      lastLoginAt: client.lastLoginAt,
      lastAppOpenAt: client.lastAppOpenAt,
      lastPurchaseAt: client.lastPurchaseAt,
      lastActivityAt: lastActivityAtMs
        ? new Date(lastActivityAtMs).toISOString()
        : undefined,
    };
  });

  const segments = {
    active: rows.filter((row) => row.segment === "active").length,
    inactive: rows.filter((row) => row.segment === "inactive").length,
    dormant: rows.filter((row) => row.segment === "dormant").length,
  };

  rows.sort(
    (a, b) => parseTime(b.lastActivityAt) - parseTime(a.lastActivityAt),
  );

  return { segments, clients: rows };
}

export async function getClientForActivity(clientId: string) {
  return getClient(clientId);
}
