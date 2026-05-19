import { replaceStudioRawImage } from "@/lib/ai-product-studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxUploadBytes = 60 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const id = String(formData.get("id") || "");
    const file = formData.get("file");

    if (!id) return Response.json({ error: "Image id required" }, { status: 400 });
    if (!(file instanceof File)) return Response.json({ error: "Replacement image required" }, { status: 400 });
    if (file.size > maxUploadBytes) return Response.json({ error: `${file.name} exceeds 60MB` }, { status: 400 });

    const record = await replaceStudioRawImage(id, file);

    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Replace failed" }, { status: 400 });
  }
}
