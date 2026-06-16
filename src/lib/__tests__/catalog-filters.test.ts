import { describe, expect, it } from "vitest";
import { mergeCatalogFilters } from "@/lib/catalog";

describe("mergeCatalogFilters", () => {
  it("keeps route defaults when URL params are undefined", () => {
    expect(
      mergeCatalogFilters({ category: "men-s-kurta" }, { category: undefined }),
    ).toEqual({ category: "men-s-kurta" });
  });

  it("lets URL params override route defaults", () => {
    expect(
      mergeCatalogFilters({ category: "men-s-kurta" }, { category: "women" }),
    ).toEqual({ category: "women" });
  });
});
