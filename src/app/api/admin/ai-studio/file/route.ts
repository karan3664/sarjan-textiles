import { Readable } from "stream";
import { requireAdminRouteSession } from "@/lib/require-admin-session";
import {
  contentTypeForProductFile,
  getProductFileStream,
} from "@/lib/ai-product-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireAdminRouteSession(request);
  if (session instanceof Response) return session;
  const url = new URL(request.url);
  const relativePath = url.searchParams.get("path");

  if (!relativePath) {
    return new Response("File path required", { status: 400 });
  }

  try {
    const stream = await getProductFileStream(relativePath);

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": contentTypeForProductFile(relativePath),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
