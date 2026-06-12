import { NextResponse } from "next/server";
import { clientStatusAuthError } from "@/lib/client-approved-session";
import { setClientSessionCookie } from "@/lib/client-session-cookie";
import { recordClientLogin } from "@/lib/client-activity";
import { loginClient, publicClient } from "@/lib/local-db";
import { createClientToken } from "@/lib/client-token";
import { isNativeClientRequest } from "@/lib/native-client-detect";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const loginBody = await request.json();
    if (!loginBody.email || !loginBody.password)
      return Response.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    const limit = await rateLimit(
      rateLimitKey(request, "client-login", String(loginBody.email)),
      8,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const client = await loginClient(loginBody.email, loginBody.password);
    const blocked = clientStatusAuthError(client.status);
    if (blocked) return Response.json({ error: blocked }, { status: 403 });
    const token = await createClientToken({
      clientId: client.id,
      email: client.email,
      sessionVersion: client.sessionVersion,
    });
    await recordClientLogin(client.id).catch(() => null);
    const payload: { client: ReturnType<typeof publicClient>; token?: string } =
      {
        client: publicClient(client),
      };
    if (isNativeClientRequest(request)) {
      payload.token = token;
    }
    const response = NextResponse.json(payload);
    setClientSessionCookie(response, token);
    return response;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 401 },
    );
  }
}
