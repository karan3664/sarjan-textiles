#!/usr/bin/env node
/**
 * Encode Firebase service-account JSON for Coolify / Docker env vars.
 *
 * Usage:
 *   node scripts/encode-firebase-service-account.mjs ~/Downloads/sarjan-firebase-adminsdk.json
 *
 * Paste the printed base64 string into Coolify → FIREBASE_SERVICE_ACCOUNT (no quotes).
 * Then redeploy.
 */
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error(
    "Usage: node scripts/encode-firebase-service-account.mjs <service-account.json>",
  );
  process.exit(1);
}

const json = JSON.parse(readFileSync(path, "utf8"));
if (!json.project_id || !json.client_email || !json.private_key) {
  console.error(
    "Invalid service account JSON — missing project_id, client_email, or private_key.",
  );
  process.exit(1);
}

const compact = JSON.stringify(json);
const base64 = Buffer.from(compact, "utf8").toString("base64");

console.log("\nAdd to Coolify → Environment Variables:\n");
console.log("Key:   FIREBASE_SERVICE_ACCOUNT");
console.log("Value: (base64 below — single line, no quotes)\n");
console.log(base64);
console.log("\nThen Redeploy the app.\n");
