import fs from "node:fs/promises";
import path from "node:path";
import { isPostgresEnabled, pgQuery } from "@/lib/postgres";

export type AppEngagementEventType = "install" | "app_open" | "session_start";

export type AppEngagementEvent = {
  event: AppEngagementEventType;
  platform: string;
  deviceId: string;
  clientId?: string;
  appVersion?: string;
  versionCode?: number;
  at: string;
};

type EngagementFile = {
  events: AppEngagementEvent[];
};

const DATA_PATH = path.join(process.cwd(), "data", "app-engagement.json");
const MAX_EVENTS = 20_000;

async function readFile(): Promise<EngagementFile> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as EngagementFile;
    return {
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return { events: [] };
  }
}

async function writeFile(data: EngagementFile) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function insertPgEvent(event: AppEngagementEvent) {
  if (!isPostgresEnabled()) return;
  try {
    await pgQuery(
      `insert into app_engagement_events
        (event, platform, client_id, device_id, app_version, version_code, created_at)
       values ($1, $2, $3, $4, $5, $6, $7::timestamptz)`,
      [
        event.event,
        event.platform,
        event.clientId ?? null,
        event.deviceId,
        event.appVersion ?? null,
        event.versionCode ?? null,
        event.at,
      ],
    );
  } catch {
    /* table may not exist yet — JSON store still works */
  }
}

export async function recordAppEngagementEvent(input: {
  event: AppEngagementEventType;
  platform: string;
  deviceId: string;
  clientId?: string;
  appVersion?: string;
  versionCode?: number;
}) {
  const deviceId = input.deviceId.trim();
  if (!deviceId) {
    throw new Error("deviceId required");
  }

  const event: AppEngagementEvent = {
    event: input.event,
    platform: input.platform.trim() || "unknown",
    deviceId,
    clientId: input.clientId?.trim() || undefined,
    appVersion: input.appVersion?.trim() || undefined,
    versionCode:
      typeof input.versionCode === "number" &&
      Number.isFinite(input.versionCode)
        ? Math.round(input.versionCode)
        : undefined,
    at: new Date().toISOString(),
  };

  const file = await readFile();
  if (input.event === "install") {
    const exists = file.events.some(
      (entry) => entry.event === "install" && entry.deviceId === deviceId,
    );
    if (exists) {
      return { recorded: false, duplicate: true };
    }
  }

  file.events.unshift(event);
  file.events = file.events.slice(0, MAX_EVENTS);
  await writeFile(file);
  await insertPgEvent(event);

  return { recorded: true, duplicate: false };
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

function inRange(iso: string, start: Date, end = new Date()) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

async function listEvents(): Promise<AppEngagementEvent[]> {
  if (isPostgresEnabled()) {
    try {
      const { rows } = await pgQuery<{
        event: string;
        platform: string;
        client_id: string | null;
        device_id: string;
        app_version: string | null;
        version_code: number | null;
        created_at: string;
      }>(
        `select event, platform, client_id, device_id, app_version, version_code, created_at
         from app_engagement_events
         order by created_at desc
         limit $1`,
        [MAX_EVENTS],
      );
      return rows.map((row) => ({
        event: row.event as AppEngagementEventType,
        platform: row.platform,
        deviceId: row.device_id,
        clientId: row.client_id ?? undefined,
        appVersion: row.app_version ?? undefined,
        versionCode:
          row.version_code != null ? Number(row.version_code) : undefined,
        at: String(row.created_at),
      }));
    } catch {
      /* fall through */
    }
  }
  const file = await readFile();
  return file.events;
}

export async function getAppInstallAnalytics() {
  const events = await listEvents();
  const installs = events.filter((entry) => entry.event === "install");
  const uniqueInstallDevices = new Set(installs.map((entry) => entry.deviceId));

  const now = new Date();
  const startToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const startWeek = daysAgo(7);
  const startMonth = daysAgo(30);

  const installInRange = (start: Date) =>
    installs.filter((entry) => inRange(entry.at, start)).length;

  const opens = events.filter((entry) => entry.event === "app_open");
  const opensToday = opens.filter((entry) => inRange(entry.at, startToday));
  const dauKeys = new Set(
    opensToday.map((entry) => `${dayKey(entry.at)}:${entry.deviceId}`),
  );
  const mauKeys = new Set(
    opens
      .filter((entry) => inRange(entry.at, startMonth))
      .map((entry) => `${dayKey(entry.at)}:${entry.deviceId}`),
  );

  const androidInstalls = installs.filter(
    (entry) => entry.platform.toLowerCase() === "android",
  ).length;
  const iosInstalls = installs.filter(
    (entry) => entry.platform.toLowerCase() === "ios",
  ).length;

  const trendDays = 14;
  const installTrend: Array<{ date: string; android: number; ios: number }> =
    [];
  const activeTrend: Array<{ date: string; dau: number }> = [];

  for (let offset = trendDays - 1; offset >= 0; offset -= 1) {
    const day = daysAgo(offset);
    const key = dayKey(day.toISOString());
    const dayStart = new Date(
      Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()),
    );
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const dayInstalls = installs.filter((entry) =>
      inRange(entry.at, dayStart, dayEnd),
    );
    installTrend.push({
      date: key,
      android: dayInstalls.filter(
        (entry) => entry.platform.toLowerCase() === "android",
      ).length,
      ios: dayInstalls.filter((entry) => entry.platform.toLowerCase() === "ios")
        .length,
    });

    const dayOpens = opens.filter((entry) =>
      inRange(entry.at, dayStart, dayEnd),
    );
    activeTrend.push({
      date: key,
      dau: new Set(dayOpens.map((entry) => entry.deviceId)).size,
    });
  }

  return {
    summary: {
      totalInstalls: uniqueInstallDevices.size,
      androidInstalls,
      iosInstalls,
      dau: dauKeys.size,
      mau: mauKeys.size,
      installsToday: installInRange(startToday),
      installsWeek: installInRange(startWeek),
      installsMonth: installInRange(startMonth),
    },
    installTrend,
    activeTrend,
  };
}
