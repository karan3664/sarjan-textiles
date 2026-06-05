import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const assetsDir = path.join(root, "public/sarjan-assets");

const categories = [
  { svg: "category-printed-shirts.svg", webp: "category-printed-shirts.webp" },
  { svg: "category-kurtas.svg", webp: "category-kurtas.webp" },
  { svg: "category-festive-prints.svg", webp: "category-festive-prints.webp" },
];

for (const { svg, webp } of categories) {
  const input = path.join(assetsDir, svg);
  const output = path.join(assetsDir, webp);
  const buffer = await readFile(input);
  await sharp(buffer, { density: 144 })
    .resize(800, 960, { fit: "cover" })
    .webp({ quality: 88, effort: 6 })
    .toFile(output);
  console.log(`Wrote ${webp}`);
}
