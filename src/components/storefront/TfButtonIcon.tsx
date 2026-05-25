import type { ReactNode } from "react";
import { sarjanButtonClass } from "@/lib/sarjan-button";

type TfButtonIconProps = {
  /** Modave icon class, e.g. `icon-user` */
  icon: string;
  children: ReactNode;
  /** Span class — default `text`; use `text text-button` for uppercase CTAs */
  textClassName?: string;
};

/** Icon + label pair for `tf-btn` / `btn-style-*` buttons site-wide. */
export function TfButtonIcon({
  icon,
  children,
  textClassName = "text",
}: TfButtonIconProps) {
  return (
    <>
      <i className={`icon ${icon} sarjan-tf-btn-icon`} aria-hidden />
      <span className={textClassName}>{children}</span>
    </>
  );
}

/**
 * Icon + label CTA wrapper. Strips legacy Modave btn-fill/btn-white (black/red split).
 * Example: withBtnIcon("w-100") or withBtnIcon(sarjanButtonClass("mt_24")).
 */
export function withBtnIcon(className = "") {
  const stripped = className
    .replace(/\btf-btn\b/g, "")
    .replace(/\bbtn-fill\b/g, "")
    .replace(/\bbtn-reset\b/g, "")
    .replace(/\bbtn-white\b/g, "")
    .replace(/\bbtn-style-2\b/g, "")
    .replace(/\bbtn-style-3\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return sarjanButtonClass("sarjan-has-btn-icon", stripped || undefined);
}
