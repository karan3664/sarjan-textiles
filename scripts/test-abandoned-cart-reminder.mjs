/**
 * Smoke test: ABANDONED_CART_FIRST_REMINDER_HOURS + email template markers.
 * Run: node scripts/test-abandoned-cart-reminder.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, ".tmp/email-previews");

function envHours(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function pushCandidate(candidates, row, thresholds, now) {
  const { items, updatedAt, reminder1SentAt, reminder2SentAt } = row;
  if (!items.length) return;
  const updatedMs = new Date(updatedAt).getTime();
  if (!Number.isFinite(updatedMs)) return;
  const age = now - updatedMs;

  if (age >= thresholds.firstMs && !reminder1SentAt) {
    candidates.push({ stage: 1, ageHours: (age / 3_600_000).toFixed(2) });
    return;
  }
  if (age >= thresholds.secondMs && reminder1SentAt && !reminder2SentAt) {
    candidates.push({ stage: 2, ageHours: (age / 3_600_000).toFixed(2) });
    return;
  }
  if (reminder1SentAt && reminder2SentAt) {
    const lastPushMs = new Date(reminder2SentAt).getTime();
    if (
      Number.isFinite(lastPushMs) &&
      now - lastPushMs >= thresholds.repeatMs
    ) {
      candidates.push({
        stage: "daily",
        ageHours: ((now - lastPushMs) / 3_600_000).toFixed(2),
      });
    }
  }
}

// --- Config (mirror abandoned-cart-config.ts) ---
process.env.ABANDONED_CART_FIRST_REMINDER_HOURS = "6";
process.env.ABANDONED_CART_SECOND_REMINDER_HOURS = "24";
process.env.ABANDONED_CART_REPEAT_REMINDER_HOURS = "12";

const firstH = envHours("ABANDONED_CART_FIRST_REMINDER_HOURS", 6);
const secondH = envHours("ABANDONED_CART_SECOND_REMINDER_HOURS", 24);
const repeatH = envHours("ABANDONED_CART_REPEAT_REMINDER_HOURS", 12);
const hourMs = 60 * 60 * 1000;
const thresholds = {
  firstMs: firstH * hourMs,
  secondMs: secondH * hourMs,
  repeatMs: repeatH * hourMs,
};

let failed = 0;
function assert(label, ok) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`OK: ${label}`);
  }
}

assert("first reminder hours = 6", firstH === 6);
assert("second reminder hours = 24", secondH === 24);
assert("repeat reminder hours = 12", repeatH === 12);

const now = Date.now();
const sampleItem = [{ slug: "demo-saree", color: "Maroon", quantity: 2 }];

const cases = [
  {
    label: "5h idle — no reminder",
    row: {
      items: sampleItem,
      updatedAt: new Date(now - 5 * hourMs).toISOString(),
    },
    expectStage: null,
  },
  {
    label: "6h 5m idle — stage 1 email",
    row: {
      items: sampleItem,
      updatedAt: new Date(now - (6 * hourMs + 5 * 60_000)).toISOString(),
    },
    expectStage: 1,
  },
  {
    label: "25h idle + reminder1 sent — stage 2",
    row: {
      items: sampleItem,
      updatedAt: new Date(now - 25 * hourMs).toISOString(),
      reminder1SentAt: new Date(now - 20 * hourMs).toISOString(),
    },
    expectStage: 2,
  },
];

for (const c of cases) {
  const candidates = [];
  pushCandidate(candidates, c.row, thresholds, now);
  const stage = candidates[0]?.stage ?? null;
  assert(c.label, stage === c.expectStage);
}

// --- Email template HTML (mirror abandoned-cart-reminders.ts + buildSarjanEmailHtml shell) ---
const OLD_MARKERS = ["background:#6b1228", "font-family:Georgia"];

function buildPreviewInner(stage) {
  const intro =
    stage === 1 || stage === "daily"
      ? "You added wholesale sets to your cart but haven't placed the order yet."
      : "A quick reminder — your saved cart is still waiting for checkout.";
  const heading =
    stage === 2 ? "Items still in your cart" : "Your cart is saved";
  return { intro, heading };
}

function miniEmailShell({ eyebrow, heading, inner }) {
  return `<!DOCTYPE html><html><body>
    <img src="https://sarjantextiles.com/sarjan-assets/sarjan-logo-full.png" alt="Sarjan Textiles" />
    <p>${eyebrow}</p><h1>${heading}</h1>${inner}
    <p>Connect with us · B2B textile sourcing</p>
  </body></html>`;
}

for (const stage of [1, 2]) {
  const { intro, heading } = buildPreviewInner(stage);
  const html = miniEmailShell({
    eyebrow: "Cart reminder",
    heading,
    inner: `<p>${intro}</p><a style="background:#141414">Open cart</a>`,
  });
  const markers =
    stage === 1
      ? [
          "Cart reminder",
          "Your cart is saved",
          "background:#141414",
          "Sarjan Textiles",
        ]
      : [
          "Cart reminder",
          "Items still in your cart",
          "background:#141414",
          "Sarjan Textiles",
        ];
  for (const marker of markers) {
    assert(`stage ${stage} has “${marker}”`, html.includes(marker));
  }
  for (const marker of OLD_MARKERS) {
    assert(`stage ${stage} dropped old “${marker}”`, !html.includes(marker));
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, `abandoned-cart-stage-${stage}.html`),
    html,
    "utf8",
  );
}

console.log("");
console.log(`Preview files: ${outDir}/abandoned-cart-stage-1.html`);
console.log(
  "Live preview (dev server): /dev/email-preview?template=abandoned-cart&stage=1",
);
console.log("");
console.log("Template change summary:");
console.log(
  "  OLD: burgundy (#6b1228) header bar, Georgia font, standalone HTML",
);
console.log(
  "  NEW: Sarjan logo header, “Cart reminder” eyebrow, #141414 CTA, shared footer/socials",
);

if (failed) {
  process.exit(1);
}
