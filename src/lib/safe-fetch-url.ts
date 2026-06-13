const DEFAULT_APK_SOURCE_HOSTS = [
  "github.com",
  "raw.githubusercontent.com",
  "objects.githubusercontent.com",
  "api.github.com",
  "sarjantextiles.com",
  "www.sarjantextiles.com",
];

function allowedApkHosts(): Set<string> {
  const fromEnv = (process.env.SARJAN_APK_SOURCE_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_APK_SOURCE_HOSTS, ...fromEnv]);
}

function isPrivateOrReservedIpv4(host: string): boolean {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true;
  return false;
}

function isBlockedHostname(host: string): boolean {
  const normalized = host.toLowerCase();
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  ) {
    return true;
  }
  if (normalized.includes(":")) {
    if (normalized === "::1" || normalized.startsWith("fe80:")) return true;
  }
  return isPrivateOrReservedIpv4(normalized);
}

function hostAllowed(host: string, allowed: Set<string>): boolean {
  const normalized = host.toLowerCase();
  if (allowed.has(normalized)) return true;
  for (const entry of allowed) {
    if (entry.startsWith("*.")) {
      const suffix = entry.slice(1);
      if (normalized.endsWith(suffix) || normalized === entry.slice(2)) {
        return true;
      }
    }
  }
  return false;
}

/** Validates remote APK manifest URLs before server-side fetch (SSRF guard). */
export function assertSafeRemoteFetchUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Invalid APK source URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("APK source URL must use HTTPS");
  }

  if (url.username || url.password) {
    throw new Error("APK source URL must not include credentials");
  }

  const host = url.hostname.toLowerCase();
  if (isBlockedHostname(host)) {
    throw new Error("APK source URL host is not allowed");
  }

  if (!hostAllowed(host, allowedApkHosts())) {
    throw new Error("APK source URL host is not on the allowlist");
  }

  return url;
}
