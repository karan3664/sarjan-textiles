import { readReviewMediaFile } from "@/lib/review-media-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  const safe = decodeURIComponent((filename ?? "").trim());
  if (!safe || safe.includes("/") || safe.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const file = await readReviewMediaFile(safe);
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(file.buffer, {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
