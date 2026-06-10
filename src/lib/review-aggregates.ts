import { getCmsSnapshot, upsertCmsProduct } from "@/lib/cms-store";
import { computeReviewStats, listAllReviews } from "@/lib/reviews-store";

/** Recompute CMS product rating / ratingCount from approved reviews. */
export async function syncProductReviewAggregates(productSlug: string) {
  const slug = productSlug.trim();
  const all = await listAllReviews();
  const approved = all.filter(
    (item) => item.productSlug === slug && item.status === "approved",
  );
  const stats = computeReviewStats(approved);

  const cms = await getCmsSnapshot();
  const product = cms.products.find((item) => item.slug === slug);
  if (!product) return null;

  const next = {
    ...product,
    rating: stats.averageRating,
    ratingCount: stats.totalReviews,
  };
  await upsertCmsProduct(next);
  return stats;
}
