import { verifyGstinFromPortal } from "@/lib/gst";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await verifyGstinFromPortal(String(body.gst ?? body.gstin ?? ""));
    return Response.json({ gst: result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "GST verification failed" }, { status: 400 });
  }
}
