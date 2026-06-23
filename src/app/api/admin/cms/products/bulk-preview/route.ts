import type { Product } from "@/data/mock";
import { requireAdminRouteSession } from "@/lib/require-admin-session";
import {
  isValidSheetProduct,
  parseProductSheetBuffer,
  productFromSheetRow,
} from "@/lib/product-bulk-sheet-server";

const maxBulkBytes = 10 * 1024 * 1024;

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await requireAdminRouteSession(request, {
    path: "/api/admin/cms",
  });
  if (session instanceof Response) return session;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Excel file required" }, { status: 400 });
  }
  if (file.size > maxBulkBytes) {
    return Response.json(
      { error: "Spreadsheet must be under 10 MB" },
      { status: 400 },
    );
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["xlsx", "csv"].includes(extension)) {
    return Response.json(
      { error: "Only xlsx or csv files allowed" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = await parseProductSheetBuffer(
    buffer,
    extension as "xlsx" | "csv",
  );
  if (!rows.length) {
    return Response.json({ error: "No worksheet rows found" }, { status: 400 });
  }
  const parsedProducts = rows.map((row, index) =>
    productFromSheetRow(row, index),
  );
  const products = parsedProducts.filter(isValidSheetProduct);
  const invalidRows = parsedProducts.length - products.length;

  if (!products.length) {
    return Response.json(
      { error: "No valid products found. Name and SKU are required." },
      { status: 400 },
    );
  }

  return Response.json({
    products: products as Product[],
    invalidRows,
    totalRows: rows.length,
  });
}
