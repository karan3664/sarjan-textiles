import { createClient, publicClient } from "@/lib/local-db";
import { createClientToken } from "@/lib/client-token";
import { normalizeGstin, verifyGstinFromPortal } from "@/lib/gst";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const hasGst = body.hasGst !== false && body.hasGst !== "false" && body.noGst !== true && body.noGst !== "on";
    if (!body.email || !body.password || (!body.companyName && !body.gst)) {
      return Response.json({ error: "Email, password, and company name required" }, { status: 400 });
    }
    if (hasGst) {
      if (!body.gst) return Response.json({ error: "GST number required or choose without GST registration" }, { status: 400 });
      const verified = await verifyGstinFromPortal(String(body.gst));
      body.gst = normalizeGstin(String(body.gst));
      body.companyName = verified.legalName;
    } else {
      body.gst = "";
      if (!String(body.companyName ?? "").trim()) return Response.json({ error: "Company name required without GST" }, { status: 400 });
    }

    const client = await createClient(body);
    return Response.json({ client: publicClient(client), token: createClientToken({ clientId: client.id, email: client.email }) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Register failed" }, { status: 400 });
  }
}
