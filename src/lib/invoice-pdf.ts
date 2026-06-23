import "server-only";

import { existsSync } from "node:fs";

function chromiumExecutable() {
  const candidates = [
    process.env.CHROMIUM_PATH?.trim(),
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean) as string[];
  return candidates.find((path) => existsSync(path));
}

/** Render tax-invoice HTML to a print-ready PDF buffer (requires Chromium on the host). */
export async function renderInvoicePdf(html: string): Promise<Buffer> {
  const executablePath = chromiumExecutable();
  if (!executablePath) {
    throw new Error(
      "Chromium not found for invoice PDF (set CHROMIUM_PATH or install chromium)",
    );
  }

  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
