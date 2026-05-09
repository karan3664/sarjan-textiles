import * as XLSX from "xlsx";
import type { Product } from "@/data/mock";

export const runtime = "nodejs";

type SheetRow = Record<string, string | number | boolean | null | undefined>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stringValue(row: SheetRow, key: string) {
  return String(row[key] ?? "").trim();
}

function numberValue(row: SheetRow, key: string, fallback = 0) {
  const value = Number(String(row[key] ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(value) ? value : fallback;
}

function boolValue(value: unknown) {
  return ["true", "yes", "1", "featured"].includes(String(value ?? "").trim().toLowerCase());
}

function productFromRow(row: SheetRow, index: number): Product {
  const name = stringValue(row, "name");
  const sku = stringValue(row, "sku");
  const imageUrls = stringValue(row, "image_urls") || stringValue(row, "images");

  return {
    id: stringValue(row, "id") || `PRD-${Date.now().toString().slice(-6)}-${String(index + 1).padStart(2, "0")}`,
    slug: stringValue(row, "slug") || slugify(name || sku || `product-${index + 1}`),
    name,
    sku,
    category: stringValue(row, "category") || "Uncategorized",
    fabric: stringValue(row, "fabric") || "Cotton",
    price: numberValue(row, "price"),
    moq: numberValue(row, "moq", 1),
    stock: numberValue(row, "stock"),
    reserved: numberValue(row, "reserved"),
    sold: numberValue(row, "sold"),
    colors: splitList(stringValue(row, "colors")),
    sizes: splitList(stringValue(row, "sizes")),
    images: splitList(imageUrls).length ? splitList(imageUrls) : ["/sarjan-assets/sarjan-logo-icon.png"],
    description: stringValue(row, "description"),
    care: stringValue(row, "care"),
    isFeatured: boolValue(row.is_featured ?? row.featured),
  };
}

function validProduct(product: Product) {
  return Boolean(product.name && product.sku && product.slug);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Excel file required" }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["xlsx", "xls", "csv"].includes(extension)) {
    return Response.json({ error: "Only xlsx, xls, or csv files allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return Response.json({ error: "No worksheet found" }, { status: 400 });
  }

  const rows = XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[sheetName], { defval: "" });
  const parsedProducts = rows.map(productFromRow);
  const products = parsedProducts.filter(validProduct);
  const invalidRows = parsedProducts.length - products.length;

  if (!products.length) {
    return Response.json({ error: "No valid products found. Name and SKU are required." }, { status: 400 });
  }

  return Response.json({ products, invalidRows, totalRows: rows.length });
}
