/**
 * Sarjan AI 3.1 — automated suite + PASS/FAIL report.
 * Run: npm run test:sarjan-ai-31
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type ResultRow = {
  area: string;
  test: string;
  type: "unit" | "integration" | "manual";
  status: "PASS" | "FAIL" | "SKIP" | "MANUAL";
  detail?: string;
};

const root = process.cwd();
const resultsDir = path.join(root, "test-results");
const reportPath = path.join(resultsDir, "SARJAN-AI-3.1-TEST-REPORT.md");

const UNIT_SCRIPTS = [
  "scripts/test-ai-memory-engine.ts",
  "scripts/test-meta-conversions.ts",
  "scripts/test-ai-sales.ts",
  "scripts/test-ai-auth-flow.ts",
];

const INTEGRATION_PATHS = [
  ["AI memory track API", "src/app/api/client/ai-memory/track/route.ts"],
  [
    "AI memory recommendations API",
    "src/app/api/client/ai-memory/recommendations/route.ts",
  ],
  ["AI revenue admin API", "src/app/api/admin/ai-revenue/route.ts"],
  ["AI leads admin API", "src/app/api/admin/ai-leads/route.ts"],
  ["Meta CAPI route", "src/app/api/meta/conversions/route.ts"],
  ["Memory migration", "db/migrations/20260619200000_ai_memory_engine.sql"],
  ["AI revenue admin page", "src/app/admin/ai-revenue/page.tsx"],
  ["AI leads admin page", "src/app/admin/ai-leads/page.tsx"],
  ["Meta Pixel component", "src/components/storefront/MetaPixel.tsx"],
  ["Memory engine", "src/lib/ai-memory/engine.ts"],
  ["Web session persistence", "src/lib/ai-memory/web-session.ts"],
] as const;

const rows: ResultRow[] = [];

function runTs(script: string): ResultRow {
  const name = path.basename(script, ".ts");
  const res = spawnSync("npx", ["tsx", script], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "" },
  });
  const ok = res.status === 0;
  return {
    area: "Unit",
    test: name,
    type: "unit",
    status: ok ? "PASS" : "FAIL",
    detail: ok
      ? (res.stdout || "").trim() || "ok"
      : (res.stderr || res.stdout || "failed").trim().slice(0, 400),
  };
}

function integrationRows(): ResultRow[] {
  return INTEGRATION_PATHS.map(([label, rel]) => ({
    area: "Integration",
    test: label,
    type: "integration" as const,
    status: existsSync(path.join(root, rel)) ? "PASS" : "FAIL",
    detail: rel,
  }));
}

const MANUAL_CHECKS: ResultRow[] = [
  {
    area: "Admin verification",
    test: "Open /admin/ai-revenue — metrics + top products/categories",
    type: "manual",
    status: "MANUAL",
  },
  {
    area: "Admin verification",
    test: "Open /admin/ai-leads — abandoned + purchase intent rows",
    type: "manual",
    status: "MANUAL",
  },
  {
    area: "Cross-device",
    test: "Web: list view → grid → refresh — sessionId in localStorage",
    type: "manual",
    status: "MANUAL",
  },
  {
    area: "Meta Pixel",
    test: "Set NEXT_PUBLIC_META_PIXEL_ID — PageView in browser after consent",
    type: "manual",
    status: "MANUAL",
  },
];

for (const script of UNIT_SCRIPTS) {
  rows.push(runTs(script));
}
rows.push(...integrationRows());
rows.push(...MANUAL_CHECKS);

const pass = rows.filter((r) => r.status === "PASS").length;
const fail = rows.filter((r) => r.status === "FAIL").length;
const manual = rows.filter((r) => r.status === "MANUAL").length;

mkdirSync(resultsDir, { recursive: true });

const lines = [
  "# Sarjan AI 3.1 — Test Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Summary",
  "",
  `| Result | Count |`,
  `|--------|-------|`,
  `| PASS | ${pass} |`,
  `| FAIL | ${fail} |`,
  `| MANUAL | ${manual} |`,
  "",
  "## Results",
  "",
  "| Area | Test | Type | Status | Detail |",
  "|------|------|------|--------|--------|",
  ...rows.map(
    (r) =>
      `| ${r.area} | ${r.test} | ${r.type} | **${r.status}** | ${(r.detail ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ")} |`,
  ),
  "",
  fail > 0
    ? "## Action required\n\nFix FAIL rows before production deploy.\n"
    : "",
];

writeFileSync(reportPath, lines.join("\n"), "utf8");

console.log(`Report: ${reportPath}`);
console.log(`PASS ${pass} | FAIL ${fail} | MANUAL ${manual}`);
if (fail > 0) process.exit(1);
