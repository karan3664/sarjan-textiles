import fs from "node:fs/promises";
import path from "node:path";
import type {
  PromotionAnalyticsRow,
  PromotionEventType,
  PromotionPlacement,
} from "@/lib/promotions-cms";

type AdMetrics = {
  views: number;
  clicks: number;
  title?: string;
  placement?: PromotionPlacement;
  lastEventAt?: string;
};

type AnalyticsStore = {
  ads: Record<string, AdMetrics>;
  recentEvents: Array<{
    adId: string;
    event: PromotionEventType;
    at: string;
    platform?: string;
    clientId?: string;
  }>;
};

const DATA_PATH = path.join(process.cwd(), "data", "promotion-analytics.json");

async function readStore(): Promise<AnalyticsStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as AnalyticsStore;
    return {
      ads: parsed.ads ?? {},
      recentEvents: Array.isArray(parsed.recentEvents)
        ? parsed.recentEvents
        : [],
    };
  } catch {
    return { ads: {}, recentEvents: [] };
  }
}

async function writeStore(store: AnalyticsStore) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function recordPromotionEvent(input: {
  adId: string;
  event: PromotionEventType;
  title?: string;
  placement?: PromotionPlacement;
  platform?: string;
  clientId?: string;
}) {
  const store = await readStore();
  const at = new Date().toISOString();
  const current = store.ads[input.adId] ?? { views: 0, clicks: 0 };

  if (input.event === "view") current.views += 1;
  if (input.event === "click") current.clicks += 1;
  current.lastEventAt = at;
  if (input.title) current.title = input.title;
  if (input.placement) current.placement = input.placement;

  store.ads[input.adId] = current;
  store.recentEvents.unshift({
    adId: input.adId,
    event: input.event,
    at,
    platform: input.platform,
    clientId: input.clientId,
  });
  store.recentEvents = store.recentEvents.slice(0, 200);
  await writeStore(store);

  return current;
}

export async function getPromotionAnalytics(): Promise<{
  rows: PromotionAnalyticsRow[];
  recentEvents: AnalyticsStore["recentEvents"];
}> {
  const store = await readStore();
  const rows = Object.entries(store.ads).map(([adId, metrics]) => {
    const views = metrics.views ?? 0;
    const clicks = metrics.clicks ?? 0;
    return {
      adId,
      title: metrics.title ?? adId,
      placement: metrics.placement ?? "web_home",
      views,
      clicks,
      ctr: views > 0 ? Math.round((clicks / views) * 1000) / 10 : 0,
      lastEventAt: metrics.lastEventAt,
    };
  });
  rows.sort((a, b) => b.views - a.views);
  return { rows, recentEvents: store.recentEvents };
}
