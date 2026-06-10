"use client";

import Link from "next/link";
import { SarjanButton } from "./SarjanButton";

export function StorefrontErrorState({
  title = "Something went wrong",
  description = "Please try again or return to the homepage.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <section
      className="sarjan-storefront-error"
      aria-labelledby="storefront-error-title"
    >
      <div className="container sarjan-storefront-error__inner">
        <p className="sarjan-not-found-eyebrow">Sarjan Textiles</p>
        <h1
          id="storefront-error-title"
          className="sarjan-storefront-error__title"
        >
          {title}
        </h1>
        <p className="sarjan-storefront-error__description text-secondary">
          {description}
        </p>
        <div className="sarjan-storefront-error__actions">
          {onRetry ? (
            <SarjanButton type="button" icon="icon-refresh" onClick={onRetry}>
              Try again
            </SarjanButton>
          ) : null}
          <SarjanButton href="/" icon="icon-arrLeft">
            Go home
          </SarjanButton>
          <Link href="/products" className="sarjan-storefront-error__link">
            Browse catalog
          </Link>
        </div>
      </div>
    </section>
  );
}
