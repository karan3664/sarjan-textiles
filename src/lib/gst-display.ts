import { tcsRateOnSale } from "@/lib/commerce-config";

/** Formatted TCS amount for display on invoices / checkout summaries (not legal advice). */
export function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function computeTcsOnTaxableSale(subtotalInr: number) {
  const rate = tcsRateOnSale();
  if (rate <= 0) return { rate, amount: 0 };
  const amount = Math.round(subtotalInr * rate * 100) / 100;
  return { rate, amount };
}
