import { getCachedCmsSnapshot } from "@/lib/cms-store";

export async function GET() {
  const { products, inventoryLogs } = await getCachedCmsSnapshot();
  return Response.json({
    summary: {
      availableStock: products.reduce((sum, product) => sum + product.stock, 0),
      reservedStock: products.reduce((sum, product) => sum + product.reserved, 0),
      soldStock: products.reduce((sum, product) => sum + product.sold, 0),
      returnedStock: products.reduce((sum, product) => sum + (product.returned ?? 0), 0),
      damagedStock: products.reduce((sum, product) => sum + (product.damaged ?? 0), 0),
      lowStock: products.filter((product) => product.stock > 0 && product.stock <= product.moq * 2).length,
      outOfStock: products.filter((product) => product.stock <= 0).length,
    },
    products,
    movements: inventoryLogs,
  });
}
