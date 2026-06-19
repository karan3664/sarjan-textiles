/**
 * Sarjan AI 3.1 — memory engine unit checks.
 * Run: npx tsx scripts/test-ai-memory-engine.ts
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  listAiUserInterests,
  trackAiMemoryEvent,
} from "../src/lib/ai-memory/store";

const clientId = "00000000-0000-4000-8000-000000000099";

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  await mkdir(dataDir, { recursive: true });

  await trackAiMemoryEvent({
    clientId,
    eventType: "search",
    source: "web",
    searchQuery: "bandhani kurta",
  });
  await trackAiMemoryEvent({
    clientId,
    eventType: "product_view",
    source: "web",
    productSlug: "test-kurta",
    category: "Kurtas",
  });
  await trackAiMemoryEvent({
    clientId,
    eventType: "add_to_cart",
    source: "app",
    productSlug: "test-kurta",
    quantity: 25,
  });

  const interests = await listAiUserInterests(clientId, 10);
  assert.ok(interests.length >= 1, "interest rows created");
  assert.equal(interests[0]?.productSlug, "test-kurta");
  assert.ok(interests[0]?.score >= 4);
  assert.ok(interests[0]?.sources.includes("web"));
  assert.ok(interests[0]?.sources.includes("app"));

  const searchInterest = interests.find((row) => row.interestType === "search");
  assert.ok(searchInterest?.searchQuery?.includes("bandhani"));

  console.log("test-ai-memory-engine: PASS");
}

main().catch((error) => {
  console.error("test-ai-memory-engine: FAIL", error);
  process.exit(1);
});
