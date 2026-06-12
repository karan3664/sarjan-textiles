import { consumeRateLimit } from "@/lib/rate-limit-store";

export async function rateLimit(key: string, limit = 8, windowMs = 60_000) {
  return consumeRateLimit(key, limit, windowMs);
}

export function rateLimitKey(
  request: Request,
  scope: string,
  identity = "anonymous",
) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return `${scope}:${forwarded || realIp || "unknown"}:${identity.toLowerCase()}`;
}

export function rateLimitResponse(resetAt: number) {
  return Response.json(
    { error: "Too many attempts. Please try again after a minute." },
    {
      status: 429,
      headers: {
        "Retry-After": String(
          Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
        ),
      },
    },
  );
}
