import {
  getClient,
  publicClient,
  updateClient,
  updateClientPassword,
} from "@/lib/local-db";
import { isValidGstin, normalizeGstin } from "@/lib/gst";
import { bearerToken, verifyClientToken } from "@/lib/client-token";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client)
    return Response.json({ error: "Client not found" }, { status: 404 });
  return Response.json({ client: publicClient(client) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await verifyClientToken(bearerToken(request));
    if (!session || session.clientId !== id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (body.currentPassword || body.newPassword) {
      if (!body.currentPassword || !body.newPassword)
        return Response.json(
          { error: "Current and new password required" },
          { status: 400 },
        );
      const client = await updateClientPassword(
        id,
        body.currentPassword,
        body.newPassword,
      );
      return Response.json({ client: publicClient(client) });
    }
    if (body.gst !== undefined) {
      const gst = normalizeGstin(String(body.gst ?? ""));
      if (!isValidGstin(gst)) {
        return Response.json(
          { error: "Valid GST number is required for wholesale accounts" },
          { status: 400 },
        );
      }
      body.gst = gst;
    }
    const client = await updateClient(id, body);
    return Response.json({ client: publicClient(client) });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Client update failed",
      },
      { status: 400 },
    );
  }
}
