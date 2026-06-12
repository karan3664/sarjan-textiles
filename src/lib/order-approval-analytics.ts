import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { LocalOrder } from "@/lib/local-db";
import { getCmsSnapshot } from "@/lib/cms-store";
import {
  orderExceedsAvailableStock,
  reviewOrderStock,
} from "@/lib/order-stock-review";

export type OrderApprovalAnalytics = {
  ordersExceedingStock: number;
  productRequestCounts: Record<string, { name: string; count: number }>;
  productionRequirementCount: number;
  updatedAt: string;
};

const analyticsPath = path.join(
  process.cwd(),
  "data",
  "order-approval-analytics.json",
);

const defaultAnalytics = (): OrderApprovalAnalytics => ({
  ordersExceedingStock: 0,
  productRequestCounts: {},
  productionRequirementCount: 0,
  updatedAt: new Date().toISOString(),
});

async function readAnalytics(): Promise<OrderApprovalAnalytics> {
  try {
    const raw = await readFile(analyticsPath, "utf8");
    return { ...defaultAnalytics(), ...JSON.parse(raw) };
  } catch {
    return defaultAnalytics();
  }
}

async function writeAnalytics(data: OrderApprovalAnalytics) {
  await mkdir(path.dirname(analyticsPath), { recursive: true });
  await writeFile(analyticsPath, JSON.stringify(data, null, 2));
}

export async function getOrderApprovalAnalytics(): Promise<OrderApprovalAnalytics> {
  return readAnalytics();
}

export async function recordOrderPlacementAnalytics(order: LocalOrder) {
  const cms = await getCmsSnapshot();
  const bySlug = new Map(
    cms.products.map((product) => [product.slug, product]),
  );
  const reviews = reviewOrderStock(order.items, bySlug);
  const exceeds = orderExceedsAvailableStock(order.items, bySlug);
  const analytics = await readAnalytics();

  if (exceeds) {
    analytics.ordersExceedingStock += 1;
    analytics.productionRequirementCount += 1;
  }

  for (const line of reviews) {
    const current = analytics.productRequestCounts[line.slug] ?? {
      name: line.name,
      count: 0,
    };
    current.count += 1;
    analytics.productRequestCounts[line.slug] = current;
  }

  analytics.updatedAt = new Date().toISOString();
  await writeAnalytics(analytics);
}
