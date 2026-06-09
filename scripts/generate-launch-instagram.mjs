import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const assetsDir = path.join(root, "public/sarjan-assets");
const outDir = path.join(assetsDir, "instagram");
const logoPath = path.join(assetsDir, "sarjan-logo-full.png");

const W = 1080;
const H = 1350;
const LOGO_WIDTH = 300;

function buildBackgroundSvg() {
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#120a0e"/>
      <stop offset="42%" stop-color="#1a1018"/>
      <stop offset="100%" stop-color="#0d0a12"/>
    </linearGradient>
    <radialGradient id="glowBurgundy" cx="15%" cy="18%" r="55%">
      <stop offset="0%" stop-color="rgba(139,31,45,0.55)"/>
      <stop offset="100%" stop-color="rgba(139,31,45,0)"/>
    </radialGradient>
    <radialGradient id="glowGold" cx="88%" cy="82%" r="50%">
      <stop offset="0%" stop-color="rgba(201,162,39,0.22)"/>
      <stop offset="100%" stop-color="rgba(201,162,39,0)"/>
    </radialGradient>
    <linearGradient id="fabric" x1="780" y1="180" x2="980" y2="520">
      <stop offset="0%" stop-color="#8b1f2d"/>
      <stop offset="55%" stop-color="#c91e34"/>
      <stop offset="100%" stop-color="#6b1228"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e8d5a3"/>
      <stop offset="100%" stop-color="#c9a227"/>
    </linearGradient>
    <linearGradient id="bigAccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8b1f2d"/>
      <stop offset="100%" stop-color="#c9a227"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glowBurgundy)"/>
  <rect width="${W}" height="${H}" fill="url(#glowGold)"/>

  <g opacity="0.35" fill="#ffffff">
    ${Array.from({ length: 48 }, (_, i) => {
      const x = (i * 173) % W;
      const y = (i * 97 + 40) % H;
      const r = i % 3 === 0 ? 1.6 : 1.1;
      return `<circle cx="${x}" cy="${y}" r="${r}" opacity="${0.25 + (i % 5) * 0.12}"/>`;
    }).join("")}
  </g>

  <g opacity="0.92" transform="translate(720 120) rotate(8)">
    <ellipse cx="120" cy="250" rx="88" ry="16" fill="#000" opacity="0.35"/>
    <rect x="48" y="70" width="144" height="168" rx="22" fill="url(#fabric)"/>
    ${[0, 1, 2, 3, 4].map((i) => `<line x1="${58 + i * 28}" y1="84" x2="${58 + i * 28}" y2="224" stroke="rgba(245,240,232,0.14)" stroke-width="2"/>`).join("")}
    <ellipse cx="120" cy="70" rx="72" ry="20" fill="#f5f0e8" opacity="0.9"/>
    <ellipse cx="120" cy="238" rx="72" ry="20" fill="#8b1f2d"/>
    <g transform="translate(150 18)">
      <path d="M28 34h56l8 92H20L28 34z" fill="url(#gold)" opacity="0.95"/>
      <path d="M44 34c0-12 10-20 22-20s22 8 22 20" stroke="#f5f0e8" stroke-width="4" fill="none"/>
      <text x="52" y="88" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#120a0e">MOQ</text>
    </g>
  </g>

  <text x="540" y="500" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="rgba(245,240,232,0.72)">We're almost ready!</text>

  <text x="540" y="580" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="#ffffff">Get ready for something</text>
  <text x="540" y="650" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="#ffffff">BIG</text>
  <rect x="455" y="662" width="170" height="16" rx="4" fill="url(#bigAccent)" opacity="0.85"/>

  <text x="540" y="760" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" font-style="italic" fill="#ffffff">The countdown has begun!</text>

  <text x="540" y="840" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="rgba(245,240,232,0.68)">Wholesale textile catalog · MOQ ordering · B2B portal</text>

  <text x="540" y="940" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="rgba(245,240,232,0.85)">
    <tspan font-weight="600">Go live:</tspan>
    <tspan> 17 June 2026</tspan>
  </text>

  <text x="540" y="1020" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="600" fill="#c9a227">sarjantextiles.com</text>
</svg>`;
}

await mkdir(outDir, { recursive: true });

const logoMeta = await sharp(logoPath).metadata();
const logoHeight = Math.round(
  (LOGO_WIDTH * (logoMeta.height ?? LOGO_WIDTH)) /
    (logoMeta.width ?? LOGO_WIDTH),
);
const logoLeft = Math.round((W - LOGO_WIDTH) / 2);
const logoTop = 120;

const logoBuffer = await sharp(logoPath)
  .resize(LOGO_WIDTH, logoHeight, { fit: "inside" })
  .png()
  .toBuffer();

const backgroundBuffer = await sharp(Buffer.from(buildBackgroundSvg()))
  .png()
  .toBuffer();

const pngPath = path.join(outDir, "launch-countdown-4x5.png");
const pngBuffer = await sharp(backgroundBuffer)
  .composite([
    {
      input: logoBuffer,
      left: logoLeft,
      top: logoTop,
      blend: "screen",
    },
  ])
  .png({ compressionLevel: 9 })
  .toBuffer();

await writeFile(pngPath, pngBuffer);

console.log(`Wrote ${pngPath}`);
console.log("Original sarjan-logo-full.png · no timer · Go live: 17 June 2026");
