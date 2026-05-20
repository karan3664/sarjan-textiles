/** Ensure testimonial price notes show INR symbol when user enters plain numbers. */
export function formatTestimonialPrice(price?: string | null): string {
  const raw = price?.trim() ?? "";
  if (!raw) return "";

  if (/^₹/.test(raw)) return raw;

  const rsMatch = /^rs\.?\s*/i.exec(raw);
  if (rsMatch) return `₹${raw.slice(rsMatch[0].length).trim()}`;

  if (/^inr\s*/i.test(raw)) return `₹${raw.replace(/^inr\s*/i, "").trim()}`;

  if (/^\d/.test(raw)) return `₹${raw}`;

  return raw;
}
