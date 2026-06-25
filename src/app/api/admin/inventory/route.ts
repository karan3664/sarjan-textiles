import { randomUUID } from "crypto";
import {
  getCmsSnapshot,
  saveCmsSnapshot,
  type InventoryMovement,
} from "@/lib/cms-store";
import { roleCanAccess, verifyAdminToken } from "@/lib/admin-token";
import { getAdminRouteSession } from "@/lib/admin-route-session";
import type { Product } from "@/data/mock";
import { readEnglish } from "@/lib/cms-localize";
import { flattenProductsForAdmin } from "@/lib/product-localize";
import { productInventoryOnHand } from "@/lib/product-availability";
import { cookies } from "next/headers";

const operations = [
  "add",
  "reduce",
  "adjust",
  "transfer",
  "return",
  "damage",
] as const;

function normalizeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function distributeVariantStock(product: Product, totalStock: number): Product {
  const variants = product.variants;
  if (!variants?.length) {
    return { ...product, stock: totalStock };
  }
  const perVariant = Math.floor(totalStock / variants.length);
  const remainder = totalStock % variants.length;
  return {
    ...product,
    stock: totalStock,
    variants: variants.map((variant, index) => ({
      ...variant,
      stock: perVariant + (index < remainder ? 1 : 0),
    })),
  };
}

function applyStock(
  product: Product,
  operation: InventoryMovement["operation"],
  quantity: number,
) {
  const currentStock = normalizeNumber(productInventoryOnHand(product));
  const returned = normalizeNumber(product.returned);
  const damaged = normalizeNumber(product.damaged);
  let nextStock = currentStock;

  if (operation === "add") nextStock = currentStock + quantity;
  else if (operation === "reduce")
    nextStock = Math.max(0, currentStock - quantity);
  else if (operation === "adjust") nextStock = quantity;
  else if (operation === "transfer")
    nextStock = Math.max(0, currentStock - quantity);
  else if (operation === "return") {
    nextStock = currentStock + quantity;
    return distributeVariantStock(
      { ...product, returned: returned + quantity },
      nextStock,
    );
  } else {
    nextStock = Math.max(0, currentStock - quantity);
    return distributeVariantStock(
      { ...product, damaged: damaged + quantity },
      nextStock,
    );
  }

  return distributeVariantStock(product, nextStock);
}

const INVENTORY_API_PATH = "/api/admin/inventory";

export async function GET(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session)
    return Response.json({ error: "Admin login required" }, { status: 401 });
  if (!roleCanAccess(session.role, INVENTORY_API_PATH))
    return Response.json({ error: "Permission denied" }, { status: 403 });

  const cms = await getCmsSnapshot();
  return Response.json({
    products: flattenProductsForAdmin(cms.products),
    inventoryLogs: cms.inventoryLogs ?? [],
  });
}

export async function PATCH(request: Request) {
  try {
    const session = await getAdminRouteSession(request);
    if (!session)
      return Response.json({ error: "Admin login required" }, { status: 401 });
    if (!roleCanAccess(session.role, INVENTORY_API_PATH))
      return Response.json({ error: "Permission denied" }, { status: 403 });
    const body = await request.json();
    const productSlug = String(body.productSlug ?? "");
    const operation = String(
      body.operation ?? "",
    ) as InventoryMovement["operation"];
    const quantity = normalizeNumber(body.quantity);

    if (!productSlug)
      return Response.json({ error: "Product required" }, { status: 400 });
    if (!operations.includes(operation as (typeof operations)[number]))
      return Response.json(
        { error: "Invalid stock operation" },
        { status: 400 },
      );
    if (quantity <= 0)
      return Response.json(
        { error: "Quantity must be greater than 0" },
        { status: 400 },
      );

    const cms = await getCmsSnapshot();
    const product = cms.products.find((item) => item.slug === productSlug);
    if (!product)
      return Response.json({ error: "Product not found" }, { status: 404 });

    const beforeStock = normalizeNumber(productInventoryOnHand(product));
    const nextProduct = applyStock(product, operation, quantity);
    const movement: InventoryMovement = {
      id: randomUUID(),
      productSlug: product.slug,
      productName: readEnglish(product.name),
      sku: product.sku,
      operation,
      quantity,
      beforeStock,
      afterStock: normalizeNumber(productInventoryOnHand(nextProduct)),
      reference: String(body.reference ?? "").trim() || undefined,
      note: String(body.note ?? "").trim() || undefined,
      createdAt: new Date().toISOString(),
      actor: session.email,
    };

    const products = cms.products.map((item) =>
      item.slug === product.slug ? nextProduct : item,
    );
    const inventoryLogs = [movement, ...(cms.inventoryLogs ?? [])].slice(
      0,
      500,
    );
    const next = await saveCmsSnapshot({
      products,
      inventoryLogs,
      auditLogs: [
        {
          id: randomUUID(),
          actor: session.email,
          role: session.role,
          action: "inventory_movement",
          entity: "product",
          entityId: product.slug,
          before: product,
          after: nextProduct,
          note: movement.note || movement.reference,
          createdAt: movement.createdAt,
        },
        ...(cms.auditLogs ?? []),
      ].slice(0, 1000),
    });

    return Response.json({
      products: flattenProductsForAdmin(next.products),
      inventoryLogs: next.inventoryLogs,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Inventory update failed",
      },
      { status: 400 },
    );
  }
}
