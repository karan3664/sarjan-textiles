import { getCatalogProducts } from "@/lib/catalog";
import { readEnglish } from "@/lib/cms-localize";
import type { Product } from "@/data/mock";
import {
  findCatalogProduct,
  getProductRecommendations,
  scoreSimilarProduct,
} from "@/lib/product-recommendations";
import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { applyProductDeals } from "@/lib/product-deal";
import { resolveProducts } from "@/lib/product-localize";
import { productSetPrice } from "@/lib/product-pricing";
import {
  isProductSoldOut,
  productStockOnHand,
} from "@/lib/product-availability";
import { firstProductImage } from "@/lib/order-bot/product-image";
import type { BotProductPreview } from "@/lib/order-bot/types";
import type {
  BotSalesSuggestion,
  SalesRecommendationKind,
} from "@/lib/ai-sales/types";

function productCategoryName(
  category: Product["category"] | string | undefined,
) {
  if (typeof category === "string") return category.trim();
  return readEnglish(category).trim();
}

export function productsToBotPreviews(products: Product[], limit = 6) {
  return products.slice(0, limit).map((product, index): BotProductPreview => {
    const color = product.colors[0] ?? "Default";
    const sizes = product.sizes.length ? product.sizes : ["Free"];
    const stock = productStockOnHand(product);
    return {
      index: index + 1,
      slug: product.slug,
      name: product.name,
      category: productCategoryName(product.category),
      color,
      sizes,
      setPrice: productSetPrice(product, color, sizes),
      moq: product.moq,
      inStock: !isProductSoldOut(product) && (stock ?? 0) > 0,
      setsInStock: stock,
      imageUrl: firstProductImage(product) || undefined,
    };
  });
}

function filterByBudget(products: Product[], budgetInr: number, sets = 1) {
  return products.filter((product) => {
    const color = product.colors[0] ?? "Default";
    const sizes = product.sizes.length ? product.sizes : ["Free"];
    const setPrice = productSetPrice(product, color, sizes);
    const moq = Math.max(1, product.moq ?? 1);
    return setPrice * Math.max(moq, sets) <= budgetInr;
  });
}

function filterByQuantity(products: Product[], targetSets: number) {
  return products.filter((product) => {
    const moq = Math.max(1, product.moq ?? 1);
    const stock = productStockOnHand(product) ?? 0;
    return moq <= targetSets && stock >= targetSets;
  });
}

function upsellProducts(current: Product, catalog: Product[]) {
  return catalog
    .filter((candidate) => candidate.slug !== current.slug)
    .map((candidate) => ({
      candidate,
      score:
        scoreSimilarProduct(current, candidate) +
        (candidate.price > current.price ? 20 : 0) +
        (candidate.isFeatured ? 5 : 0),
    }))
    .filter(
      (entry) => entry.score > 0 && entry.candidate.price >= current.price,
    )
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.candidate);
}

function crossSellProducts(current: Product, catalog: Product[]) {
  const currentCategory = productCategoryName(current.category).toLowerCase();
  return catalog
    .filter((candidate) => candidate.slug !== current.slug)
    .filter((candidate) => {
      const category = productCategoryName(candidate.category).toLowerCase();
      return category && category !== currentCategory;
    })
    .sort((a, b) => b.sold - a.sold);
}

function suggestionTitle(kind: SalesRecommendationKind) {
  switch (kind) {
    case "similar":
      return "Similar products";
    case "bought_together":
      return "Frequently bought together";
    case "budget":
      return "Within your budget";
    case "quantity":
      return "Matches your quantity";
    case "upsell":
      return "Premium options";
    case "cross_sell":
      return "Pairs well with your selection";
    case "best_sellers":
      return "Best sellers";
    case "premium_alternatives":
      return "Premium alternatives";
    default:
      return "Recommended for you";
  }
}

