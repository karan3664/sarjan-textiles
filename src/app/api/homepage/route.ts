import { getCachedCmsSnapshot } from "@/lib/cms-store";

export async function GET() {
  const cms = await getCachedCmsSnapshot();
  return Response.json({
    siteSettings: cms.siteSettings,
    home: cms.home,
    products: cms.products.filter((product) => product.isFeatured).slice(0, 12),
    blogs: cms.blogs.slice(0, 6),
    testimonials: cms.testimonials.filter((testimonial) => testimonial.status === "approved"),
  });
}
