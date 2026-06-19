import assert from "node:assert/strict";
import {
  cmsSanitizedHasBlockContent,
  unwrapSingleInlineParagraph,
} from "../src/lib/cms-html.ts";
import {
  buildWelcomeMessage,
  filterQuickActionsForApproved,
  mapQuickActionToMessage,
  productsCardsIntro,
} from "../src/lib/ai-chat/welcome.ts";
import {
  isClosingDecline,
  normalizeAiLanguage,
  normalizeAiSource,
} from "../src/lib/ai-chat/session-lifecycle.ts";

assert.equal(normalizeAiLanguage("hindi"), "hi");
assert.equal(normalizeAiLanguage("HINGLISH"), "hinglish");
assert.equal(normalizeAiSource("app"), "app");
assert.equal(normalizeAiSource("web"), "web");

const welcome = buildWelcomeMessage("en", "Acme Retail");
assert.match(welcome.text, /Hello Acme Retail/);
assert.match(welcome.text, /Sarjan AI/);
assert.ok(welcome.quickActions.includes("Browse Products"));

assert.equal(mapQuickActionToMessage("Track Orders"), "Track my orders");
assert.equal(mapQuickActionToMessage("Registration"), "Register");
assert.equal(mapQuickActionToMessage("Login"), "Login");
assert.ok(
  filterQuickActionsForApproved(["Browse Products", "Registration"]).includes(
    "Browse Products",
  ),
);
assert.ok(
  !filterQuickActionsForApproved(["Browse Products", "Registration"]).includes(
    "Registration",
  ),
);
assert.match(productsCardsIntro("en", 3), /3/);
assert.match(productsCardsIntro("hi", 2), /product/);

assert.equal(isClosingDecline("no", "en"), true);
assert.equal(isClosingDecline("nahi", "hi"), true);
assert.equal(isClosingDecline("yes", "en"), false);

const singleP = "<p>Hello world</p>";
assert.equal(cmsSanitizedHasBlockContent(singleP), false);
assert.equal(unwrapSingleInlineParagraph(singleP), "Hello world");

console.log("test-ai-chat-store: ok");
