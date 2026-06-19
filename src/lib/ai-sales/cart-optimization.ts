import {
  computeShippingCharges,
  DEFAULT_SHIPPING_CONFIG,
  resolveShippingConfig,
  type ShippingConfig,
} from "@/lib/shipping-config";
import { sumOrderPieces } from "@/lib/order-pieces";
import type { BotCartLine } from "@/lib/order-bot/types";
import type { BotCartOptimization } from "@/lib/ai-sales/types";

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function cartLinesToPieceLines(cart: BotCartLine[]) {
  return cart.map((line) => ({
    setQuantity: line.setQuantity,
    sizes: line.sizes,
  }));
}

export function analyzeCartShipping(
  cart: BotCartLine[],
  config: ShippingConfig = resolveShippingConfig() ?? DEFAULT_SHIPPING_CONFIG,
): BotCartOptimization | null {
  if (!cart.length || !config.enabled) return null;

  const totalPieces = sumOrderPieces(cartLinesToPieceLines(cart));
  if (totalPieces <= 0) return null;

  const currentShippingInr = computeShippingCharges(totalPieces, config);
  const remainder = totalPieces % 100;

  if (remainder === 0) {
    const targetPieces = totalPieces + 100;
    const shippingAfterInr = computeShippingCharges(targetPieces, config);
    return {
      totalPieces,
      currentShippingInr,
      piecesToAdd: 100,
      targetPieces,
      shippingAfterInr,
      shippingSavingsInr: 0,
      message: `Your cart has **${totalPieces} pieces** (${money(currentShippingInr)} shipping). Add **100 more pieces** to fill the next shipping slab efficiently.`,
    };
  }

  const targetPieces = Math.ceil(totalPieces / 100) * 100;
  const piecesToAdd = targetPieces - totalPieces;
  const shippingAfterInr = computeShippingCharges(targetPieces, config);
  const shippingSavingsInr = Math.max(0, currentShippingInr - shippingAfterInr);

  let message: string;
  if (shippingSavingsInr > 0) {
    message = `Add **${piecesToAdd} more piece${piecesToAdd === 1 ? "" : "s"}** (reach **${targetPieces}**) and save **${money(shippingSavingsInr)}** on shipping.`;
  } else {
    message = `Add **${piecesToAdd} more piece${piecesToAdd === 1 ? "" : "s"}** to reach **${targetPieces} pieces** and maximize your current **${money(currentShippingInr)}** shipping slab before the next tier at **${targetPieces + 1}**.`;
  }

  return {
    totalPieces,
    currentShippingInr,
    piecesToAdd,
    targetPieces,
    shippingAfterInr,
    shippingSavingsInr,
    message,
  };
}
