import { cookies } from "next/headers";
import type { Product } from "@/data/mock";
import { verifyAdminToken } from "@/lib/admin-token";
import { asStoredProducts } from "@/lib/cms-admin-view";
import { getCmsSnapshotForPatch } from "@/lib/cms-store";
import {
  flattenProductsForAdmin,
  localizeProductsOnSaveFast,
} from "@/lib/product-localize";
import { summarizeProductChanges } from "@/lib/product-bulk-sheet-export";
import {
  matchSheetRowToProduct,
  mergeSheetRowIntoProduct,
  parseProductSheetBuffer,
  stringValue,
} from "@/lib/product-bulk-sheet-server";
import { assertProductPriceValid } from "@/lib/product-pricing";

export const maxDuration = 120;
export const runtime = "nodejs";

const maxBulkBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await verifyAdminToken(
    (await cookies()).get("sarjan-admin-session")?.value,
  );
  if (!session) {
    return Response.json({ error: "Admin login required" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const slugsRaw = formData.get("slugs");

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

  let allowedSlugs: Set<string> | null = null;
  if (typeof slugsRaw === "string" && slugsRaw.trim()) {
    try {
      const parsed = JSON.parse(slugsRaw) as string[];
      if (Array.isArray(parsed) && parsed.length) {
        allowedSlugs = new Set(
          parsed.map((slug) => String(slug).trim()).filter(Boolean),
        );
      }
    } catch {
      return Response.json({ error: "Invalid slugs filter" }, { status: 400 });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = await parseProductSheetBuffer(
    buffer,
    extension as "xlsx" | "csv",
  );
  if (!rows.length) {
    return Response.json({ error: "No worksheet rows found" }, { status: 400 });
  }

  const cms = await getCmsSnapshotForPatch();
  const existing = flattenProductsForAdmin(cms.products);
  const bySlug = new Map(existing.map((product) => [product.slug, product]));
  const byId = new Map(existing.map((product) => [product.id, product]));

  const products: Product[] = [];
  const previews: Array<{
    id: string;
    slug: string;
    name: string;
    sku: string;
    changes: string[];
  }> = [];
  const unmatchedRows: Array<{ row: number; label: string }> = [];
  const skippedRows: Array<{ row: number; label: string }> = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const label =
      stringValue(row, "id") ||
      stringValue(row, "slug") ||
      stringValue(row, "name") ||
      stringValue(row, "sku") ||
      `Row ${rowNumber}`;
    const match = matchSheetRowToProduct(row, bySlug, byId);
    if (!match) {
      unmatchedRows.push({ row: rowNumber, label });
      return;
    }
    if (allowedSlugs && !allowedSlugs.has(match.slug)) {
      skippedRows.push({ row: rowNumber, label: match.id });
      return;
    }
    const merged = mergeSheetRowIntoProduct(match, row);
    const localized = localizeProductsOnSaveFast([merged])[0]!;
    const stored = asStoredProducts([localized])[0]!;
    assertProductPriceValid(stored);
    products.push(flattenProductsForAdmin([localized])[0]!);
    previews.push({
      id: match.id,
      slug: match.slug,
      name: merged.name,
      sku: merged.sku,
      changes: summarizeProductChanges(match, merged),
    });
  });

  if (!products.length) {
    return Response.json(
      {
        error:
          "No matching products found. Use exported id/slug columns — do not change them.",
        unmatchedRows,
        skippedRows,
      },
      { status: 400 },
    );
  }

  return Response.json({
    products,
    previews,
    count: products.length,
    unmatchedRows,
    skippedRows,
    totalRows: rows.length,
  });
}
