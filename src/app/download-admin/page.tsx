import Link from "next/link";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getAdminMobileAppRelease } from "@/lib/admin-mobile-app-release";

export const metadata = {
  title: "Download Sarjan Admin App",
  description:
    "Staff-only Sarjan admin Android app. Not for wholesale customers — use /download for the client app.",
  robots: { index: false, follow: false },
};

export default function DownloadAdminAppPage() {
  const release = getAdminMobileAppRelease();
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(release.apkUrl)}`;

  return (
    <ModaveShell>
      <section className="flat-spacing sarjan-download-app">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 col-xl-7">
              <div className="sarjan-download-card text-center">
                <p className="text-caption-1 text-secondary-2 mb-2">
                  Store operations · Android · Staff only (not for clients)
                </p>
                <p className="text-caption-2 text-secondary mb-3">
                  Wholesale customers: use the{" "}
                  <Link href="/download" className="link">
                    Sarjan Textiles app
                  </Link>{" "}
                  download page instead.
                </p>
                <h1 className="heading mb-3">Sarjan Admin</h1>
                <p className="text-secondary mb-4">
                  Scan the QR code on your phone to download the admin APK, or
                  use the button below. Sign in with your Sarjan admin email and
                  password (same as the web admin panel).
                </p>

                <div className="sarjan-download-qr-wrap mx-auto mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSrc}
                    alt={`QR code to download Sarjan Admin app v${release.latestVersion}`}
                    width={260}
                    height={260}
                    className="sarjan-download-qr"
                  />
                </div>

                <p className="text-button mb-4">
                  Version {release.latestVersion}
                </p>

                <a
                  href={release.apkUrl}
                  download
                  className="tf-btn btn-fill animate-hover-btn radius-4 mb-3"
                >
                  Download Admin APK
                </a>

                <p className="text-caption-2 text-secondary mb-0">
                  Direct link:{" "}
                  <Link href={release.apkUrl} className="link">
                    {release.apkUrl.replace(/^https?:\/\//, "")}
                  </Link>
                </p>

                <hr className="my-4" />

                <div className="text-start sarjan-download-steps">
                  <p className="text-button mb-2">Install steps</p>
                  <ol className="text-secondary mb-0 ps-3">
                    <li className="mb-2">
                      Download the APK (QR scan or button above).
                    </li>
                    <li className="mb-2">
                      If Android asks, allow install from browser / files.
                    </li>
                    <li>
                      Open <strong>Sarjan Admin</strong> and log in with your
                      admin account.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ModaveShell>
  );
}
