import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clientStatusAuthError } from "@/lib/client-approved-session";
import { CLIENT_SESSION_COOKIE_NAME } from "@/lib/client-session-cookie";
import { getClient, publicClient } from "@/lib/local-db";
import { bearerToken, verifyClientToken } from "@/lib/client-token";

/** Restore storefront session from HttpOnly cookie (fixes login redirect loops on mobile). */
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
  const token =
    jar.get(CLIENT_SESSION_COOKIE_NAME)?.value?.trim() ||
    bearerToken(request) ||
    "";

  return NextResponse.json({
    client: publicClient(client),
    token,
  });
}
