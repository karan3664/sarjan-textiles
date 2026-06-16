#!/usr/bin/env node
/**
 * Process Mashru kurta zip photos on LIVE via Admin AI Studio API.
 *
 *   node scripts/push-mashru-kurta-images-live.mjs <csv> <zip>
 */
import { readFileSync, mkdtempSync, readdirSync, existsSync } from "fs";
import { execSync } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import os from "os";
import ExcelJS from "exceljs";
import {
  listZipImageGroups,
  mapImagesToColors,
} from "./lib/zip-image-groups.mjs";

const ROOT = process.cwd();
const STUDIO_CATEGORY = "mens-kurta";
const STUDIO_COLLECTION = "mashru-ajrakh-kurta";

function loadEnvLocal() {
  try {
    const raw = readFileSync(path.join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("="))
        continue;
      const eq = trimmed.indexOf("=");
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const LIVE_URL = (
  process.env.LIVE_SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://sarjantextiles.com"
).replace(/\/$/, "");

const ADMIN_EMAIL = (
  process.env.LIVE_ADMIN_EMAIL ??
  process.env.ADMIN_EMAIL ??
  ""
).trim();
const ADMIN_PASSWORD = (
  process.env.LIVE_ADMIN_PASSWORD ??
  process.env.ADMIN_PASSWORD ??
  ""
).trim();

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringValue(row, key) {
  return String(row[key] ?? "").trim();
}

async function parseCsvFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.csv.readFile(filePath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error(`No worksheet in ${filePath}`);

  const headers = [];
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value ?? "").trim();
      });
      return;
    }
    const record = {};
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber];
      if (key) record[key] = cell.value;
    });
    if (stringValue(record, "name") || stringValue(record, "sku")) {
      rows.push(record);
    }
  });
  return rows;
}

async function adminLogin() {
  const res = await fetch(`${LIVE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sarjan-native-admin": "1",
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Admin login failed (${res.status})`);
  }
  const token =
    data.token ??
    res.headers
      .getSetCookie?.()
      ?.map((c) => c.split(";")[0])
      .find((c) => c.startsWith("sarjan-admin-session="))
      ?.slice("sarjan-admin-session=".length);
  if (!token) throw new Error("Login OK but no session token returned.");
  return token;
}

function adminHeaders(token) {
  return {
    Cookie: `sarjan-admin-session=${encodeURIComponent(token)}`,
  };
}

async function uploadOne(token, job) {
  const buffer = await readFile(job.sourceFile);
  const form = new FormData();
  form.append("category", STUDIO_CATEGORY);
  form.append("collection", STUDIO_COLLECTION);
  form.append("attributeType", job.sku.toLowerCase());
  form.append("attributeValue", job.color.toLowerCase());
  form.append(
    "files",
    new Blob([buffer], { type: "image/jpeg" }),
    path.basename(job.sourceFile),
  );

  const res = await fetch(`${LIVE_URL}/api/admin/ai-studio/upload`, {
    method: "POST",
    headers: adminHeaders(token),
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Upload failed (${res.status})`);
  }
  return data;
}

async function scan(token) {
  const res = await fetch(`${LIVE_URL}/api/admin/ai-studio/scan`, {
    method: "POST",
    headers: {
      ...adminHeaders(token),
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Scan failed (${res.status})`);
  return data;
}

async function processBatch(token, limit = 6) {
  const res = await fetch(`${LIVE_URL}/api/admin/ai-studio/process`, {
    method: "POST",
    headers: {
      ...adminHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ limit }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Process failed (${res.status})`);
  return data;
}

async function studioSnapshot(token) {
  const res = await fetch(`${LIVE_URL}/api/admin/ai-studio`, {
    headers: adminHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Snapshot failed (${res.status})`);
  return data;
}

async function approve(token, id, sku, color) {
  const res = await fetch(`${LIVE_URL}/api/admin/ai-studio/action`, {
    method: "POST",
    headers: {
      ...adminHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      action: "approve",
      sku,
      note: `Mashru kurta live push — ${sku} ${color}`,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Approve failed (${res.status})`);
  return data.record;
}

async function main() {
  const csvPath = process.argv[2];
  const zipPath = process.argv[3];
  if (!csvPath || !zipPath) {
    throw new Error(
      "Usage: node scripts/push-mashru-kurta-images-live.mjs <csv> <zip>",
    );
  }
  if (!existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`);
  if (!existsSync(zipPath)) throw new Error(`Zip not found: ${zipPath}`);

  const rows = await parseCsvFile(csvPath);
  const extractDir = mkdtempSync(path.join(os.tmpdir(), "mashru-kurta-live-"));
  execSync(
    `unzip -q ${JSON.stringify(zipPath)} -d ${JSON.stringify(extractDir)}`,
  );
  const imageGroups = listZipImageGroups(extractDir, readdirSync, path);
  if (imageGroups.length !== rows.length) {
    throw new Error(
      `CSV has ${rows.length} products but zip has ${imageGroups.length} groups`,
    );
  }

  const jobs = [];
  rows.forEach((row, index) => {
    const sku = stringValue(row, "sku");
    const colors = splitList(stringValue(row, "colors"));
    const mappings = mapImagesToColors(imageGroups[index] ?? [], colors);
    for (const mapping of mappings) {
      if (!mapping.sourceFile) continue;
      jobs.push({ sku, color: mapping.color, sourceFile: mapping.sourceFile });
    }
  });

  console.log(`Uploading ${jobs.length} images to live AI studio…`);
  const token = await adminLogin();
  console.log(`Logged in to ${LIVE_URL}`);

  for (const job of jobs) {
    await uploadOne(token, job);
    console.log(`  ↑ ${job.sku} ${job.color}`);
  }

  const scanResult = await scan(token);
  console.log(
    `Scan: added ${scanResult.added?.length ?? 0}, skipped ${scanResult.skipped?.length ?? 0}`,
  );

  let remaining = 1;
  while (remaining > 0) {
    const result = await processBatch(token, 6);
    remaining = result.remaining ?? 0;
    console.log(
      `  processed ${result.processed?.length ?? 0}, remaining ${remaining}`,
    );
    if ((result.processed?.length ?? 0) === 0 && remaining > 0) {
      throw new Error("Processing stalled on live server");
    }
  }

  const snapshot = await studioSnapshot(token);
  let approved = 0;
  for (const row of rows) {
    const sku = stringValue(row, "sku");
    const colors = splitList(stringValue(row, "colors"));
    for (const color of colors) {
      const record = (snapshot.records ?? []).find(
        (item) =>
          item.status === "processed" &&
          item.metadata?.attributeType === sku.toLowerCase() &&
          item.metadata?.attributeValue === color.toLowerCase(),
      );
      if (!record) {
        console.warn(`  ! no processed record for ${sku} ${color}`);
        continue;
      }
      await approve(token, record.id, sku, color);
      approved += 1;
      console.log(`  ✓ approved ${sku} ${color}`);
    }
  }

  console.log(`\nDone. Approved ${approved} images on live server.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
