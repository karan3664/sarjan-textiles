#!/usr/bin/env node
/**
 * Regenerate src/styles/{tokens,storefront,admin}.css from a monolithic source.
 * Run after bulk-editing CSS: node scripts/split-globals-css.mjs path/to/source.css
 *
 * Default: uses existing src/styles/storefront.css + admin.css merge is manual.
 * Sprint 5 split is maintained as separate files — edit those directly.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ADMIN_RANGES = [
  [40, 178],
  [698, 711],
  [1348, 4538],
  [5211, 5219],
  [6269, 6697],
  [6698, 7775],
  [12110, 12547],
  [13965, 14065],
];

const sourcePath = process.argv[2];
if (!sourcePath || !existsSync(sourcePath)) {
  console.log(
    "Sprint 5 CSS lives in src/styles/{tokens,storefront,admin}.css — edit those files directly.",
  );
  process.exit(0);
}

const lines = readFileSync(resolve(sourcePath), "utf8").splitlines();
const adminSet = new Set(
  ADMIN_RANGES.flatMap(([a, b]) =>
    Array.from({ length: b - a + 1 }, (_, i) => a + i),
  ),
);

const tokens = [];
const storefront = [];
const admin = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const n = i + 1;
  if (n <= 33) tokens.push(line);
  else if (adminSet.has(n)) admin.push(line);
  else storefront.push(line);
}

const root = resolve(import.meta.dirname, "..");
writeFileSync(resolve(root, "src/styles/tokens.css"), tokens.join("\n") + "\n");
writeFileSync(
  resolve(root, "src/styles/storefront.css"),
  storefront.join("\n") + "\n",
);
writeFileSync(resolve(root, "src/styles/admin.css"), admin.join("\n") + "\n");
writeFileSync(
  resolve(root, "src/app/globals.css"),
  `@tailwind base;
@tailwind components;
@tailwind utilities;

@import "../styles/tokens.css";
@import "../styles/storefront.css";
`,
);

console.log("Split complete:", {
  tokens: tokens.length,
  storefront: storefront.length,
  admin: admin.length,
});
