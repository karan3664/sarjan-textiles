import { createResetRequest } from "@/lib/local-db";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.email) return Response.json({ error: "Email required" }, { status: 400 });

  const reset = await createResetRequest(body.email);
  return Response.json({ ok: true, resetId: reset.id });
}
