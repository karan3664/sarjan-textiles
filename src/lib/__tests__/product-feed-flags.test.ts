import type { Product } from "@/data/mock";
import {
  resolveProductFeedFlags,
  withProductFeedFlags,
} from "@/lib/product-feed-flags";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "1",
    slug: "sample",
    name: "Sample",
    sku: "SKU1",
    category: "Men's Shirt",
    fabric: "Cotton",
    price: 100,
    moq: 1,
    stock: 10,
    reserved: 0,
    sold: 0,
    colors: [],
    sizes: [],
    images: [],
    description: "",
    care: "",
    ...overrides,
  };
}

describe("resolveProductFeedFlags", () => {
  it("marks women's wear as new arrivals by default", () => {
    const flags = resolveProductFeedFlags(
      product({
        category: "Women's wear",
        categoryPath: ["Women's wear"],
        categoryLevel1: "Women's wear",
      }),
    );
    expect(flags.isNewArrival).toBe(true);
  });

  it("respects explicit isNewArrival=false", () => {
    const flags = resolveProductFeedFlags(
      product({
        category: "Women's wear",
        isNewArrival: false,
      }),
    );
    expect(flags.isNewArrival).toBe(false);
  });
});

describe("withProductFeedFlags", () => {
  it("flags top sellers", () => {
    const flagged = withProductFeedFlags([
      product({ slug: "low", sold: 1 }),
      product({ slug: "high", sold: 99 }),
    ]);
    expect(flagged.find((item) => item.slug === "high")?.isBestSeller).toBe(
      true,
    );
    expect(flagged.find((item) => item.slug === "low")?.isBestSeller).toBe(
      false,
    );
  });
});
