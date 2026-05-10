import { loginClient, publicClient } from "@/lib/local-db";
import { createClientToken } from "@/lib/client-token";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email || !body.password) return Response.json({ error: "Email and password required" }, { status: 400 });
    const limit = rateLimit(rateLimitKey(request, "client-login", String(body.email)), 8, 60_000);
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const client = await loginClient(body.email, body.password);
    return Response.json({ client: publicClient(client), token: createClientToken({ clientId: client.id, email: client.email }) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 401 });
  }
}
