import { getCmsSnapshot } from "@/lib/cms-store";
import { gstRateOnSale } from "@/lib/commerce-config";
import { resolvePlatformFeeConfig } from "@/lib/platform-fee-config";
import { resolveShippingConfig } from "@/lib/shipping-config";

export async function GET() {
  const cms = await getCmsSnapshot();
  return Response.json(
    {
      gstRate: gstRateOnSale(),
      platformFee: resolvePlatformFeeConfig(cms.siteSettings),
      shipping: resolveShippingConfig(cms.siteSettings),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
