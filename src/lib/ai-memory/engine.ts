import type { Product } from "@/data/mock";
import { getCatalogProducts } from "@/lib/catalog";
import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { readEnglish } from "@/lib/cms-localize";
import { applyProductDeals } from "@/lib/product-deal";
import { resolveProducts } from "@/lib/product-localize";
import {
  findCatalogProduct,
  getProductRecommendations,
} from "@/lib/product-recommendations";
import { isPostgresEnabled, pgQuery } from "@/lib/postgres";
import { readLocalDb } from "@/lib/local-db";
import {
  listAiUserInterests,
  listAiUserRecommendations,
  saveAiUserRecommendation,
  trackAiMemoryEvent,
} from "@/lib/ai-memory/store";
import type {
  AiMemoryRecommendationKind,
  AiMemoryRecommendationsPayload,
  AiRevenueDashboard,
  MemoryRecommendationBlock,
  TrackAiMemoryInput,
} from "@/lib/ai-memory/types";
import { productsToBotPreviews } from "@/lib/ai-sales/recommendations";

export { trackAiMemoryEvent };

function blockTitle(kind: AiMemoryRecommendationKind) {
  switch (kind) {
    case "recommended_products":
      return "Recommended for you";
    case "continue_shopping":
      return "Continue shopping";
    case "similar_products":
      return "Similar products";
    case "best_sellers":
      return "Best sellers";
    case "frequently_bought_together":
      return "Frequently bought together";
    case "premium_alternatives":
      return "Premium alternatives";
    default:
      return "Recommended";
  }
}

async function localizedCatalog() {
  const { products: rawProducts } = await getLocalizedCmsSnapshot();
  return applyProductDeals(resolveProducts(rawProducts, "en"));
}

export async function buildMemoryRecommendations(input: {
  clientId: string;
  source?: "web" | "app";
  refSlug?: string;
  limit?: number;
}): Promise<AiMemoryRecommendationsPayload> {
  const limit = Math.min(Math.max(input.limit ?? 6, 1), 8);
  const interests = await listAiUserInterests(input.clientId, 30);
  const catalog = await localizedCatalog();
  const topProductSlugs = interests
    .filter((row) => row.productSlug)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.productSlug!)
    .filter((slug, index, list) => list.indexOf(slug) === index);

  const refSlug = input.refSlug?.trim() || topProductSlugs[0] || "";
  const refProduct = refSlug ? findCatalogProduct(catalog, refSlug) : undefined;

  const blocks: MemoryRecommendationBlock[] = [];

  if (topProductSlugs.length) {
    const continueItems = topProductSlugs
      .map((slug) => findCatalogProduct(catalog, slug))
      .filter((product): product is Product => product != null)
      .slice(0, limit);
    if (continueItems.length) {
      blocks.push({
        kind: "continue_shopping",
        title: blockTitle("continue_shopping"),
        reason: "Based on your recent browsing and cart activity",
        products: productsToBotPreviews(continueItems, limit),
      });
      await saveAiUserRecommendation({
        clientId: input.clientId,
        kind: "continue_shopping",
        productSlugs: continueItems.map((p) => p.slug),
        source: input.source,
        ttlHours: 24,
      });
    }
  }

  const scored = interests
    .filter((row) => row.productSlug)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => findCatalogProduct(catalog, row.productSlug!))
    .filter((product): product is Product => product != null);
  if (scored.length) {
    blocks.push({
      kind: "recommended_products",
      title: blockTitle("recommended_products"),
      reason: "Personalized from your Sarjan AI activity",
      products: productsToBotPreviews(scored, limit),
    });
    await saveAiUserRecommendation({
      clientId: input.clientId,
      kind: "recommended_products",
      productSlugs: scored.map((p) => p.slug),
      source: input.source,
      ttlHours: 24,
    });
  }

  if (refProduct) {
    const { similar, boughtTogether } = await getProductRecommendations({
      ref: refProduct.slug,
      clientId: input.clientId,
      limit,
    });
    if (similar.length) {
      blocks.push({
        kind: "similar_products",
        title: blockTitle("similar_products"),
        reason: `Similar to **${refProduct.name}**`,
        products: productsToBotPreviews(similar, limit),
      });
      await saveAiUserRecommendation({
        clientId: input.clientId,
        kind: "similar_products",
        productSlugs: similar.map((p) => p.slug),
        source: input.source,
        context: { refSlug: refProduct.slug },
        ttlHours: 12,
      });
    }
    if (boughtTogether.length) {
      blocks.push({
        kind: "frequently_bought_together",
        title: blockTitle("frequently_bought_together"),
        reason: `Often ordered with **${refProduct.name}**`,
        products: productsToBotPreviews(boughtTogether, limit),
      });
      await saveAiUserRecommendation({
        clientId: input.clientId,
        kind: "frequently_bought_together",
        productSlugs: boughtTogether.map((p) => p.slug),
        source: input.source,
        context: { refSlug: refProduct.slug },
        ttlHours: 12,
      });
    }

    const premium = catalog
      .filter(
        (candidate) =>
          candidate.slug !== refProduct.slug &&
          candidate.price >= refProduct.price * 1.08,
      )
      .sort((a, b) => b.sold - a.sold || b.price - a.price)
      .slice(0, limit);
    if (premium.length) {
      blocks.push({
        kind: "premium_alternatives",
        title: blockTitle("premium_alternatives"),
        reason: `Upgrade options near **${refProduct.name}**`,
        products: productsToBotPreviews(premium, limit),
      });
      await saveAiUserRecommendation({
        clientId: input.clientId,
        kind: "premium_alternatives",
        productSlugs: premium.map((p) => p.slug),
        source: input.source,
        context: { refSlug: refProduct.slug },
        ttlHours: 12,
      });
    }
  }

  const bestSellers = (
    await getCatalogProducts({
      clientId: input.clientId,
      limit,
      page: 1,
      sort: "best-selling",
    })
  ).items;
  if (bestSellers.length) {
    blocks.push({
      kind: "best_sellers",
      title: blockTitle("best_sellers"),
      reason: "Top wholesale picks this season",
      products: productsToBotPreviews(bestSellers, limit),
    });
    await saveAiUserRecommendation({
      clientId: input.clientId,
      kind: "best_sellers",
      productSlugs: bestSellers.map((p) => p.slug),
      source: input.source,
      ttlHours: 6,
    });
  }

  const cached = await listAiUserRecommendations(input.clientId);
  return {
    blocks: blocks.slice(0, 5),
    interests,
    generatedAt: new Date().toISOString(),
    cachedRecommendationKinds: cached.map((row) => row.kind),
  };
}

