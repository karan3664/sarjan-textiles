import { NextResponse } from "next/server";
import { getSiteLaunchAtIso, isSiteLaunchPending } from "@/lib/site-launch";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "sarjan-textiles",
    timestamp: new Date().toISOString(),
    launchPending: isSiteLaunchPending(),
    siteLaunchAt: getSiteLaunchAtIso(),
  });
}
