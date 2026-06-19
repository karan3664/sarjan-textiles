import assert from "node:assert/strict";
import { analyzeCartShipping } from "../src/lib/ai-sales/cart-optimization.ts";
import type { BotCartLine } from "../src/lib/order-bot/types.ts";

const cart: BotCartLine[] = [
  {
    slug: "test-kurta",
    name: "Test Kurta",
    color: "Blue",
    sizes: ["M", "L", "XL", "XXL"],
    setQuantity: 20,
    lineTotal: 50000,
  },
];

const result = analyzeCartShipping(cart);
assert.ok(result);
assert.equal(result.totalPieces, 80);
assert.equal(result.piecesToAdd, 20);
assert.equal(result.targetPieces, 100);
assert.match(result.message, /20 more piece/);

const empty = analyzeCartShipping([]);
assert.equal(empty, null);

console.log("test-ai-sales: ok");
