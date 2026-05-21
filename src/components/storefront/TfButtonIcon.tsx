import type { ReactNode } from "react";

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

/** Add to button/link className so icon + text align (flex + gap). */
export function withBtnIcon(className = "") {
  return [className, "sarjan-has-btn-icon"].filter(Boolean).join(" ");
}
