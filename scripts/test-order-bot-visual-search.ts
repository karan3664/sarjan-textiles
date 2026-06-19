import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildVisualSearchReply } from "../src/lib/order-bot/visual-search-handler";
import type { BotSession } from "../src/lib/order-bot/session-store";

function session(language: BotSession["language"]): BotSession {
  return {
    id: "s1",
    clientId: "c1",
    clientEmail: "a@b.com",
    language,
    source: "web",
    cart: [],
    lastProducts: [],
    chatHistory: [],
    updatedAt: Date.now(),
  };
}

const analysis = {
  keywords: ["bandhani", "kurta"],
  colors: ["maroon"],
  pattern: "bandhani",
  category: "Kurtas",
  source: "vision" as const,
};

assert.match(buildVisualSearchReply(session("en"), analysis, 3), /bandhani/i);
assert.match(
  buildVisualSearchReply(session("en"), analysis, 3),
  /\*\*3\*\* product\(s\)/,
);
assert.match(
  buildVisualSearchReply(session("hi"), analysis, 0),
  /match nahi mila/i,
);

const clientSource = readFileSync(
  path.join(process.cwd(), "src/lib/order-bot-client.ts"),
  "utf8",
);
assert.match(
  clientSource,
  /import\s*\{[^}]*clientAuthHeaders[^}]*\}\s*from\s*"@\/lib\/client-auth-browser"/,
  "order-bot-client must import clientAuthHeaders for visual search uploads",
);

console.log("test-order-bot-visual-search: ok");
