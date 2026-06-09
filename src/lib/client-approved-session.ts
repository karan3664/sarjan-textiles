import {
  bearerToken,
  verifyClientToken,
  type ClientSession,
} from "@/lib/client-token";
import { clientStatusAuthError } from "@/lib/client-status-auth";
import { getClient, type LocalClient } from "@/lib/local-db";

export { clientStatusAuthError } from "@/lib/client-status-auth";

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
    return Response.json(
      { error: "Please sign in again to continue." },
      { status: 401 },
    );
  }
  const msg = clientStatusAuthError(client.status);
  if (msg) return Response.json({ error: msg }, { status: 403 });
  return { session, client };
}
