import { isPostgresEnabled } from "@/lib/postgres";
import { isProductionEnv, resolveAppEnv } from "@/lib/app-env";

export function databaseMode() {
  if (isPostgresEnabled()) return "postgres";
  return "json-fallback";
}

export function assertProductionDatabase() {
  const mode = databaseMode();
  if (isProductionEnv() && mode === "json-fallback") {
    throw new Error(
      "Production database is not configured. Set DATABASE_URL to your Hostinger VPS PostgreSQL connection string.",
    );
  }
  return mode;
}

export { resolveAppEnv };
