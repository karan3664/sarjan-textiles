export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", "sarjan-admin-session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  return response;
}
