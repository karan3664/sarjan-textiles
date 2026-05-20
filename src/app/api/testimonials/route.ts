import { getCmsSnapshot, saveCmsSnapshot } from "@/lib/cms-store";
import type { CmsTestimonial } from "@/lib/cms-store";
import { formatTestimonialPrice } from "@/lib/testimonial-price";
import {
  sanitizeUserText,
  USER_TEXT_LIMITS,
  validateUserText,
} from "@/lib/user-text";

const defaultAvatar = "/sarjan-assets/sarjan-favicon-192.png";

export async function GET() {
  const cms = await getCmsSnapshot();
  return Response.json({
    testimonials: cms.testimonials.filter(
      (testimonial) => testimonial.status === "approved",
    ),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CmsTestimonial>;
  const cms = await getCmsSnapshot();

  const authorCheck = validateUserText(String(body.author ?? ""), {
    min: 1,
    max: USER_TEXT_LIMITS.testimonialAuthor,
    label: "Author",
  });
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
    image: body.image ?? "/sarjan-assets/banner-textiles-studio.webp",
    avatar: body.avatar ?? defaultAvatar,
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
