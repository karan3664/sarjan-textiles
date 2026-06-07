export function databaseMode() {
  if (process.env.DATABASE_URL?.trim()) return "postgres";
  if (
    process.env.SUPABASE_ENABLED === "true" &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ) {
    return "supabase-postgres";
  }
  return "json-fallback";
}

export function assertProductionDatabase() {
  const mode = databaseMode();
  if (process.env.NODE_ENV === "production" && mode === "json-fallback") {
    throw new Error(
      "Production database is not configured. Set DATABASE_URL or Supabase service credentials.",
    );
  }
  return mode;
}