export async function buildSalesRecommendations(input: {
  clientId: string;
  refSlug?: string;
  cartSlugs?: string[];
  kind?: SalesRecommendationKind;
  budgetInr?: number;
  targetSets?: number;
  limit?: number;
}): Promise<BotSalesSuggestion[]> {
  const limit = Math.min(Math.max(input.limit ?? 4, 1), 8);
  const { products: rawProducts } = await getLocalizedCmsSnapshot();
  const localized = applyProductDeals(resolveProducts(rawProducts, "en"));

  const refSlug =
    input.refSlug?.trim() ||
    input.cartSlugs?.[input.cartSlugs.length - 1] ||
    "";
  const current = refSlug ? findCatalogProduct(localized, refSlug) : undefined;

  const kinds: SalesRecommendationKind[] = input.kind
    ? [input.kind]
    : [
        "similar",
        "best_sellers",
        "bought_together",
        "premium_alternatives",
        "cross_sell",
        "upsell",
      ];

  const suggestions: BotSalesSuggestion[] = [];

  for (const kind of kinds) {
    let items: Product[] = [];

    if (kind === "budget" && input.budgetInr) {
      items = filterByBudget(localized, input.budgetInr, input.targetSets ?? 1);
      items.sort((a, b) => b.sold - a.sold);
    } else if (kind === "quantity" && input.targetSets) {
      items = filterByQuantity(localized, input.targetSets);
      items.sort((a, b) => a.moq - b.moq);
    } else if (current) {
      if (kind === "similar") {
        const { similar } = await getProductRecommendations({
          ref: current.slug,
          clientId: input.clientId,
          limit,
        });
        items = similar;
      } else if (kind === "bought_together") {
        const { boughtTogether } = await getProductRecommendations({
          ref: current.slug,
          clientId: input.clientId,
          limit,
        });
        items = boughtTogether;
      } else if (kind === "upsell") {
        const priced = await getCatalogProducts({
          clientId: input.clientId,
          limit: 120,
          page: 1,
        });
        items = upsellProducts(current, priced.items);
      } else if (kind === "cross_sell") {
        const priced = await getCatalogProducts({
          clientId: input.clientId,
          limit: 120,
          page: 1,
        });
        items = crossSellProducts(current, priced.items);
      } else if (kind === "best_sellers") {
        const catalog = await getCatalogProducts({
          clientId: input.clientId,
          limit: 80,
          page: 1,
          sort: "best-selling",
        });
        items = catalog.items;
      } else if (kind === "premium_alternatives") {
        const priced = await getCatalogProducts({
          clientId: input.clientId,
          limit: 120,
          page: 1,
        });
        items = upsellProducts(current, priced.items);
      }
    } else if (kind === "budget" || kind === "quantity") {
      continue;
    } else {
      const catalog = await getCatalogProducts({
        clientId: input.clientId,
        limit: 40,
        page: 1,
        sort: "best-selling",
      });
      items = catalog.items;
    }

    const unique = items
      .filter(
        (product, index, list) =>
          list.findIndex((item) => item.slug === product.slug) === index,
      )
      .slice(0, limit);

    if (!unique.length) continue;

    const previews = productsToBotPreviews(unique, limit);
    suggestions.push({
      kind,
      title: suggestionTitle(kind),
      reason:
        kind === "budget" && input.budgetInr
          ? `Options within ${input.budgetInr.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}`
          : kind === "quantity" && input.targetSets
            ? `Available at **${input.targetSets}** sets or more`
            : current
              ? `Based on **${current.name}**`
              : "Popular wholesale picks",
      products: previews,
    });
  }

  return suggestions.slice(0, 3);
}

export async function recommendProductsForSession(input: {
  clientId: string;
  refSlug?: string;
  cartSlugs?: string[];
  kind: SalesRecommendationKind;
  budgetInr?: number;
  targetSets?: number;
  limit?: number;
}) {
  const suggestions = await buildSalesRecommendations(input);
  const primary = suggestions[0];
  return {
    suggestions,
    products: primary?.products ?? [],
  };
}
