import { scanRawFolder } from "@/lib/ai-product-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await scanRawFolder();

  return Response.json(result);
}
