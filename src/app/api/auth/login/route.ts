import { loginClient, publicClient } from "@/lib/local-db";
import { createClientToken } from "@/lib/client-token";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email || !body.password) return Response.json({ error: "Email and password required" }, { status: 400 });

    const client = await loginClient(body.email, body.password);
    return Response.json({ client: publicClient(client), token: createClientToken({ clientId: client.id, email: client.email }) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Login failed" }, { status: 401 });
  }
}
