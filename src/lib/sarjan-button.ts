/**
 * Standard Sarjan storefront CTA.
 * Component: `@/components/storefront/SarjanButton`
 * Styles: `/public/storefront-buttons.css`
 *
 * Default: white background, black text, pill shape.
 * Hover: logo red (--sarjan-accent), white text. No diagonal wipe.
 */
export const SARJAN_BTN_CLASS = "sarjan-btn" as const;

/** Build the shared pill button class list. Prefer `<SarjanButton>` for new CTAs. */
export function sarjanButtonClass(
  ...extra: Array<string | false | null | undefined>
): string {
  return [SARJAN_BTN_CLASS, "radius-4", ...extra.filter(Boolean)].join(" ");
}

/**
 * Icon + label CTA wrapper. Strips legacy Modave tf-btn/btn-fill classes.
 * Prefer `<SarjanButton icon="…">` for new markup.
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
