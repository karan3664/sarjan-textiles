import { getCachedCmsSnapshot } from "@/lib/cms-store";

export async function GET() {
  const { home, products } = await getCachedCmsSnapshot();
  const productCategories = Array.from(new Set(products.map((product) => product.category))).map((name) => ({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    image: products.find((product) => product.category === name)?.images[0] ?? home.categories[0]?.image,
    productCount: products.filter((product) => product.category === name).length,
  }));
  return Response.json({ categories: productCategories });
}
