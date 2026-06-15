import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  normalizeReviewProductSlug,
  orderIdsEquivalent,
} from "@/lib/review-lookup";
import { isPostgresEnabled, pgInsertReturning, pgQuery } from "@/lib/postgres";
import { sanitizeUserText } from "@/lib/user-text";

const REVIEWS_FILE = path.join(process.cwd(), "data", "product-reviews.json");
const HELPFUL_FILE = path.join(
  process.cwd(),
  "data",
  "review-helpful-votes.json",
);

export type ProductReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "hidden";

export type ProductReviewSort =
  | "newest"
  | "oldest"
  | "highest"
  | "lowest"
  | "helpful";

export type ProductReview = {
  id: string;
  productSlug: string;
  orderId: string;
  clientId: string;
  clientName: string;
  rating: number;
  title: string;
  body: string;
  images: string[];
  videos: string[];
  status: ProductReviewStatus;
  helpfulCount: number;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** Map Postgres / insert failures to client-safe review submit messages. */
export function formatReviewSaveError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const code = (error as { code?: string })?.code;
  if (
    code === "42P01" ||
    /relation ["']?product_reviews["']? does not exist/i.test(message)
  ) {
    return "Reviews are not set up on the server yet. Please try again in a few minutes.";
  }
  if (
    code === "23505" ||
    /duplicate key value violates unique constraint/i.test(message)
  ) {
    if (/product_reviews_unique_order_client/i.test(message)) {
      return "This order already has a review on file. The server needs a quick database update — please try again shortly.";
    }
    return "You have already reviewed this product for this order.";
  }
  return message.trim() || "Could not save review.";
}

export type ProductReviewInput = {
  productSlug: string;
  orderId: string;
  clientId: string;
  clientName: string;
  rating: number;
  title: string;
  body: string;
  images?: string[];
  videos?: string[];
};

export type ProductReviewUpdateInput = {
  rating?: number;
  title?: string;
  body?: string;
  images?: string[];
  videos?: string[];
};

export type ProductReviewStats = {
  averageRating: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

type ReviewsFile = { items: ProductReview[] };
type HelpfulFile = { votes: Array<{ reviewId: string; clientId: string }> };

function parseStatus(value: string): ProductReviewStatus {
  if (
    value === "approved" ||
    value === "rejected" ||
    value === "hidden" ||
    value === "pending"
  ) {
    return value;
  }
  return "pending";
}

function parseMedia(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 6);
}

function mapFromRow(row: Record<string, unknown>): ProductReview {
  return {
    id: String(row.id ?? ""),
    productSlug: String(row.product_slug ?? ""),
    orderId: String(row.order_id ?? ""),
    clientId: String(row.client_id ?? ""),
    clientName: String(row.client_name ?? ""),
    rating: Number(row.rating ?? 0),
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    images: parseMedia(row.images),
    videos: parseMedia(row.videos),
    status: parseStatus(String(row.status ?? "pending")),
    helpfulCount: Number(row.helpful_count ?? 0),
    approvedBy: row.approved_by ? String(row.approved_by) : undefined,
    approvedAt: row.approved_at ? String(row.approved_at) : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
  };
}

function sortReviews(items: ProductReview[], sort: ProductReviewSort) {
  const copy = [...items];
  switch (sort) {
    case "oldest":
      return copy.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    case "highest":
      return copy.sort(
        (a, b) => b.rating - a.rating || b.helpfulCount - a.helpfulCount,
      );
    case "lowest":
      return copy.sort(
        (a, b) => a.rating - b.rating || b.createdAt.localeCompare(a.createdAt),
      );
    case "helpful":
      return copy.sort(
        (a, b) =>
          b.helpfulCount - a.helpfulCount ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case "newest":
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}

async function readAllFromFile(): Promise<ProductReview[]> {
  try {
    const raw = await readFile(REVIEWS_FILE, "utf8");
    const parsed = JSON.parse(raw) as ReviewsFile;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeAllToFile(items: ProductReview[]): Promise<void> {
  await mkdir(path.dirname(REVIEWS_FILE), { recursive: true });
  await writeFile(
    REVIEWS_FILE,
    JSON.stringify({ items } satisfies ReviewsFile, null, 2),
    "utf8",
  );
}

async function readAllFromPostgres(): Promise<ProductReview[] | null> {
  if (!isPostgresEnabled()) return null;
  try {
    const { rows } = await pgQuery(
      "select * from product_reviews order by created_at desc",
    );
    return rows.map((row) => mapFromRow(row as Record<string, unknown>));
  } catch (error) {
    console.error(
      "[reviews] postgres read:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function readAll(): Promise<ProductReview[]> {
  const fromDb = await readAllFromPostgres();
  if (fromDb !== null) return fromDb;
  return readAllFromFile();
}

export async function getReviewById(id: string): Promise<ProductReview | null> {
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      "select * from product_reviews where id = $1 limit 1",
      [id],
    );
    const row = rows[0];
    return row ? mapFromRow(row as Record<string, unknown>) : null;
  }
  const all = await readAllFromFile();
  return all.find((item) => item.id === id) ?? null;
}

export async function findReviewByOrderProductClient(
  clientId: string,
  orderId: string,
  productSlug: string,
): Promise<ProductReview | null> {
  const slug = normalizeReviewProductSlug(productSlug);
  if (!slug) {
    return null;
  }

  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      `select * from product_reviews
       where client_id = $1
         and lower(trim(product_slug)) = $2`,
      [clientId, slug],
    );
    const row = rows.find((item) =>
      orderIdsEquivalent(orderId, String(item.order_id ?? "")),
    );
    return row ? mapFromRow(row as Record<string, unknown>) : null;
  }

  const all = await readAllFromFile();
  return (
    all.find(
      (item) =>
        item.clientId === clientId &&
        normalizeReviewProductSlug(item.productSlug) === slug &&
        orderIdsEquivalent(orderId, item.orderId),
    ) ?? null
  );
}

export async function listApprovedProductReviews(
  productSlug: string,
  options: {
    sort?: ProductReviewSort;
    page?: number;
    limit?: number;
  } = {},
): Promise<{
  items: ProductReview[];
  total: number;
  stats: ProductReviewStats;
}> {
  const sort = options.sort ?? "newest";
  const page = Math.max(1, Number(options.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(options.limit ?? 10)));
  const slug = productSlug.trim();

  const all = await readAll();
  const approved = all.filter(
    (item) => item.productSlug === slug && item.status === "approved",
  );
  const stats = computeReviewStats(approved);
  const sorted = sortReviews(approved, sort);
  const start = (page - 1) * limit;
  return {
    items: sorted.slice(start, start + limit),
    total: sorted.length,
    stats,
  };
}

export function computeReviewStats(
  reviews: ProductReview[],
): ProductReviewStats {
  const distribution: ProductReviewStats["distribution"] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let sum = 0;
  for (const review of reviews) {
    const bucket = Math.min(5, Math.max(1, Math.round(review.rating))) as
      | 1
      | 2
      | 3
      | 4
      | 5;
    distribution[bucket] += 1;
    sum += review.rating;
  }
  const totalReviews = reviews.length;
  return {
    averageRating:
      totalReviews > 0 ? Math.round((sum / totalReviews) * 10) / 10 : 0,
    totalReviews,
    distribution,
  };
}

export async function listAllReviews(filters?: {
  status?: ProductReviewStatus | "all";
  query?: string;
  rating?: number;
}): Promise<ProductReview[]> {
  const all = await readAll();
  const q = filters?.query?.trim().toLowerCase() ?? "";
  const status = filters?.status ?? "all";
  const rating = filters?.rating;

  return all
    .filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (rating && item.rating !== rating) return false;
      if (!q) return true;
      const hay = [
        item.productSlug,
        item.clientName,
        item.title,
        item.body,
        item.orderId,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function createProductReview(
  input: ProductReviewInput,
): Promise<ProductReview> {
  const now = new Date().toISOString();
  const row: ProductReview = {
    id: randomUUID(),
    productSlug: normalizeReviewProductSlug(input.productSlug),
    orderId: input.orderId.trim(),
    clientId: input.clientId,
    clientName: sanitizeUserText(input.clientName),
    rating: input.rating,
    title: sanitizeUserText(input.title),
    body: sanitizeUserText(input.body),
    images: parseMedia(input.images),
    videos: parseMedia(input.videos),
    status: "pending",
    helpfulCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  if (isPostgresEnabled()) {
    const existing = await findReviewByOrderProductClient(
      row.clientId,
      row.orderId,
      row.productSlug,
    );
    if (existing) {
      throw new Error("You have already reviewed this product for this order.");
    }
    const data = await pgInsertReturning("product_reviews", {
      product_slug: row.productSlug,
      order_id: row.orderId,
      client_id: row.clientId,
      client_name: row.clientName,
      rating: row.rating,
      title: row.title,
      body: row.body,
      images: row.images,
      videos: row.videos,
      status: row.status,
      helpful_count: 0,
    });
    if (!data) throw new Error("Review insert failed");
    return mapFromRow(data as Record<string, unknown>);
  }

  const all = await readAllFromFile();
  const duplicate = all.find(
    (item) =>
      item.clientId === row.clientId &&
      normalizeReviewProductSlug(item.productSlug) === row.productSlug &&
      orderIdsEquivalent(row.orderId, item.orderId),
  );
  if (duplicate) {
    throw new Error("You have already reviewed this product for this order.");
  }
  all.push(row);
  await writeAllToFile(all);
  return row;
}

export async function updateProductReview(
  id: string,
  patch: ProductReviewUpdateInput,
  options?: { resetStatusToPending?: boolean },
): Promise<ProductReview | null> {
  const current = await getReviewById(id);
  if (!current) return null;

  const next: ProductReview = {
    ...current,
    rating: patch.rating ?? current.rating,
    title:
      patch.title !== undefined ? sanitizeUserText(patch.title) : current.title,
    body:
      patch.body !== undefined ? sanitizeUserText(patch.body) : current.body,
    images:
      patch.images !== undefined ? parseMedia(patch.images) : current.images,
    videos:
      patch.videos !== undefined ? parseMedia(patch.videos) : current.videos,
    status: options?.resetStatusToPending ? "pending" : current.status,
    updatedAt: new Date().toISOString(),
  };

  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      `update product_reviews
       set rating = $2, title = $3, body = $4, images = $5::jsonb, videos = $6::jsonb,
           status = $7, updated_at = now()
       where id = $1
       returning *`,
      [
        id,
        next.rating,
        next.title,
        next.body,
        JSON.stringify(next.images),
        JSON.stringify(next.videos),
        next.status,
      ],
    );
    const data = rows[0];
    return data ? mapFromRow(data as Record<string, unknown>) : null;
  }

  const all = await readAllFromFile();
  const idx = all.findIndex((item) => item.id === id);
  if (idx < 0) return null;
  all[idx] = next;
  await writeAllToFile(all);
  return next;
}

export async function setReviewStatus(
  id: string,
  status: ProductReviewStatus,
  approvedBy?: string,
): Promise<ProductReview | null> {
  const now = new Date().toISOString();
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      `update product_reviews
       set status = $2,
           approved_by = case when $2 = 'approved' then $3 else approved_by end,
           approved_at = case when $2 = 'approved' then $4::timestamptz else approved_at end,
           updated_at = now()
       where id = $1
       returning *`,
      [id, status, approvedBy ?? null, now],
    );
    const data = rows[0];
    return data ? mapFromRow(data as Record<string, unknown>) : null;
  }

  const all = await readAllFromFile();
  const idx = all.findIndex((item) => item.id === id);
  if (idx < 0) return null;
  const current = all[idx]!;
  all[idx] = {
    ...current,
    status,
    approvedBy: status === "approved" ? approvedBy : current.approvedBy,
    approvedAt: status === "approved" ? now : current.approvedAt,
    updatedAt: now,
  };
  await writeAllToFile(all);
  return all[idx]!;
}

export async function deleteProductReview(id: string): Promise<string | null> {
  const current = await getReviewById(id);
  if (!current) return null;
  const slug = current.productSlug;

  if (isPostgresEnabled()) {
    const { rowCount } = await pgQuery(
      "delete from product_reviews where id = $1",
      [id],
    );
    if (!rowCount) return null;
    return slug;
  }

  const all = await readAllFromFile();
  const next = all.filter((item) => item.id !== id);
  if (next.length === all.length) return null;
  await writeAllToFile(next);
  return slug;
}

async function readHelpfulVotes(): Promise<HelpfulFile["votes"]> {
  if (isPostgresEnabled()) {
    try {
      const { rows } = await pgQuery(
        "select review_id, client_id from review_helpful_votes",
      );
      return rows.map((row) => ({
        reviewId: String((row as Record<string, unknown>).review_id ?? ""),
        clientId: String((row as Record<string, unknown>).client_id ?? ""),
      }));
    } catch {
      return [];
    }
  }
  try {
    const raw = await readFile(HELPFUL_FILE, "utf8");
    const parsed = JSON.parse(raw) as HelpfulFile;
    return Array.isArray(parsed.votes) ? parsed.votes : [];
  } catch {
    return [];
  }
}

async function writeHelpfulVotes(votes: HelpfulFile["votes"]) {
  await mkdir(path.dirname(HELPFUL_FILE), { recursive: true });
  await writeFile(
    HELPFUL_FILE,
    JSON.stringify({ votes } satisfies HelpfulFile, null, 2),
    "utf8",
  );
}

export async function markReviewHelpful(
  reviewId: string,
  clientId: string,
): Promise<{ helpfulCount: number; alreadyVoted: boolean } | null> {
  const review = await getReviewById(reviewId);
  if (!review || review.status !== "approved") return null;

  if (isPostgresEnabled()) {
    const existing = await pgQuery(
      "select id from review_helpful_votes where review_id = $1 and client_id = $2 limit 1",
      [reviewId, clientId],
    );
    if (existing.rows[0]) {
      return { helpfulCount: review.helpfulCount, alreadyVoted: true };
    }
    await pgQuery(
      "insert into review_helpful_votes (review_id, client_id) values ($1, $2)",
      [reviewId, clientId],
    );
    const { rows } = await pgQuery(
      `update product_reviews
       set helpful_count = helpful_count + 1, updated_at = now()
       where id = $1
       returning helpful_count`,
      [reviewId],
    );
    return {
      helpfulCount: Number(rows[0]?.helpful_count ?? review.helpfulCount + 1),
      alreadyVoted: false,
    };
  }

  const votes = await readHelpfulVotes();
  if (
    votes.some(
      (vote) => vote.reviewId === reviewId && vote.clientId === clientId,
    )
  ) {
    return { helpfulCount: review.helpfulCount, alreadyVoted: true };
  }
  votes.push({ reviewId, clientId });
  await writeHelpfulVotes(votes);

  const all = await readAllFromFile();
  const idx = all.findIndex((item) => item.id === reviewId);
  if (idx < 0) return null;
  all[idx] = {
    ...all[idx]!,
    helpfulCount: all[idx]!.helpfulCount + 1,
    updatedAt: new Date().toISOString(),
  };
  await writeAllToFile(all);
  return { helpfulCount: all[idx]!.helpfulCount, alreadyVoted: false };
}

export async function getReviewerStats(clientId: string) {
  const all = await readAll();
  const approved = all.filter(
    (item) => item.clientId === clientId && item.status === "approved",
  );
  const totalApproved = approved.length;
  return {
    totalApproved,
    isTopReviewer: totalApproved >= 5,
  };
}

export async function getReviewDashboardMetrics() {
  const all = await readAll();
  const byStatus = {
    pending: 0,
    approved: 0,
    rejected: 0,
    hidden: 0,
  };
  const productBuckets = new Map<string, { sum: number; count: number }>();

  for (const review of all) {
    byStatus[review.status] += 1;
    if (review.status !== "approved") continue;
    const bucket = productBuckets.get(review.productSlug) ?? {
      sum: 0,
      count: 0,
    };
    bucket.sum += review.rating;
    bucket.count += 1;
    productBuckets.set(review.productSlug, bucket);
  }

  const ranked = [...productBuckets.entries()]
    .map(([slug, bucket]) => ({
      productSlug: slug,
      averageRating:
        bucket.count > 0
          ? Math.round((bucket.sum / bucket.count) * 10) / 10
          : 0,
      reviewCount: bucket.count,
    }))
    .sort((a, b) => a.averageRating - b.averageRating);

  return {
    totalReviews: all.length,
    pendingReviews: byStatus.pending,
    approvedReviews: byStatus.approved,
    rejectedReviews: byStatus.rejected,
    hiddenReviews: byStatus.hidden,
    lowestRatedProducts: ranked.slice(0, 5),
    highestRatedProducts: [...ranked].reverse().slice(0, 5),
  };
}
