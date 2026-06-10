import {
  getReviewerStats,
  listApprovedProductReviews,
  type ProductReviewSort,
} from "@/lib/reviews-store";

export const runtime = "nodejs";

const SORTS = new Set<ProductReviewSort>([
  "newest",
  "oldest",
  "highest",
  "lowest",
  "helpful",
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const productSlug = id.trim();
  if (!productSlug) {
    return Response.json({ error: "Product id required." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const sortRaw = (
    searchParams.get("sort") ?? "newest"
  ).trim() as ProductReviewSort;
  const sort = SORTS.has(sortRaw) ? sortRaw : "newest";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? 10)),
  );
  const result = await listApprovedProductReviews(productSlug, {
    sort,
    page,
    limit,
  });

  const publicReviews = result.items.map((review) => ({
    id: review.id,
    productSlug: review.productSlug,
    clientName: review.clientName,
    rating: review.rating,
    title: review.title,
    body: review.body,
    images: review.images,
    videos: review.videos,
    helpfulCount: review.helpfulCount,
    createdAt: review.createdAt,
    verifiedPurchase: true,
  }));

  const reviewerBadges = await Promise.all(
    publicReviews.map(async (review) => {
      const source = result.items.find((item) => item.id === review.id);
      if (!source) return { reviewId: review.id, isTopReviewer: false };
      const stats = await getReviewerStats(source.clientId);
      return { reviewId: review.id, isTopReviewer: stats.isTopReviewer };
    }),
  );

  return Response.json(
    {
      reviews: publicReviews.map((review) => ({
        ...review,
        isTopReviewer:
          reviewerBadges.find((badge) => badge.reviewId === review.id)
            ?.isTopReviewer ?? false,
      })),
      page,
      limit,
      total: result.total,
      hasMore: page * limit < result.total,
      stats: result.stats,
      sort,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
