/**
 * Standard Sarjan storefront CTA.
 * Styles: /public/storefront-buttons.css
 * Docs: docs/STOREFRONT-BUTTONS.md
 *
 * Default: white background, black text, pill shape.
 * Hover: logo red (--sarjan-accent), white text. No diagonal wipe.
 */
export const SARJAN_BTN_CLASS = "sarjan-btn" as const;

/** Build the shared pill button class list. Prefer this over raw tf-btn btn-fill. */
export function sarjanButtonClass(
  ...extra: Array<string | false | null | undefined>
): string {
  return [SARJAN_BTN_CLASS, "radius-4", ...extra.filter(Boolean)].join(" ");
}
