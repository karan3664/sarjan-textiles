import { getCmsSnapshot, saveCmsSnapshot } from "@/lib/cms-store";
import type { CmsTestimonial } from "@/lib/cms-store";
import { requireAdminRouteSession } from "@/lib/require-admin-session";

export async function GET(request: Request) {
  const session = await requireAdminRouteSession(request, {
    path: "/api/admin/testimonials",
  });
  if (session instanceof Response) return session;
  const cms = await getCmsSnapshot();
  return Response.json({ testimonials: cms.testimonials });
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAdminRouteSession(request, {
      path: "/api/admin/testimonials",
    });
    if (session instanceof Response) return session;
    const body = (await request.json().catch(() => null)) as {
      id?: string;
      status?: CmsTestimonial["status"];
    } | null;
    if (!body) {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const cms = await getCmsSnapshot();

    if (
      !body.id ||
      !body.status ||
      !["pending", "approved", "rejected"].includes(body.status)
    ) {
      return Response.json(
        { error: "Valid id and status required" },
        { status: 400 },
      );
    }

    const status = body.status as CmsTestimonial["status"];
    const testimonials = cms.testimonials.map((testimonial) =>
      testimonial.id === body.id ? { ...testimonial, status } : testimonial,
    );

    const next = await saveCmsSnapshot({ testimonials });
    return Response.json({ testimonials: next.testimonials });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Testimonial update failed",
      },
      { status: 500 },
    );
  }
}
