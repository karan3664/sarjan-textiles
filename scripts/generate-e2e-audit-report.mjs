import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const findingsPath = path.join(root, "test-results/audit-findings.json");
const reportMd = path.join(root, "test-results/E2E-AUDIT-REPORT.md");
const reportHtml = path.join(root, "test-results/E2E-AUDIT-REPORT.html");

function loadFindings() {
  if (!existsSync(findingsPath)) return [];
  return JSON.parse(readFileSync(findingsPath, "utf8"));
}

function loadPlaywrightSummary() {
  const jsonPath = path.join(root, "test-results/results.json");
  if (!existsSync(jsonPath)) return { passed: 0, failed: 0, total: 0 };
  const data = JSON.parse(readFileSync(jsonPath, "utf8"));
  const suites = data.suites ?? [];
  let passed = 0;
  let failed = 0;
  let total = 0;
  function walk(suite) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        total += 1;
        const status = test.results?.[0]?.status;
        if (status === "passed") passed += 1;
        else if (status === "failed") failed += 1;
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  }
  for (const suite of suites) walk(suite);
  return { passed, failed, total };
}

function statusEmoji(status) {
  if (status === "PASS") return "✅";
  if (status === "FAIL") return "❌";
  if (status === "WARN") return "⚠️";
  return "⏭️";
}

function findVideos() {
  const dir = path.join(root, "test-results");
  if (!existsSync(dir)) return [];
  const videos = [];
  function walk(d) {
    for (const name of readdirSync(d)) {
      const full = path.join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === "video.webm")
        videos.push(full.replace(root + path.sep, ""));
    }
  }
  walk(dir);
  return videos;
}

const findings = loadFindings();
const summary = loadPlaywrightSummary();
const videos = findVideos();
const now = new Date().toISOString();

const backend = findings.filter((f) => f.area === "Backend API");
const frontend = findings.filter((f) => f.area === "Frontend Web");
const seniorQa = findings.filter((f) => f.area === "Senior QA");
const flow = findings.filter(
  (f) => f.area.includes("Flow") || f.area === "Integration",
);
const issues = findings.filter(
  (f) => f.status === "FAIL" || f.status === "WARN",
);

function tableRows(rows) {
  if (!rows.length) return "| — | — | — | — | — |\n";
  return rows
    .map(
      (r) =>
        `| ${r.area} | ${r.category} | ${r.check} | ${statusEmoji(r.status)} ${r.status} | ${r.detail.replace(/\|/g, "/").slice(0, 120)} |`,
    )
    .join("\n");
}

const md = `# Sarjan Textiles — E2E Audit Report

Generated: **${now}**

## Summary

| Metric | Count |
|--------|------:|
| Playwright tests passed | ${summary.passed} |
| Playwright tests failed | ${summary.failed} |
| Playwright tests total | ${summary.total} |
| Audit checks PASS | ${findings.filter((f) => f.status === "PASS").length} |
| Audit checks FAIL | ${findings.filter((f) => f.status === "FAIL").length} |
| Audit checks WARN | ${findings.filter((f) => f.status === "WARN").length} |

## Issues (FAIL + WARN)

| Area | Category | Check | Status | Detail |
|------|----------|-------|--------|--------|
${tableRows(issues) || "| — | — | — | — | No issues |"}

## Backend API

| Area | Category | Check | Status | Detail |
|------|----------|-------|--------|--------|
${tableRows(backend)}

## Frontend Web

| Area | Category | Check | Status | Detail |
|------|----------|-------|--------|--------|
${tableRows(frontend)}

## Flows & Integration

| Area | Category | Check | Status | Detail |
|------|----------|-------|--------|--------|
${tableRows(flow)}

## Senior QA (UI / Responsive / Forms / Tables)

| Area | Category | Check | Status | Detail |
|------|----------|-------|--------|--------|
${tableRows(seniorQa)}

## Videos (${videos.length})

${videos.length ? videos.map((v) => `- \`${v}\``).join("\n") : "_No videos — run with UI tests (chromium-desktop project)_"}

Open HTML report: \`npm run test:e2e:report\`
`;

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>E2E Audit Report</title>
<style>
body{font-family:system-ui,sans-serif;margin:24px;background:#0d0a12;color:#f5f0e8}
h1,h2{color:#fff} table{border-collapse:collapse;width:100%;margin:16px 0;font-size:14px}
th,td{border:1px solid #333;padding:8px 10px;text-align:left} th{background:#8b1f2d}
.PASS{color:#6ee7a0}.FAIL{color:#f87171}.WARN{color:#fbbf24}
summary{background:#1a1018;padding:12px;border-radius:8px;margin:12px 0}
a{color:#c9a227}
</style></head><body>
<h1>Sarjan Textiles E2E Audit</h1>
<p>Generated: ${now}</p>
<summary>Tests: ${summary.passed}/${summary.total} passed · Issues: ${issues.length} · Videos: ${videos.length}</summary>
<h2>Issues</h2>
<table><tr><th>Area</th><th>Category</th><th>Check</th><th>Status</th><th>Detail</th></tr>
${issues.map((r) => `<tr><td>${r.area}</td><td>${r.category}</td><td>${r.check}</td><td class="${r.status}">${r.status}</td><td>${r.detail}</td></tr>`).join("")}
</table>
<h2>Backend API</h2>
<table><tr><th>Category</th><th>Check</th><th>Status</th><th>Detail</th></tr>
${backend.map((r) => `<tr><td>${r.category}</td><td>${r.check}</td><td class="${r.status}">${r.status}</td><td>${r.detail}</td></tr>`).join("")}
</table>
<h2>Frontend Web</h2>
<table><tr><th>Category</th><th>Check</th><th>Status</th><th>Detail</th></tr>
${frontend.map((r) => `<tr><td>${r.category}</td><td>${r.check}</td><td class="${r.status}">${r.status}</td><td>${r.detail}</td></tr>`).join("")}
</table>
<h2>Senior QA</h2>
<table><tr><th>Category</th><th>Check</th><th>Status</th><th>Detail</th></tr>
${seniorQa.map((r) => `<tr><td>${r.category}</td><td>${r.check}</td><td class="${r.status}">${r.status}</td><td>${r.detail}</td></tr>`).join("")}
</table>
<h2>Videos</h2><ul>${videos.map((v) => `<li><a href="../${v}">${v}</a></li>`).join("")}</ul>
</body></html>`;

mkdirSync(path.dirname(reportMd), { recursive: true });
writeFileSync(reportMd, md);
writeFileSync(reportHtml, html);
console.log(`Report: ${reportMd}`);
console.log(`HTML:   ${reportHtml}`);
console.log(`Videos: ${videos.length} file(s)`);
