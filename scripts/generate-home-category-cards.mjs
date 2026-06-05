/**
 * Premium home category cards from real studio product photos.
 * Outputs PNG + WebP for manual CMS upload (Admin → Home → Category Cards).
 *
 *   node scripts/generate-home-category-cards.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const assetsDir = path.join(root, "public/sarjan-assets");
const outDir = path.join(assetsDir, "home-category-upload");

const WIDTH = 1200;
const HEIGHT = 1500;

const cards = [
  {
    id: "printed-shirts",
    label: "Printed Shirts",
    product: "shirt-ajrak-black-studio.webp",
    bgTop: "#F8F3EB",
    bgBottom: "#E8DDD0",
    accent: "#C9A96E",
    glow: "#1B3A57",
    productScale: 0.88,
    productOffsetY: 24,
    useStage: false,
  },
  {
    id: "kurtas",
    label: "Kurtas",
    product: "kurta-blue-floral-studio.webp",
    bgTop: "#0E4A4A",
    bgBottom: "#0A3535",
    accent: "#C9A96E",
    glow: "#5ECFCF",
    productScale: 0.9,
    productOffsetY: 18,
    useStage: true,
  },
  {
    id: "festive-prints",
    label: "Festive Prints",
    product: "kurta-red-medallion-studio.webp",
    bgTop: "#6B1228",
    bgBottom: "#4A0A18",
    accent: "#D4AF37",
    glow: "#F5E6A8",
    productScale: 0.9,
    productOffsetY: 20,
    useStage: true,
  },
];

function gradientSvg(top, bottom, accent, glow) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${WIDTH}" y2="${HEIGHT}" gradientUnits="userSpaceOnUse">
      <stop stop-color="${top}"/>
      <stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
    <radialGradient id="glowL" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
      gradientTransform="translate(180 220) rotate(90) scale(420)">
      <stop stop-color="${glow}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowR" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
      gradientTransform="translate(${WIDTH - 160} ${HEIGHT - 180}) rotate(90) scale(520)">
      <stop stop-color="${accent}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.28"/>
    </linearGradient>
    <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.42"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="8" fill="${accent}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowL)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowR)"/>
  <ellipse cx="${WIDTH / 2}" cy="${HEIGHT - 90}" rx="420" ry="36" fill="#000" opacity="0.14"/>
  <rect y="${Math.round(HEIGHT * 0.62)}" width="${WIDTH}" height="${Math.round(HEIGHT * 0.38)}" fill="url(#vignette)"/>
  <rect y="${Math.round(HEIGHT * 0.78)}" width="${WIDTH}" height="${Math.round(HEIGHT * 0.22)}" fill="url(#floor)"/>
</svg>`);
}

async function prepareProduct(productPath, card) {
  const trimmed = await sharp(productPath).trim({ threshold: 18 }).toBuffer();

  const productMeta = await sharp(trimmed).metadata();
  let targetH = Math.round(HEIGHT * card.productScale);
  let targetW = Math.round((productMeta.width / productMeta.height) * targetH);
  const maxW = WIDTH - 96;
  if (targetW > maxW) {
    targetW = maxW;
    targetH = Math.round((productMeta.height / productMeta.width) * targetW);
  }

  return sharp(trimmed)
    .resize(targetW, targetH, {
      fit: "inside",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}

async function buildCard(card) {
  const productPath = path.join(assetsDir, card.product);
  let product = await prepareProduct(productPath, card);
  const productMeta = await sharp(product).metadata();
  let targetW = productMeta.width ?? WIDTH;
  let targetH = productMeta.height ?? HEIGHT;

  if (card.useStage) {
    const stageW = Math.min(WIDTH - 48, targetW + 72);
    const stageH = Math.min(HEIGHT - 120, targetH + 48);
    const stageSvg =
      Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${stageW}" height="${stageH}" viewBox="0 0 ${stageW} ${stageH}">
      <rect x="8" y="8" width="${stageW - 16}" height="${stageH - 16}" rx="28" fill="#FFFFFF" opacity="0.94"/>
    </svg>`);
    const fittedProduct = await sharp(product)
      .resize(stageW - 32, stageH - 32, {
        fit: "inside",
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer();
    product = await sharp(stageSvg)
      .composite([{ input: fittedProduct, gravity: "centre" }])
      .png()
      .toBuffer();
  }

  const maxProductW = WIDTH - 64;
  const maxProductH = HEIGHT - 140;
  const productLayer = await sharp(product)
    .resize(maxProductW, maxProductH, {
      fit: "inside",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  const background = await sharp(
    gradientSvg(card.bgTop, card.bgBottom, card.accent, card.glow),
  )
    .png()
    .toBuffer();

  const composed = await sharp(background)
    .composite([
      {
        input: productLayer,
        gravity: "centre",
      },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  const pngPath = path.join(outDir, `${card.id}.png`);
  const webpPath = path.join(outDir, `${card.id}.webp`);
  const cmsWebpPath = path.join(assetsDir, `category-${card.id}.webp`);

  await writeFile(pngPath, composed);
  await sharp(composed)
    .webp({ quality: 92, effort: 6, smartSubsample: true })
    .toFile(webpPath);
  await sharp(composed)
    .resize(800, 1000, { fit: "cover", position: "centre" })
    .webp({ quality: 90, effort: 6 })
    .toFile(cmsWebpPath);

  return { pngPath, webpPath, cmsWebpPath, label: card.label };
}

await mkdir(outDir, { recursive: true });

const results = [];
for (const card of cards) {
  results.push(await buildCard(card));
  console.log(`✓ ${card.label} → home-category-upload/${card.id}.png`);
}

const readme = `# Home category images (upload-ready)

Generated by \`node scripts/generate-home-category-cards.mjs\`.

## Files

| Category | PNG (upload) | WebP |
|----------|--------------|------|
| Printed Shirts | \`printed-shirts.png\` | \`printed-shirts.webp\` |
| Kurtas | \`kurtas.png\` | \`kurtas.webp\` |
| Festive Prints | \`festive-prints.png\` | \`festive-prints.webp\` |

Size: **1200 × 1500 px** — works on web carousel and mobile (object-fit: cover).

## Upload in Admin

1. **Admin → Home → Category Cards**
2. For each card, click **Upload image**
3. Use the matching PNG from this folder
4. Save home page

Product photos used:
- Printed Shirts — Ajrakh block print shirt
- Kurtas — Blue floral kurta
- Festive Prints — Red medallion kurta

Regenerate anytime after swapping source photos in the script.
`;

await writeFile(path.join(outDir, "README.md"), readme);
console.log(`\nDone. Upload from: public/sarjan-assets/home-category-upload/`);
