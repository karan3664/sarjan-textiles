import Link from "next/link";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getMobileAppRelease } from "@/lib/mobile-app-release";
import { DownloadProductActions } from "./DownloadProductActions";

export const metadata = {
  title: "Download Sarjan Textiles App",
  description:
    "Install the Sarjan Textiles wholesale Android app. Scan the QR code or download the APK.",
};

type Props = {
  searchParams: Promise<{ product?: string }>;
};

export default async function DownloadAppPage({ searchParams }: Props) {
  const { product } = await searchParams;
  const release = getMobileAppRelease();
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(release.apkUrl)}`;
  const productRef = product?.trim() || "";
  const productLink = productRef
    ? `https://sarjantextiles.com/app/product/${encodeURIComponent(productRef)}`
    : "";

  return (
    <ModaveShell>
      <section className="flat-spacing sarjan-download-app">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8 col-xl-7">
              <div className="sarjan-download-card text-center">
                <p className="text-caption-1 text-secondary-2 mb-2">
                  Wholesale B2B · Android
                </p>
                <h1 className="heading mb-3">Sarjan Textiles App</h1>
                {productRef ? (
                  <p className="text-secondary mb-4">
                    Install the app, then open the shared product. After
                    install, tap <strong>Open Product</strong> below or open the
                    product link again from WhatsApp.
                  </p>
                ) : (
                  <p className="text-secondary mb-4">
                    Scan the QR code on your phone to download the latest APK,
                    or use the button below. After installing, open the app and
                    sign in with your wholesale account.
                  </p>
                )}

                {productRef ? (
                  <DownloadProductActions
                    productRef={productRef}
                    productLink={productLink}
                    downloadUrl={release.downloadPageUrl}
                  />
                ) : null}

                <div className="sarjan-download-qr-wrap mx-auto mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSrc}
                    alt={`QR code to download Sarjan Textiles app v${release.latestVersion}`}
                    width={260}
                    height={260}
                    className="sarjan-download-qr"
                  />
                </div>

                <p className="text-button mb-1">
                  Version {release.latestVersion}
                </p>
                <p className="text-caption-2 text-secondary mb-4">
                  {release.releaseNotes}
                </p>

                <a
                  href={release.apkUrl}
                  download
                  className="tf-btn btn-fill animate-hover-btn radius-4 mb-3"
                >
                  Download APK
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
                    <li className="mb-2">
                      Open <strong>Sarjan Textiles</strong> and log in with
                      mobile OTP or email.
                    </li>
                    {productRef ? (
                      <li className="mb-2">
                        Tap <strong>Open Product</strong> above to view the
                        shared item in the app.
                      </li>
                    ) : null}
                    <li>
                      Already installed? Open the app — if an update is
                      available you will see a prompt to download the latest
                      version from this page.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <style>{`
        .sarjan-download-app { padding-top: 48px; padding-bottom: 64px; }
        .sarjan-download-card {
          background: #fff;
          border: 1px solid #ece7df;
          border-radius: 20px;
          padding: 36px 28px 32px;
          box-shadow: 0 12px 40px rgba(20, 20, 20, 0.06);
        }
        .sarjan-download-qr-wrap {
          width: fit-content;
          padding: 12px;
          border-radius: 16px;
          background: #faf7f2;
          border: 1px solid #ece7df;
        }
        .sarjan-download-qr { display: block; border-radius: 8px; }
        .sarjan-download-steps ol { line-height: 1.55; }
      `}</style>
    </ModaveShell>
  );
}
