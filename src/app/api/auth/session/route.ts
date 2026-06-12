import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clientStatusAuthError } from "@/lib/client-approved-session";
import {
  CLIENT_SESSION_COOKIE_NAME,
  setClientSessionCookie,
} from "@/lib/client-session-cookie";
import { getClient, publicClient } from "@/lib/local-db";
import {
  bearerToken,
  createClientToken,
  verifyClientToken,
} from "@/lib/client-token";
import { isNativeClientRequest } from "@/lib/native-client-detect";

const SLIDING_REFRESH_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

/** Restore storefront session from HttpOnly cookie. */
export async function GET(request: Request) {
  const session = await verifyClientToken(bearerToken(request));
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const client = await getClient(session.clientId);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const blocked = clientStatusAuthError(client.status);
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 403 });
  }

  const jar = await cookies();
  const existing =
    jar.get(CLIENT_SESSION_COOKIE_NAME)?.value?.trim() ||
    bearerToken(request) ||
    "";

  const shouldRefresh = session.exp - Date.now() < SLIDING_REFRESH_WINDOW_MS;
  const token = shouldRefresh
    ? await createClientToken({
        clientId: session.clientId,
        email: session.email,
        sessionVersion: client.sessionVersion,
      })
    : existing;

  const body: { client: ReturnType<typeof publicClient>; token?: string } = {
    client: publicClient(client),
  };
  if (isNativeClientRequest(request) && token) {
    body.token = token;
  }

  const response = NextResponse.json(body);

  if (shouldRefresh && token) {
    setClientSessionCookie(response, token);
  }

  return response;
}
