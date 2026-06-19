import { readReviewMediaFile } from "@/lib/review-media-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  const filename = segments?.length === 1 ? segments[0] : segments?.join("/");
  const safe = decodeURIComponent((filename ?? "").trim());
  if (!safe || safe.includes("/") || safe.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const file = await readReviewMediaFile(safe);
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
