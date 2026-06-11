import fs from "node:fs/promises";
import path from "node:path";
import type {
  MobileBrandingAnalyticsRow,
  MobileBrandingEventType,
} from "@/lib/mobile-branding-cms";

type CampaignMetrics = {
  views: number;
  skipped: number;
  completed: number;
  conversions: number;
  clicks: number;
  iconActivations: number;
  lastEventAt?: string;
};

type AnalyticsStore = {
  campaigns: Record<string, CampaignMetrics & { campaignName?: string }>;
  recentEvents: Array<{
    type: MobileBrandingEventType;
    campaignId: string;
    campaignName?: string;
    at: string;
    platform?: string;
    durationMs?: number;
    skipped?: boolean;
  }>;
};

const DATA_PATH = path.join(
  process.cwd(),
  "data",
  "mobile-branding-analytics.json",
);

async function readStore(): Promise<AnalyticsStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as AnalyticsStore;
    return {
      campaigns: parsed.campaigns ?? {},
      recentEvents: Array.isArray(parsed.recentEvents)
        ? parsed.recentEvents
        : [],
    };
  } catch {
    return { campaigns: {}, recentEvents: [] };
  }
}

async function writeStore(store: AnalyticsStore) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf8");
}

function bumpMetric(metrics: CampaignMetrics, type: MobileBrandingEventType) {
  switch (type) {
    case "launch_animation_viewed":
    case "splash_viewed":
      metrics.views += 1;
      break;
    case "launch_animation_skipped":
    case "splash_skipped":
      metrics.skipped += 1;
      break;
    case "launch_animation_completed":
    case "splash_completed":
      metrics.completed += 1;
      break;
    case "launch_animation_duration":
      break;
    case "campaign_conversion":
      metrics.conversions += 1;
      break;
    case "campaign_click":
      metrics.clicks += 1;
      break;
    case "icon_activation":
      metrics.iconActivations += 1;
      break;
    default:
      break;
  }
}

export async function recordMobileBrandingEvent(input: {
  type: MobileBrandingEventType;
  campaignId: string;
  campaignName?: string;
  platform?: string;
  durationMs?: number;
  skipped?: boolean;
}) {
  const store = await readStore();
  const at = new Date().toISOString();
  const current = store.campaigns[input.campaignId] ?? {
    views: 0,
    skipped: 0,
    completed: 0,
    conversions: 0,
    clicks: 0,
    iconActivations: 0,
    campaignName: input.campaignName,
  };

  bumpMetric(current, input.type);
  current.lastEventAt = at;
  if (input.campaignName) {
    current.campaignName = input.campaignName;
  }
  store.campaigns[input.campaignId] = current;

  store.recentEvents.unshift({
    type: input.type,
    campaignId: input.campaignId,
    campaignName: input.campaignName,
    at,
    platform: input.platform,
    durationMs: input.durationMs,
    skipped: input.skipped,
  });
  store.recentEvents = store.recentEvents.slice(0, 500);

  await writeStore(store);
  return current;
}

export async function getMobileBrandingAnalytics(): Promise<{
  rows: MobileBrandingAnalyticsRow[];
  recentEvents: AnalyticsStore["recentEvents"];
}> {
  const store = await readStore();
  const rows = Object.entries(store.campaigns).map(([campaignId, metrics]) => {
    const views = metrics.views;
    const completed = metrics.completed;
    const conversions = metrics.conversions;
    return {
      campaignId,
      campaignName: metrics.campaignName ?? campaignId,
      views,
      skipped: metrics.skipped,
      completed,
      conversions,
      clicks: metrics.clicks,
      iconActivations: metrics.iconActivations,
      completionRate: views ? Math.round((completed / views) * 1000) / 10 : 0,
      conversionRate: views ? Math.round((conversions / views) * 1000) / 10 : 0,
      lastEventAt: metrics.lastEventAt,
    };
  });

  rows.sort((a, b) => b.views - a.views);
  return { rows, recentEvents: store.recentEvents };
}
