import assert from "node:assert/strict";
import {
  formatPageContextForPrompt,
  mergePageContext,
  normalizePageContext,
  pageKindFromPath,
  tryAnswerFromPageContext,
} from "../src/lib/ai-chat/page-context";

function run() {
  assert.equal(pageKindFromPath("/"), "home");
  assert.equal(pageKindFromPath("/products/foo-bar"), "product");
  assert.equal(pageKindFromPath("/cart"), "cart");
  assert.equal(pageKindFromPath("/wishlist"), "wishlist");

  const productCtx = normalizePageContext({
    kind: "product",
    product: {
      id: "foo-bar",
      name: "Test Kurta",
      category: "Kurtas",
      setPrice: 1200,
      moq: 25,
      inStock: true,
    },
  });
  assert.ok(productCtx?.product?.name === "Test Kurta");

  const prompt = formatPageContextForPrompt(productCtx!);
  assert.match(prompt, /Test Kurta/);
  assert.match(prompt, /MOQ/);

  const answer = tryAnswerFromPageContext(
    productCtx!,
    "what is the moq for this product?",
  );
  assert.ok(answer?.includes("25"));

  const merged = mergePageContext(
    { kind: "product", path: "/products/x" },
    { product: { id: "x", name: "Merged" } },
  );
  assert.equal(merged?.kind, "product");
  assert.equal(merged?.product?.name, "Merged");

  console.log("test-ai-page-context: ok");
}

run();
