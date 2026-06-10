import Link from "next/link";
import { OfflineRetryButton } from "@/components/storefront/OfflineRetryButton";
import { siteSettings } from "@/data/mock";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Offline",
  description:
    "You are offline. Reconnect to browse the Sarjan Textiles catalog.",
  path: "/offline",
  noIndex: true,
});

export default function OfflinePage() {
  return (
    <main className="sarjan-offline-page" aria-labelledby="offline-title">
      <div className="sarjan-offline-page__card">
        <img
          src={siteSettings.logo}
          alt=""
          className="sarjan-offline-page__logo"
          width={160}
          height={48}
          aria-hidden
        />
        <h1 id="offline-title" className="sarjan-offline-page__title">
          You&apos;re offline
        </h1>
        <p className="sarjan-offline-page__lead">
          We couldn&apos;t reach the server. Check your connection, then try
          again. Pages you visited recently may still be available from cache.
        </p>
        <div className="sarjan-offline-page__actions">
          <OfflineRetryButton />
          <Link
            href="/"
            className="sarjan-offline-page__btn sarjan-offline-page__btn--outline"
          >
            Go to home
          </Link>
        </div>
      </div>
    </main>
  );
}
