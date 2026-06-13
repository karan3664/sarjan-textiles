import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { isPostgresEnabled, pgQuery } from "@/lib/postgres";

const FILE = path.join(process.cwd(), "data", "client-broadcast-reads.json");

type BroadcastReadEntry = {
  clientId: string;
  notificationId: string;
  readAt: string;
};

let tableReady: Promise<void> | null = null;

async function ensureBroadcastReadsTable() {
  if (!isPostgresEnabled()) return;
  if (!tableReady) {
    tableReady = pgQuery(`
      CREATE TABLE IF NOT EXISTS client_broadcast_reads (
        client_id TEXT NOT NULL,
        notification_id TEXT NOT NULL,
        read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (client_id, notification_id)
      )
    `).then(() => undefined);
  }
  await tableReady;
}

async function readLocalBroadcastReads(): Promise<BroadcastReadEntry[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as BroadcastReadEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalBroadcastReads(entries: BroadcastReadEntry[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(entries, null, 2), "utf8");
}

export async function getBroadcastReadIdsForClient(clientId: string) {
  if (isPostgresEnabled()) {
    try {
      await ensureBroadcastReadsTable();
      const { rows } = await pgQuery<{ notification_id: string }>(
        `SELECT notification_id FROM client_broadcast_reads WHERE client_id = $1`,
        [clientId],
      );
      return new Set(rows.map((row) => row.notification_id));
    } catch {
      /* fall through */
    }
  }
  const all = await readLocalBroadcastReads();
  return new Set(
    all
      .filter((entry) => entry.clientId === clientId)
      .map((entry) => entry.notificationId),
  );
}

export async function markBroadcastReadForClient(
  clientId: string,
  notificationId: string,
) {
  const readAt = new Date().toISOString();
  if (isPostgresEnabled()) {
    try {
      await ensureBroadcastReadsTable();
      await pgQuery(
        `INSERT INTO client_broadcast_reads (client_id, notification_id, read_at)
         VALUES ($1, $2, $3::timestamptz)
         ON CONFLICT (client_id, notification_id) DO NOTHING`,
        [clientId, notificationId, readAt],
      );
      return true;
    } catch {
      /* fall through */
    }
  }
  const all = await readLocalBroadcastReads();
  if (
    all.some(
      (entry) =>
        entry.clientId === clientId && entry.notificationId === notificationId,
    )
  ) {
    return true;
  }
  all.push({ clientId, notificationId, readAt });
  await writeLocalBroadcastReads(all);
  return true;
}
