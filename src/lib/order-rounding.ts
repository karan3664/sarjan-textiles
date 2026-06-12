/** Round payable total up to next whole ₹; round-off is always ≥ 0. */
export function computeRoundOff(preciseTotalInr: number) {
  const precise = Math.round(preciseTotalInr * 100) / 100;
  const finalTotal = Math.ceil(precise - 1e-9);
  const roundOff = Math.max(0, Math.round((finalTotal - precise) * 100) / 100);
  return { roundOff, finalTotal };
}
