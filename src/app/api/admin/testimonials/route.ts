import { getCmsSnapshot, saveCmsSnapshot } from "@/lib/cms-store";
import type { CmsTestimonial } from "@/lib/cms-store";

export async function GET() {
  const cms = await getCmsSnapshot();
  return Response.json({ testimonials: cms.testimonials });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: string; status?: CmsTestimonial["status"] };
  const cms = await getCmsSnapshot();

  if (!body.id || !body.status || !["pending", "approved", "rejected"].includes(body.status)) {
    return Response.json({ error: "Valid id and status required" }, { status: 400 });
  }

  const status = body.status as CmsTestimonial["status"];
  const testimonials = cms.testimonials.map((testimonial) =>
    testimonial.id === body.id ? { ...testimonial, status } : testimonial,
  );

  const next = await saveCmsSnapshot({ testimonials });
  return Response.json({ testimonials: next.testimonials });
}
