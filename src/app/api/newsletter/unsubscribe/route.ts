import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/newsletter-store";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    const subscriber = await unsubscribeByToken(token);
    if (!subscriber) {
      return NextResponse.json(
        { error: "Invalid or expired unsubscribe link" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ok: true,
      email: subscriber.email,
      status: subscriber.status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unsubscribe failed",
      },
      { status: 500 },
    );
  }
}
