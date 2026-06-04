import sharp from "sharp";
import { bearerToken, verifyClientToken } from "@/lib/client-token";
import { searchProductsByImage } from "@/lib/visual-search";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxBytes = 6 * 1024 * 1024;

function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const textQuery = String(formData.get("q") ?? "").trim();

  if (!(file instanceof File)) {
    return Response.json({ error: "Image file required" }, { status: 400 });
  }
  if (!isImageFile(file)) {
    return Response.json(
      { error: "Only image uploads allowed" },
      { status: 400 },
    );
  }
  if (file.size > maxBytes) {
    return Response.json({ error: "Image must be under 6MB" }, { status: 400 });
  }

  const input = Buffer.from(await file.arrayBuffer());
  let normalized: Buffer;
  try {
    normalized = await sharp(input)
      .rotate()
      .resize({
        width: 1280,
        height: 1280,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return Response.json(
      { error: "Could not read image file" },
      { status: 400 },
    );
  }

  const token = bearerToken(request);
  const session = token ? await verifyClientToken(token) : null;

  try {
    const result = await searchProductsByImage({
      imageBuffer: normalized,
      mime: "image/jpeg",
      textQuery,
      clientId: session?.clientId,
      limit: 24,
    });

    return Response.json({
      items: result.items,
      total: result.total,
      keywords: result.analysis.keywords,
      colors: result.analysis.colors,
      terms: result.terms,
      source: result.analysis.source,
      garmentType: result.analysis.garmentType,
      fabric: result.analysis.fabric,
      category: result.analysis.category,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Visual search failed",
      },
      { status: 500 },
    );
  }
}
