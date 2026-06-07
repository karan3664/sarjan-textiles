/** Amazon-style hanging promo tag in Sarjan maroon (logo primary). */
export function ProductPromoTag({
  line1 = "और",
  line2 = "देखो",
}: {
  line1?: string;
  line2?: string;
}) {
  return (
    <div className="sarjan-product-promo-tag" aria-hidden="true">
      <div className="sarjan-product-promo-tag__ring" />
      <div className="sarjan-product-promo-tag__body">
        <span className="sarjan-product-promo-tag__line">{line1}</span>
        <span className="sarjan-product-promo-tag__line">{line2}</span>
        <svg
          className="sarjan-product-promo-tag__arrow"
          viewBox="0 0 48 20"
          aria-hidden="true"
        >
          <path
            d="M6 14 C 16 4, 32 4, 42 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M38 10 L42 14 L38 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
