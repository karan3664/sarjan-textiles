import { NextResponse } from "next/server";

/** Legacy endpoint — use /api/auth/forgot/start for self-service reset. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  if (!email) {
    return Response.json({ error: "Email required" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  return NextResponse.json(
    {
      error:
        "Use the updated forgot-password flow with email and mobile verification.",
      redirect: `${origin}/forgot-password`,
    },
    { status: 400 },
  );
}
