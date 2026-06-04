"use client";

type Props = {
  productRef: string;
  productLink: string;
  downloadUrl: string;
};

export function DownloadProductActions({
  productRef,
  productLink,
  downloadUrl,
}: Props) {
  const openProduct = () => {
    const encodedRef = encodeURIComponent(productRef);
    const fallback = encodeURIComponent(
      `${downloadUrl}?product=${encodeURIComponent(productRef)}`,
    );
    window.location.href = `intent://sarjantextiles.com/app/product/${encodedRef}#Intent;scheme=https;package=com.sarjantextiles;S.browser_fallback_url=${fallback};end`;
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        className="tf-btn btn-fill animate-hover-btn radius-4 mb-2"
        onClick={openProduct}
      >
        Open Product
      </button>
      <p className="text-caption-2 text-secondary mb-0">
        Product link:{" "}
        <a href={productLink} className="link">
          {productLink.replace(/^https?:\/\//, "")}
        </a>
      </p>
    </div>
  );
}
