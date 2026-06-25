/**
 * Multi-environment resolution for Sarjan Textiles.
 * Set APP_ENV in Coolify per environment (development | staging | production).
 * Production deploy branch remains `prod` — see docs/deployment/BRANCH-STRATEGY.md.
 */

export type AppEnv = "development" | "staging" | "production";

const VALID: AppEnv[] = ["development", "staging", "production"];

function fromUrl(url: string): AppEnv | null {
  const host = url.toLowerCase();
  if (host.includes("dev.sarjantextiles.com")) return "development";
  if (host.includes("staging.sarjantextiles.com")) return "staging";
  if (host.includes("sarjantextiles.com")) return "production";
  return null;
}

/** Resolve current deployment environment (server + build time). */
export function resolveAppEnv(): AppEnv {
  const raw = (process.env.APP_ENV ?? "").trim().toLowerCase();
  if (raw === "development" || raw === "dev") return "development";
  if (raw === "staging" || raw === "stage") return "staging";
  if (raw === "production" || raw === "prod") return "production";
  if (VALID.includes(raw as AppEnv)) return raw as AppEnv;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const fromAppUrl = fromUrl(appUrl);
  if (fromAppUrl) return fromAppUrl;

  if (process.env.NODE_ENV === "development") return "development";
  return "production";
}

export function isProductionEnv(): boolean {
  return resolveAppEnv() === "production";
}

export function isStagingEnv(): boolean {
  return resolveAppEnv() === "staging";
}

export function isDevelopmentEnv(): boolean {
  return resolveAppEnv() === "development";
}

/** Public site URL for the active environment. */
export function appPublicUrl(): string {
  const override = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (override) return override.replace(/\/$/, "");

  switch (resolveAppEnv()) {
    case "development":
      return "https://dev.sarjantextiles.com";
    case "staging":
      return "https://staging.sarjantextiles.com";
    default:
      return (
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
        "https://sarjantextiles.com"
      );
  }
}

/** Disk prefix for uploads isolation (mount under public/uploads). */
export function uploadsEnvPrefix(): string {
  const custom = process.env.UPLOADS_ENV_PREFIX?.trim();
  if (custom) return custom.replace(/^\/+|\/+$/g, "");
  switch (resolveAppEnv()) {
    case "development":
      return "dev";
    case "staging":
      return "staging";
    default:
      return "production";
  }
}

/** Verbose logs in dev; QA in staging; minimal in production. */
export function logLevel(): "debug" | "info" | "warn" {
  switch (resolveAppEnv()) {
    case "development":
      return "debug";
    case "staging":
      return "info";
    default:
      return "warn";
  }
}

/** GA4 / Meta Pixel — disabled on dev, test IDs on staging. */
export function analyticsEnabled(): boolean {
  if (isDevelopmentEnv()) return false;
  return process.env.ENABLE_ANALYTICS !== "false";
}

export function assertEnvDatabaseSafety() {
  const env = resolveAppEnv();
  const dbUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!dbUrl) return;

  const markers: Record<AppEnv, string[]> = {
    development: ["sarjan-dev", "sarjan_dev", "dev-db", "/dev"],
    staging: ["sarjan-staging", "sarjan_staging", "staging-db", "/staging"],
    production: ["sarjan-production", "sarjan_production", "production"],
  };

  if (env === "production") return;

  const forbidden =
    env === "development" ? markers.production : markers.production;
  const urlLower = dbUrl.toLowerCase();
  if (forbidden.some((m) => urlLower.includes(m)) && !urlLower.includes(env)) {
    console.warn(
      `[app-env] WARNING: ${env} may be pointing at a production database. Use isolated DB (sarjan-${env}-db).`,
    );
  }
}
