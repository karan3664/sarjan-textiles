/** ISO-8601 with offset, e.g. 2026-06-17T10:15:00+05:30 (IST). Unset = gate off. */
function readSiteLaunchAtRaw(): string | undefined {
  // Bracket access keeps middleware reading runtime env on Docker/Coolify (not build-time "").
  const raw = process.env["SITE_LAUNCH_AT"];
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

export function getSiteLaunchAtMs(): number | null {
  const raw = readSiteLaunchAtRaw();
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

export function getSiteLaunchAtIso(): string | null {
  const ms = getSiteLaunchAtMs();
  return ms === null ? null : new Date(ms).toISOString();
}

export function isSiteLaunchPending(now = Date.now()): boolean {
  const ms = getSiteLaunchAtMs();
  return ms !== null && now < ms;
}

/** Routes that stay reachable while the public site is gated. */
export function isLaunchBypassPath(pathname: string): boolean {
  if (pathname === "/launch") return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/api/admin")) return true;
  if (pathname.startsWith("/api/cron")) return true;
  if (pathname === "/api/health") return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/.well-known/")) return true;
  // Public static files (logo, favicon, CSS) — must not redirect to /launch
  if (pathname.startsWith("/sarjan-assets/")) return true;
  if (pathname.startsWith("/uploads/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".woff")
  ) {
    return true;
  }
  return false;
}

/** Google Calendar “add event” link for the launch moment. */
export function buildLaunchCalendarUrl(launchAtMs: number) {
  const start = new Date(launchAtMs);
  const end = new Date(launchAtMs + 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "Sarjan Textiles — Website Launch",
    dates: `${fmt(start)}/${fmt(end)}`,
    details:
      "Sarjan Textiles wholesale B2B platform goes live. Explore craft-based garments, MOQ ordering, and client portal.",
    location: "https://sarjantextiles.com",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function formatLaunchDisplay(isoMs: number) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
    timeZoneName: "short",
  }).format(new Date(isoMs));
}
