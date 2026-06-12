import { getCmsSnapshot, saveCmsSnapshot } from "@/lib/cms-store";
import type { CmsTestimonial } from "@/lib/cms-store";
import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";
import { resolveTestimonials } from "@/lib/content-localize";
import { formatTestimonialPrice } from "@/lib/testimonial-price";
import { sanitizeSameOriginAssetUrl } from "@/lib/media-url-allowlist";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";
import {
  sanitizeUserText,
  USER_TEXT_LIMITS,
  validateUserText,
} from "@/lib/user-text";

const defaultAvatar = "/sarjan-assets/sarjan-favicon-192.png";

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const cms = await getCmsSnapshot();

  return jsonLocalized(
    {
      testimonials: resolveTestimonials(
        cms.testimonials.filter(
          (testimonial) => testimonial.status === "approved",
        ),
        locale,
      ),
      locale,
    },
    locale,
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    },
  );
}

export async function POST(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;
  const { client } = auth;

  const limit = await rateLimit(
    rateLimitKey(request, "testimonials", client.email),
    3,
    24 * 60 * 60_000,
  );
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const body = (await request.json()) as Partial<CmsTestimonial>;
  const cms = await getCmsSnapshot();

  const authorCheck = validateUserText(
    String(body.author ?? client.companyName ?? "").trim(),
    {
      min: 1,
      max: USER_TEXT_LIMITS.testimonialAuthor,
      label: "Author",
    },
  );
  const quoteCheck = validateUserText(String(body.quote ?? ""), {
    min: 1,
    max: USER_TEXT_LIMITS.testimonialQuote,
    label: "Testimonial",
  });
  if (!authorCheck.ok) {
    return Response.json({ error: authorCheck.error }, { status: 400 });
  }
  if (!quoteCheck.ok) {
    return Response.json({ error: quoteCheck.error }, { status: 400 });
  }

  const rating = Math.round(Number(body.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return Response.json(
      { error: "Rating required (1–5 stars)" },
      { status: 400 },
    );
  }

  const product = sanitizeUserText(String(body.product ?? "Sarjan Textiles"));
  const testimonial: CmsTestimonial = {
    id: `TST-${Date.now()}`,
    author: authorCheck.value,
    quote: quoteCheck.value,
    product: product || "Sarjan Textiles",
    price: formatTestimonialPrice(body.price ?? ""),
    rating,
    image: sanitizeSameOriginAssetUrl(
      String(body.image ?? ""),
      "/sarjan-assets/banner-textiles-studio.webp",
    ),
    avatar: sanitizeSameOriginAssetUrl(
      String(body.avatar ?? ""),
      defaultAvatar,
    ),
    status: "pending",
    submittedAt: new Date().toISOString(),
  };

  const next = await saveCmsSnapshot({
    testimonials: [testimonial, ...cms.testimonials],
  });
  return Response.json(
    { testimonial, count: next.testimonials.length },
    { status: 201 },
  );
}
