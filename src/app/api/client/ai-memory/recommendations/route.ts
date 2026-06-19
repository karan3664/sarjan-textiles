import { requireApprovedClientRequest } from "@/lib/client-approved-session";
import { normalizeAiSource } from "@/lib/ai-chat/session-lifecycle";
import { buildMemoryRecommendations } from "@/lib/ai-memory/engine";

export async function GET(request: Request) {
  const auth = await requireApprovedClientRequest(request);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const refSlug = url.searchParams.get("ref")?.trim() || undefined;
  const source = normalizeAiSource(url.searchParams.get("source"));
  const limit = Number(url.searchParams.get("limit") ?? "6");

  const payload = await buildMemoryRecommendations({
    clientId: auth.session.clientId,
    source,
    refSlug,
    limit: Number.isFinite(limit) ? limit : 6,
  });

  return Response.json(payload);
}
