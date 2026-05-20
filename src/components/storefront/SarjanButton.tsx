import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { sarjanButtonClass } from "@/lib/sarjan-button";

type CommonProps = {
  children: ReactNode;
  className?: string;
};

type LinkProps = CommonProps & {
  href: string;
  type?: never;
  disabled?: never;
  onClick?: never;
};

type ButtonProps = CommonProps &
  Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "disabled" | "onClick" | "aria-label"
  > & {
    href?: never;
  };

export type SarjanButtonProps = LinkProps | ButtonProps;

/** Storefront CTA — use for new buttons; existing tf-btn also styled globally. */
export function SarjanButton(props: SarjanButtonProps) {
  const cls = sarjanButtonClass(props.className);
  const label =
    typeof props.children === "string" ? (
      <span className="text">{props.children}</span>
    ) : (
      props.children
    );

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={cls}>
        {label}
      </Link>
    );
  }

  const {
    type = "button",
    disabled,
    onClick,
    "aria-label": ariaLabel,
  } = props as ButtonProps;

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {label}
    </button>
  );
}
