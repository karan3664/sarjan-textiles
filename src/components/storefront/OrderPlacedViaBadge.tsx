import { isBotPlacedOrder, orderPlacedViaLabel } from "@/lib/order-placed-via";

export function OrderPlacedViaBadge({
  placedVia,
  className = "",
}: {
  placedVia?: string | null;
  className?: string;
}) {
  if (!isBotPlacedOrder(placedVia)) return null;
  return (
    <span
      className={`sarjan-order-placed-via-badge ${className}`.trim()}
      title={orderPlacedViaLabel(placedVia)}
    >
      AI order assistant
    </span>
  );
}
