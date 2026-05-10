import { trackVisit } from "@/lib/analytics-store";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

type VisitBody = {
  visitorId?: unknown;
  path?: unknown;
  referrer?: unknown;
};

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VisitBody;
    const visitorId = cleanText(body.visitorId);
    const visitPath = cleanText(body.path, "/");

    if (!visitorId || !visitPath || visitPath.startsWith("/admin")) {
      return Response.json({ ok: true });
    }

    const limited = rateLimit(rateLimitKey(request, "analytics", visitorId), 80, 60_000);
    if (!limited.allowed) return rateLimitResponse(limited.resetAt);

    await trackVisit({
      visitorId,
      path: visitPath,
      referrer: cleanText(body.referrer) || undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
