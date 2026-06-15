import {
  normalizeReviewProductSlug,
  orderIdsEquivalent,
} from "@/lib/review-lookup";

describe("review-lookup", () => {
  it("normalizes product slugs", () => {
    expect(normalizeReviewProductSlug(" Tattva-Ajrakh-Shirt ")).toBe(
      "tattva-ajrakh-shirt",
    );
  });

  it("matches ST- and numeric order ids", () => {
    expect(orderIdsEquivalent("ST-1781287858198", "st-1781287858198")).toBe(
      true,
    );
    expect(orderIdsEquivalent("1781287858198", "ST-1781287858198")).toBe(true);
    expect(orderIdsEquivalent("ST-111", "ST-222")).toBe(false);
  });

  it("does not match unrelated order suffixes", () => {
    expect(orderIdsEquivalent("8198", "ST-1781287858198")).toBe(false);
  });
});
