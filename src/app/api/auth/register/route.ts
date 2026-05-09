import { createClient, publicClient } from "@/lib/local-db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email || !body.password || !body.companyName) {
      return Response.json({ error: "Email, password, and company name required" }, { status: 400 });
    }

    const client = await createClient(body);
    return Response.json({ client: publicClient(client), token: client.id });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Register failed" }, { status: 400 });
  }
}
