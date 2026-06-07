import { isPostgresEnabled } from "@/lib/postgres";

export function databaseMode() {
  if (isPostgresEnabled()) return "postgres";
  return "json-fallback";
}

export function assertProductionDatabase() {
  const mode = databaseMode();
  if (process.env.NODE_ENV === "production" && mode === "json-fallback") {
    throw new Error(
      "Production database is not configured. Set DATABASE_URL to your Hostinger VPS PostgreSQL connection string.",
    );
  }
  return mode;
}
