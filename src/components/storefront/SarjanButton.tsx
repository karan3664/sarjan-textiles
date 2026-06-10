import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { sarjanButtonClass, withBtnIcon } from "@/lib/sarjan-button";

type CommonProps = {
  children: ReactNode;
  className?: string;
  /** Modave icon class, e.g. `icon-user` */
  icon?: string;
  /** Label span class — default `text`; use `text text-button` for uppercase CTAs */
  textClassName?: string;
};

type LinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & {
    href: string;
    type?: never;
    disabled?: never;
  };

type ButtonProps = CommonProps &
  Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "disabled" | "onClick" | "aria-label" | "aria-disabled"
  > & {
    href?: never;
  };

export type SarjanButtonProps = LinkProps | ButtonProps;

function SarjanButtonLabel({
  icon,
  textClassName = "text",
  children,
}: Pick<CommonProps, "icon" | "textClassName" | "children">) {
  if (icon) {
    return (
      <>
        <i className={`icon ${icon} sarjan-tf-btn-icon`} aria-hidden />
        <span className={textClassName}>{children}</span>
      </>
    );
  }

  return typeof children === "string" ? (
    <span className="text">{children}</span>
  ) : (
    children
  );
}

/** Canonical storefront CTA — link or button with optional Modave icon. */
export function SarjanButton(props: SarjanButtonProps) {
  const { children, className, icon, textClassName } = props;
  const cls = icon ? withBtnIcon(className) : sarjanButtonClass(className);
  const label = (
    <SarjanButtonLabel icon={icon} textClassName={textClassName}>
      {children}
    </SarjanButtonLabel>
  );

  if ("href" in props && props.href) {
    const { href, ...rest } = props;
    return (
      <Link href={href} className={cls} {...rest}>
        {label}
      </Link>
    );
  }

  const {
    type = "button",
    disabled,
    onClick,
    "aria-label": ariaLabel,
    "aria-disabled": ariaDisabled,
  } = props as ButtonProps;

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-disabled={ariaDisabled}
    >
      {label}
    </button>
  );
}
