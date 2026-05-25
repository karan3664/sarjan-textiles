import type { BotProductPreview } from "@/lib/order-bot/types";

export type SetQuantityValidation = {
  ok: boolean;
  quantity: number;
  notes: string[];
};

export function validateSetQuantity(
  product: BotProductPreview,
  requested: number,
): SetQuantityValidation {
  const notes: string[] = [];
  const moq = Math.max(1, product.moq ?? 1);
  let qty = Math.max(1, Math.floor(Number(requested) || 1));

  if (!product.inStock) {
    return {
      ok: false,
      quantity: 0,
      notes: [
        `**${product.name}** is out of stock. Pick another product or ask for **categories**.`,
      ],
    };
  }

  if (qty < moq) {
    notes.push(
      `MOQ for **${product.name}** is **${moq}** set(s). Raised quantity from ${qty} to ${moq}.`,
    );
    qty = moq;
  }

  if (product.setsInStock !== undefined) {
    const available = Math.max(0, Math.floor(product.setsInStock));
    if (available <= 0) {
      return {
        ok: false,
        quantity: 0,
        notes: [`**${product.name}** has no sets left in stock right now.`],
      };
    }
    if (qty > available) {
      notes.push(
        `Low stock: only **${available}** set(s) available for **${product.name}**. Quantity adjusted from ${Math.floor(Number(requested) || 1)} to **${available}**.`,
      );
      qty = available;
    } else if (available <= moq * 2 || available <= 30) {
      notes.push(
        `Stock is low (**${available}** set(s) left). You can order up to **${available}** sets now.`,
      );
    }
  }

  return { ok: true, quantity: qty, notes };
}
