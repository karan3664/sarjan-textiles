import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { applyProductDeals } from "@/lib/product-deal";
import { resolveProducts } from "@/lib/product-localize";
import { jsonLocalized, localeFromRequest } from "@/lib/request-locale";
import { verifyAdminToken } from "@/lib/admin-token";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const locale = localeFromRequest(request);
  const cms = await getLocalizedCmsSnapshot();

  const liveProducts = applyProductDeals(resolveProducts(cms.products, locale));
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );

  return jsonLocalized(
    {
      summary: {
        availableStock: liveProducts.reduce(
          (sum, product) => sum + product.stock,
          0,
        ),
        lowStock: liveProducts.filter(
          (product) => product.stock > 0 && product.stock <= product.moq * 2,
        ).length,
        outOfStock: liveProducts.filter((product) => product.stock <= 0).length,
      },
      products: liveProducts,
      ...(session
        ? {
            movements: cms.inventoryLogs,
            adminSummary: {
              reservedStock: liveProducts.reduce(
                (sum, product) => sum + product.reserved,
                0,
              ),
              soldStock: liveProducts.reduce(
                (sum, product) => sum + product.sold,
                0,
              ),
            },
          }
        : {}),
      locale,
    },
    locale,
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
