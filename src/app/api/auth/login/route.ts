import { clientStatusAuthError } from "@/lib/client-approved-session";
import { loginClient, publicClient } from "@/lib/local-db";
import { createClientToken } from "@/lib/client-token";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email || !body.password)
      return Response.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    const limit = rateLimit(
      rateLimitKey(request, "client-login", String(body.email)),
      8,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const client = await loginClient(body.email, body.password);
    const blocked = clientStatusAuthError(client.status);
    if (blocked) return Response.json({ error: blocked }, { status: 403 });
    const token = createClientToken({
      clientId: client.id,
      email: client.email,
    });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const response = Response.json({
      client: publicClient(client),
      token,
    });
    response.headers.append(
      "Set-Cookie",
      `sarjan-client-token=${encodeURIComponent(token)}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
    );
    return response;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 401 },
    );
  }
}
