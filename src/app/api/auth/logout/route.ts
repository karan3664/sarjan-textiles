export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    "sarjan-client-token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
  );
  return response;
}
