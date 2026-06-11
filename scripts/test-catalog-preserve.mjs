import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(root);
process.env.AI_IMAGE_CATALOG_MODE = "preserve";

const { processStudioImages } = await import("../src/lib/ai-product-studio.ts");

const samples = [
  {
    id: "3897d47d-0e22-4218-bdf8-ec24b4d3e872",
    label: "mustard-shirt",
  },
  {
    id: "bca125a9-398e-42a4-b939-05068e895556",
    label: "blue-kurta",
  },
];

for (const sample of samples) {
  const result = await processStudioImages([sample.id], 1);
  const record = result.processed[0];
  console.log(
    sample.label,
    record?.status,
    record?.error || record?.outputs?.zoom || "no output",
  );
  if (record?.outputs?.zoom) {
    const out = path.join(root, "products", record.outputs.zoom);
    const dest = path.join("/tmp", `sarjan-test-${sample.label}.webp`);
    const { copyFile } = await import("fs/promises");
    await copyFile(out, dest);
    console.log("saved", dest);
  }
}
