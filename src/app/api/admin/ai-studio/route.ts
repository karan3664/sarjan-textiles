import { getStudioSnapshot } from "@/lib/ai-product-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getStudioSnapshot());
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "AI studio snapshot failed",
      },
      { status: 500 },
    );
  }
}
