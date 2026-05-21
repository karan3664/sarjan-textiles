import {
  bearerToken,
  verifyClientToken,
  type ClientSession,
} from "@/lib/client-token";
import { getClient, type LocalClient } from "@/lib/local-db";

/** Non-null when the client must not use authenticated APIs or receive a JWT. */
export function clientStatusAuthError(
  status: LocalClient["status"],
): string | null {
  if (status === "approved") return null;
  if (status === "pending") {
    return "Your wholesale account is still under review. You will receive an email once it is approved; after that you can sign in to view prices and place orders.";
  }
  if (status === "rejected") {
    return "Your registration could not be approved. Please contact Sarjan Textiles if you believe this is a mistake.";
  }
  return "Your account is not active. Please contact Sarjan Textiles.";
}

/**
 * Valid Bearer JWT **and** client row with `status === "approved"`.
 * Otherwise returns a JSON `Response` (401 / 403 / 404).
 */
export async function requireApprovedClientRequest(
  request: Request,
): Promise<Response | { session: ClientSession; client: LocalClient }> {
  const session = await verifyClientToken(bearerToken(request));
  if (!session) {
    return Response.json(
      { error: "Valid client token required" },
      { status: 401 },
    );
  }
  const client = await getClient(session.clientId);
  if (!client) {
    return Response.json({ error: "Client not found" }, { status: 404 });
  }
  const msg = clientStatusAuthError(client.status);
  if (msg) return Response.json({ error: msg }, { status: 403 });
  return { session, client };
}
