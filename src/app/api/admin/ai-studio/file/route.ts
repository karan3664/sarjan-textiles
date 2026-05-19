import { Readable } from "stream";
import { contentTypeForProductFile, getProductFileStream } from "@/lib/ai-product-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const relativePath = url.searchParams.get("path");

  if (!relativePath) {
    return new Response("File path required", { status: 400 });
  }

  try {
    const stream = getProductFileStream(relativePath);

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
