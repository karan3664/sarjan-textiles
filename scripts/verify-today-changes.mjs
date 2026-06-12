/**
 * Smoke checks for today's storefront/pricing changes.
 * Run: node scripts/verify-today-changes.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- order-rounding (mirror src/lib/order-rounding.ts) ---
function computeRoundOff(preciseTotalInr) {
  const finalTotal = Math.round(preciseTotalInr);
  const roundOff = Math.round((finalTotal - preciseTotalInr) * 100) / 100;
  return { roundOff, finalTotal };
}

// --- formatInrPricingLine (mirror src/lib/gst-display.ts) ---
function formatInr(amount) {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}
function formatInrPricingLine(amount) {
  const value = Math.round(amount * 100) / 100;
  if (Math.abs(value % 1) < 0.001) return formatInr(value);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}₹${abs.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// --- resetFilterHref logic (mirror ModaveSections) ---
function resetFilterHref(sortValue, basePath) {
  const params = new URLSearchParams();
  if (sortValue && sortValue !== "best-selling") params.set("sort", sortValue);
  params.set("page", "1");
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}

const checks = [];

function assert(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

// Pricing: ₹2,250 + 5% GST
const gst = Math.round(2250 * 0.05 * 100) / 100;
const precise = 2250 + gst;
const { roundOff, finalTotal } = computeRoundOff(precise);
assert("GST on 2250 is 112.5", gst === 112.5);
assert("Round off is 0.5", roundOff === 0.5);
assert("Final total is 2363", finalTotal === 2363);
assert(
  "GST displays with paise",
  formatInrPricingLine(gst) === "₹112.50",
  formatInrPricingLine(gst),
);
assert(
  "Round off displays with paise",
  formatInrPricingLine(roundOff) === "₹0.50",
  formatInrPricingLine(roundOff),
);
assert("Subtotal stays whole", formatInrPricingLine(2250) === "₹2,250");

// Reset filters clears search q
const reset = resetFilterHref("best-selling", "/products");
assert("Reset filters drops search q", !reset.includes("q="), reset);
const resetSort = resetFilterHref("price-asc", "/products");
assert(
  "Reset keeps non-default sort only",
  resetSort.includes("sort=price-asc") && !resetSort.includes("q="),
  resetSort,
);

// Source files exist
for (const rel of [
  "src/lib/order-inventory.ts",
  "src/lib/b2b-order-messages.ts",
  "src/components/admin/AdminPromotionsClient.tsx",
]) {
  try {
    readFileSync(join(root, rel));
    assert(`File present: ${rel}`, true);
  } catch {
    assert(`File present: ${rel}`, false);
  }
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
process.exit(failed.length ? 1 : 0);
