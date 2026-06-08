import { LaunchBrandLogo } from "@/components/storefront/LaunchBrandLogo";
import { LaunchCountdown } from "@/components/storefront/LaunchCountdown";
import { LaunchHeroVisual } from "@/components/storefront/LaunchHeroVisual";
import { siteSettings } from "@/data/mock";
import {
  buildLaunchCalendarUrl,
  formatLaunchDisplay,
  getSiteLaunchAtMs,
  isSiteLaunchPending,
} from "@/lib/site-launch";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LaunchPage() {
  const launchAtMs = getSiteLaunchAtMs();
  if (launchAtMs === null || !isSiteLaunchPending()) {
    redirect("/");
  }

  const launchLabel = formatLaunchDisplay(launchAtMs);
  const calendarUrl = buildLaunchCalendarUrl(launchAtMs);

  return (
    <div className="sarjan-launch-page">
      <div className="sarjan-launch-page__stars" aria-hidden />
      <div className="sarjan-launch-page__glow sarjan-launch-page__glow--one" />
      <div className="sarjan-launch-page__glow sarjan-launch-page__glow--two" />

      <div className="sarjan-launch-page__shell">
        <main className="sarjan-launch-page__content">
          <div className="sarjan-launch-page__brand">
            <LaunchBrandLogo />
          </div>

          <p className="sarjan-launch-page__eyebrow">
            We&apos;re almost ready!
          </p>

          <h1 className="sarjan-launch-page__title">
            Get ready for something{" "}
            <span className="sarjan-launch-page__title-accent">BIG</span>
          </h1>

          <LaunchCountdown launchAtMs={launchAtMs} />

          <p className="sarjan-launch-page__subhead">
            The countdown has begun!
          </p>

          <p className="sarjan-launch-page__lead">
            Your wholesale textile catalog, MOQ-based ordering, and B2B client
            portal are launching soon. Be the first to explore craft-based
            garments built for modern retail.
          </p>

          <p className="sarjan-launch-page__when">
            <strong>Go live:</strong> {launchLabel}
          </p>

          <a
            className="sarjan-launch-page__cta"
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Add to calendar
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h10v2H7v-2z"
              />
            </svg>
          </a>

          <footer className="sarjan-launch-page__footer">
            <a href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a>
          </footer>
        </main>

        <aside className="sarjan-launch-page__visual-wrap">
          <LaunchHeroVisual />
        </aside>
      </div>
    </div>
  );
}
