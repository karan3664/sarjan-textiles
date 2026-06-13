import ExcelJS from "exceljs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "samples");
const outFile = path.join(outDir, "sarjan-product-bulk-upload-sample.xlsx");

const headers = [
  "name",
  "sku",
  "category",
  "fabric",
  "colors",
  "sizes_regular",
  "sizes_plus",
  "stock_regular",
  "stock_plus",
  "variant_stock",
  "price",
  "moq",
  "description",
  "care",
  "image_urls",
  "is_featured",
];

/** stock_regular=10 → 10 full sets (S–XXL) per color; stock_plus=5 → 5 full sets (3XL–5XL) per color. */
const sampleRow = {
  name: "Ajrakh Printed Cotton Shirt (Sample)",
  sku: "STS-SAMPLE-01",
  category: "Printed Shirts",
  fabric: "Cotton cambric",
  colors: "Indigo,Maroon,Black",
  sizes_regular: "S,M,L,XL,XXL",
  sizes_plus: "3XL,4XL,5XL",
  stock_regular: 10,
  stock_plus: 5,
  variant_stock: "",
  price: 120,
  moq: 12,
  description:
    "Sample row: 10 regular sets + 5 plus sets per color. Customer qty 3 = 3 full sets.",
  care: "Gentle wash separately, Dry in shade",
  image_urls: "",
  is_featured: "no",
};

const workbook = new ExcelJS.Workbook();
workbook.creator = "Sarjan Textiles";
workbook.created = new Date();

const sheet = workbook.addWorksheet("Products", {
  views: [{ state: "frozen", ySplit: 1 }],
});

sheet.addRow(headers);
sheet.addRow(headers.map((key) => sampleRow[key] ?? ""));

sheet.getRow(1).font = { bold: true };
sheet.getRow(1).fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF5F5F5" },
};

headers.forEach((header, index) => {
  const column = sheet.getColumn(index + 1);
  column.width = Math.max(header.length + 4, 18);
});

const notes = workbook.addWorksheet("How to fill");
notes.addRow(["Column", "Example", "Meaning"]);
notes.addRow([
  "stock_regular",
  "10",
  "10 full sets per color for XS–XXL group. 1 set = one piece of each size in sizes_regular.",
]);
notes.addRow(["stock_plus", "5", "5 full sets per color for 3XL–5XL group."]);
notes.addRow([
  "Customer order qty",
  "3 sets",
  "3 complete sets — not 3 individual pieces.",
]);
notes.addRow([
  "variant_stock",
  "Indigo:S:12,Maroon:3XL:6",
  "Optional per-color override (values are still SET count).",
]);
notes.getRow(1).font = { bold: true };
notes.getColumn(1).width = 18;
notes.getColumn(2).width = 24;
notes.getColumn(3).width = 56;

await mkdir(outDir, { recursive: true });
const buffer = await workbook.xlsx.writeBuffer();
await writeFile(outFile, Buffer.from(buffer));

console.log(`Wrote ${outFile}`);
