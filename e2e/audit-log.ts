import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export type AuditArea =
  | "Backend API"
  | "Frontend Web"
  | "Flow"
  | "Integration"
  | "Senior QA";
export type AuditStatus = "PASS" | "FAIL" | "WARN" | "SKIP";

export type AuditFinding = {
  area: AuditArea;
  category: string;
  check: string;
  status: AuditStatus;
  detail: string;
};

const findings: AuditFinding[] = [];
const outDir = path.join(process.cwd(), "test-results");

export function recordFinding(finding: AuditFinding) {
  findings.push(finding);
}

export function flushAuditReport() {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, "audit-findings.json"),
    JSON.stringify(findings, null, 2),
  );
}

export function getFindings() {
  return findings;
}
