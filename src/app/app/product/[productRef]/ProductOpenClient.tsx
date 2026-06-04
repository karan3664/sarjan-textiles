"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  productRef: string;
  productName?: string;
  downloadUrl: string;
  webProductUrl: string;
};

export function ProductOpenClient({
  productRef,
  productName,
  downloadUrl,
  webProductUrl,
}: Props) {
  const [showInstall, setShowInstall] = useState(false);
  const [opening, setOpening] = useState(true);

  useEffect(() => {
    const encodedRef = encodeURIComponent(productRef);
    const isAndroid = /android/i.test(navigator.userAgent);

    if (isAndroid) {
      const fallback = encodeURIComponent(downloadUrl);
      window.location.href = `intent://sarjantextiles.com/app/product/${encodedRef}#Intent;scheme=https;package=com.sarjantextiles;S.browser_fallback_url=${fallback};end`;
    } else {
      window.location.href = `sarjan://app/product/${encodedRef}`;
    }

    const timer = window.setTimeout(() => {
      setOpening(false);
      setShowInstall(true);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [productRef, downloadUrl]);

  const openInApp = () => {
    setOpening(true);
    const encodedRef = encodeURIComponent(productRef);
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid) {
      const fallback = encodeURIComponent(downloadUrl);
      window.location.href = `intent://sarjantextiles.com/app/product/${encodedRef}#Intent;scheme=https;package=com.sarjantextiles;S.browser_fallback_url=${fallback};end`;
    } else {
      window.location.href = `sarjan://app/product/${encodedRef}`;
    }
    window.setTimeout(() => setOpening(false), 1500);
  };

  return (
    <section className="flat-spacing sarjan-product-open">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-7 col-xl-6">
            <div className="sarjan-product-open-card text-center">
              <p className="text-caption-1 text-secondary-2 mb-2">
                Sarjan Textiles · Wholesale App
              </p>
              <h1 className="heading mb-3">
                {productName ? productName : "Open product"}
              </h1>
              <p className="text-secondary mb-4">
                {opening
                  ? "Opening Sarjan Textiles app…"
                  : "App not installed? Download below, then tap Open Product again."}
              </p>

              <button
                type="button"
                className="tf-btn btn-fill animate-hover-btn radius-4 mb-3"
                onClick={openInApp}
              >
                Open in App
              </button>

              {showInstall ? (
                <>
                  <a
                    href={downloadUrl}
                    className="tf-btn btn-outline animate-hover-btn radius-4 mb-3 d-inline-block"
                  >
                    Install App
                  </a>
                  <p className="text-caption-2 text-secondary mb-0">
                    After installing, return here and tap{" "}
                    <strong>Open in App</strong>, or open this link again:{" "}
                    <Link href={webProductUrl} className="link">
                      {webProductUrl.replace(/^https?:\/\//, "")}
                    </Link>
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .sarjan-product-open { padding-top: 56px; padding-bottom: 64px; min-height: 60vh; }
        .sarjan-product-open-card {
          background: #fff;
          border: 1px solid #ece7df;
          border-radius: 20px;
          padding: 36px 28px 32px;
          box-shadow: 0 12px 40px rgba(20, 20, 20, 0.06);
        }
      `}</style>
    </section>
  );
}
