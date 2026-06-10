import Link from "next/link";
import { SarjanButton } from "./SarjanButton";

export function StorefrontEmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  title: string;
  description?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string; icon?: string };
}) {
  return (
    <div className="sarjan-storefront-empty" role="status" aria-live="polite">
      <div className="sarjan-storefront-empty__icon" aria-hidden>
        <span className="icon icon-ShoppingBagOpen" />
      </div>
      <h3 className="sarjan-storefront-empty__title">{title}</h3>
      {description ? (
        <p className="sarjan-storefront-empty__description text-secondary">
          {description}
        </p>
      ) : null}
      {primaryAction || secondaryAction ? (
        <div className="sarjan-storefront-empty__actions">
          {primaryAction ? (
            <SarjanButton href={primaryAction.href} icon="icon-arrowUpRight">
              {primaryAction.label}
            </SarjanButton>
          ) : null}
          {secondaryAction ? (
            <SarjanButton
              href={secondaryAction.href}
              className="has-border"
              icon={secondaryAction.icon}
            >
              {secondaryAction.label}
            </SarjanButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
