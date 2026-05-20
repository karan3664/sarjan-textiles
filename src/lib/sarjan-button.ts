/**
 * Standard storefront CTA — white pill, black text; hover red + white text.
 * Styles: /public/storefront-buttons.css (via sarjanButtonClass).
 */
export const SARJAN_BTN_CLASS = "sarjan-btn tf-btn btn-fill" as const;

/** Build the shared pill button class list. */
export function sarjanButtonClass(
  ...extra: Array<string | false | null | undefined>
): string {
  return [SARJAN_BTN_CLASS, "radius-4", ...extra.filter(Boolean)].join(" ");
}
