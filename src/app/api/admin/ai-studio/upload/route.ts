import { saveRawUploads } from "@/lib/ai-product-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxUploadBytes = 60 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData().catch((error) => {
      throw new Error(error instanceof Error && error.message.includes("multipart") ? "Upload body was truncated. Restart dev server after config change, then retry with images under 60MB each." : "Invalid upload request");
    });
    const files = formData.getAll("files").filter((file): file is File => file instanceof File);

    if (!files.length) {
      return Response.json({ error: "Image files required" }, { status: 400 });
    }

    const oversized = files.find((file) => file.size > maxUploadBytes);
    if (oversized) {
      return Response.json({ error: `${oversized.name} exceeds 60MB` }, { status: 400 });
    }

    const category = String(formData.get("category") || "shirts");
    const collection = String(formData.get("collection") || "ajrakh mashru");
    const attributeType = String(formData.get("attributeType") || "color");
    const attributeValue = String(formData.get("attributeValue") || "red");
    const shootStyle = "current-style";

    const result = await saveRawUploads(files, { category, collection, attributeType, attributeValue, shootStyle });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
