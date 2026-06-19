import sharp from "sharp";
import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { localeFromRequest } from "@/lib/request-locale";
import {
  normalizeAiLanguage,
  normalizeAiSource,
} from "@/lib/ai-chat/session-lifecycle";
import { handleOrderBotVisualSearch } from "@/lib/order-bot/visual-search-handler";
import { flushBotSessionById } from "@/lib/order-bot/session-store";

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
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;

  const formData = await request.formData();
  const file = formData.get("file");
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const textQuery = String(formData.get("q") ?? "").trim();
  const language = normalizeAiLanguage(String(formData.get("language") ?? ""));
  const source = normalizeAiSource(String(formData.get("source") ?? ""));

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

  const locale = localeFromRequest(request);

  try {
    const result = await handleOrderBotVisualSearch({
      imageBuffer: normalized,
      mime: "image/jpeg",
      textQuery: textQuery || undefined,
      sessionId: sessionId || undefined,
      clientId: auth.session.clientId,
      clientEmail: auth.session.email,
      language,
      source,
      locale,
    });
    await flushBotSessionById(result.sessionId, auth.session.clientId);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Visual search failed",
      },
      { status: 500 },
    );
  }
}