export async function mirrorBotEventToMemory(
  input: TrackAiMemoryInput & { sessionId?: string },
) {
  return trackAiMemoryEvent(input);
}

export async function getAiRevenueDashboard(): Promise<AiRevenueDashboard> {
  const db = await readLocalDb();
  const aiOrders = db.orders.filter((order) => order.placedVia === "ai_bot");
  const aiRevenueInr = aiOrders.reduce((sum, order) => sum + order.subtotal, 0);

  const catalog = await localizedCatalog();
  const catalogBySlug = new Map(
    catalog.map((product) => [product.slug, product]),
  );

  const productMap = new Map<
    string,
    { slug: string; name: string; orders: number; revenueInr: number }
  >();
  const categoryMap = new Map<
    string,
    { category: string; orders: number; revenueInr: number }
  >();

  for (const order of aiOrders) {
    for (const line of order.items) {
      const slug = line.slug;
      const name = line.name || slug;
      const current = productMap.get(slug) ?? {
        slug,
        name,
        orders: 0,
        revenueInr: 0,
      };
      current.orders += 1;
      current.revenueInr += line.lineTotal;
      productMap.set(slug, current);

      const product = catalogBySlug.get(slug);
      const category = product
        ? readEnglish(product.category)
        : "Uncategorized";
      const cat = categoryMap.get(category) ?? {
        category,
        orders: 0,
        revenueInr: 0,
      };
      cat.orders += 1;
      cat.revenueInr += line.lineTotal;
      categoryMap.set(category, cat);
    }
  }

  let totalSessions = 0;
  let sessionsWithOrder = 0;
  const leadsByIntent: Record<string, number> = {
    purchase_intent: 0,
    abandoned_cart: 0,
    general: 0,
  };

  if (isPostgresEnabled()) {
    try {
      const { rows } = await pgQuery<{
        total_sessions: string;
        sessions_with_order: string;
      }>(`
        select
          count(*)::text as total_sessions,
          count(*) filter (where orders_placed > 0)::text as sessions_with_order
        from ai_chat_sessions
      `);
      totalSessions = Number(rows[0]?.total_sessions ?? 0);
      sessionsWithOrder = Number(rows[0]?.sessions_with_order ?? 0);
    } catch {
      // Table may be missing before migrations are applied.
    }

    try {
      const { rows: leadRows } = await pgQuery<{
        intent_type: string;
        count: string;
      }>(`
        select coalesce(intent_type, 'general') as intent_type, count(*)::text as count
        from ai_leads
        group by intent_type
      `);
      for (const row of leadRows) {
        leadsByIntent[row.intent_type] = Number(row.count ?? 0);
      }
    } catch {
      try {
        const { rows: leadRows } = await pgQuery<{ count: string }>(`
          select count(*)::text as count from ai_leads
        `);
        leadsByIntent.general = Number(leadRows[0]?.count ?? 0);
      } catch {
        // ai_leads table may not exist yet.
      }
    }
  }

  const aiConversionRate =
    totalSessions > 0
      ? Math.round((sessionsWithOrder / totalSessions) * 1000) / 10
      : aiOrders.length > 0
        ? 100
        : 0;

  return {
    aiOrders: aiOrders.length,
    aiRevenueInr,
    aiConversionRate,
    totalSessions,
    sessionsWithOrder,
    topAiProducts: [...productMap.values()]
      .sort((a, b) => b.revenueInr - a.revenueInr || b.orders - a.orders)
      .slice(0, 10),
    topAiCategories: [...categoryMap.values()]
      .sort((a, b) => b.revenueInr - a.revenueInr || b.orders - a.orders)
      .slice(0, 8),
    leadsByIntent,
  };
}
