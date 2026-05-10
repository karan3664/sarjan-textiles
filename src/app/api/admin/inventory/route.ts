import { randomUUID } from "crypto";
import { getCmsSnapshot, saveCmsSnapshot, type InventoryMovement } from "@/lib/cms-store";
import type { Product } from "@/data/mock";

const operations = ["add", "reduce", "adjust", "transfer", "return", "damage"] as const;

function normalizeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function applyStock(product: Product, operation: InventoryMovement["operation"], quantity: number) {
  const currentStock = normalizeNumber(product.stock);
  const returned = normalizeNumber(product.returned);
  const damaged = normalizeNumber(product.damaged);

  if (operation === "add") return { ...product, stock: currentStock + quantity };
  if (operation === "reduce") return { ...product, stock: Math.max(0, currentStock - quantity) };
  if (operation === "adjust") return { ...product, stock: quantity };
  if (operation === "transfer") return { ...product, stock: Math.max(0, currentStock - quantity) };
  if (operation === "return") return { ...product, stock: currentStock + quantity, returned: returned + quantity };
  return { ...product, stock: Math.max(0, currentStock - quantity), damaged: damaged + quantity };
}

export async function GET() {
  const cms = await getCmsSnapshot();
  return Response.json({ products: cms.products, inventoryLogs: cms.inventoryLogs ?? [] });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const productSlug = String(body.productSlug ?? "");
    const operation = String(body.operation ?? "") as InventoryMovement["operation"];
    const quantity = normalizeNumber(body.quantity);

    if (!productSlug) return Response.json({ error: "Product required" }, { status: 400 });
    if (!operations.includes(operation as (typeof operations)[number])) return Response.json({ error: "Invalid stock operation" }, { status: 400 });
    if (quantity <= 0) return Response.json({ error: "Quantity must be greater than 0" }, { status: 400 });

    const cms = await getCmsSnapshot();
    const product = cms.products.find((item) => item.slug === productSlug);
    if (!product) return Response.json({ error: "Product not found" }, { status: 404 });

    const beforeStock = normalizeNumber(product.stock);
    const nextProduct = applyStock(product, operation, quantity);
    const movement: InventoryMovement = {
      id: randomUUID(),
      productSlug: product.slug,
      productName: product.name,
      sku: product.sku,
      operation,
      quantity,
      beforeStock,
      afterStock: normalizeNumber(nextProduct.stock),
      reference: String(body.reference ?? "").trim() || undefined,
      note: String(body.note ?? "").trim() || undefined,
      createdAt: new Date().toISOString(),
      actor: "Super Admin",
    };

    const products = cms.products.map((item) => (item.slug === product.slug ? nextProduct : item));
    const inventoryLogs = [movement, ...(cms.inventoryLogs ?? [])].slice(0, 500);
    const next = await saveCmsSnapshot({ products, inventoryLogs });

    return Response.json({ products: next.products, inventoryLogs: next.inventoryLogs });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Inventory update failed" }, { status: 400 });
  }
}
