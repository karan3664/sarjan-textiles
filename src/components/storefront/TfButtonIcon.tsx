import type { ReactNode } from "react";

type TfButtonIconProps = {
  /** Modave icon class, e.g. `icon-user` */
  icon: string;
  children: ReactNode;
  /** Span class — default `text`; use `text text-button` for uppercase CTAs */
  textClassName?: string;
};

/** Icon + label pair — prefer `<SarjanButton icon="…">` for new CTAs. */
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

export { withBtnIcon } from "@/lib/sarjan-button";
// withBtnIcon + TfButtonIcon remain for modal/cart anchors; use SarjanButton for new CTAs.
