import { NextResponse } from "next/server";
import { resolveAppEnv, appPublicUrl } from "@/lib/app-env";
import { databaseMode } from "@/lib/database-status";
import { isPostgresEnabled, pgQuery } from "@/lib/postgres";

export const runtime = "nodejs";

type Check = { name: string; ok: boolean; detail?: string };

export async function GET() {
  const checks: Check[] = [];
  const env = resolveAppEnv();

  checks.push({ name: "app", ok: true, detail: env });
  checks.push({ name: "url", ok: true, detail: appPublicUrl() });

  const dbMode = databaseMode();
  checks.push({ name: "database", ok: dbMode === "postgres", detail: dbMode });

  if (isPostgresEnabled()) {
    try {
      await pgQuery("SELECT 1 AS ok");
      checks.push({ name: "postgres_ping", ok: true });
    } catch (e) {
      checks.push({
        name: "postgres_ping",
        ok: false,
        detail: e instanceof Error ? e.message : "query failed",
      });
    }
  }

  const healthy = checks.every((c) => c.ok);
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      env,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
