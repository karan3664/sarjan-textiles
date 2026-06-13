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
  "stock_by_size",
  "stock_regular",
  "stock_plus",
  "variant_stock",
  "price",
  "moq",
  "stock",
  "description",
  "care",
  "image_urls",
  "is_featured",
];

/** One demo product — both size groups with per-size piece stock for all colors. */
const sampleRow = {
  name: "Ajrakh Printed Cotton Shirt (Sample)",
  sku: "STS-SAMPLE-01",
  category: "Printed Shirts",
  fabric: "Cotton cambric",
  colors: "Indigo,Maroon,Black",
  sizes_regular: "S,M,L,XL,XXL",
  sizes_plus: "3XL,4XL,5XL",
  stock_by_size: "S:20|M:25|L:30|XL:20|XXL:15|3XL:10|4XL:8|5XL:5",
  stock_regular: "",
  stock_plus: "",
  variant_stock: "",
  price: 120,
  moq: 12,
  stock: "",
  description:
    "Sample bulk row. Customer can order XS-XXL set or 3XL-5XL set separately.",
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
  column.width = Math.max(header.length + 4, 16);
});

const notes = workbook.addWorksheet("How to fill");
notes.addRow(["Column", "Example", "Notes"]);
notes.addRow([
  "sizes_regular",
  "S,M,L,XL,XXL",
  "XS to XXL group. Optional if sizes column has all sizes.",
]);
notes.addRow([
  "sizes_plus",
  "3XL,4XL,5XL",
  "Plus group up to 5XL only (no Free Size).",
]);
notes.addRow([
  "stock_by_size",
  "S:20|M:25|3XL:10",
  "Same piece qty for every color. Use | or , between sizes.",
]);
notes.addRow([
  "stock_regular / stock_plus",
  "20 / 8",
  "Same qty per size in that group for all colors.",
]);
notes.addRow([
  "variant_stock",
  "Indigo:S:20,Maroon:3XL:8",
  "Per color+size pieces. Overrides stock_by_size for those cells.",
]);
notes.getRow(1).font = { bold: true };
notes.getColumn(1).width = 22;
notes.getColumn(2).width = 28;
notes.getColumn(3).width = 52;

await mkdir(outDir, { recursive: true });
const buffer = await workbook.xlsx.writeBuffer();
await writeFile(outFile, Buffer.from(buffer));

console.log(`Wrote ${outFile}`);
