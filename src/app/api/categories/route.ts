import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { slugifyCmsSegment } from "@/lib/slug";

export async function GET() {
  const { home, products, categoryHubPages } = await getCachedCmsSnapshot();
  const productCategories = Array.from(
    new Set(products.map((product) => product.category)),
  ).map((name) => ({
    name,
    slug: slugifyCmsSegment(name),
    image:
      products.find((product) => product.category === name)?.images[0] ??
      home.categories[0]?.image,
    productCount: products.filter((product) => product.category === name)
      .length,
  }));
  const hubs = (categoryHubPages ?? [])
    .filter((page) => page.enabled !== false)
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((page) => ({ title: page.title, slug: page.slug }));
  return Response.json({ categories: productCategories, hubs });
}
