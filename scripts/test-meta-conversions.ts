/**
 * Meta Pixel + CAPI helpers — unit checks (no live Graph API call).
 * Run: npx tsx scripts/test-meta-conversions.ts
 */
import assert from "node:assert/strict";
import { metaPixelEnabled } from "../src/lib/meta-conversions";
import {
  metaCapiEnabled,
  sendMetaConversionEvent,
} from "../src/lib/meta-conversions-capi";

async function main() {
  const pixelBefore = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const tokenBefore = process.env.META_CAPI_ACCESS_TOKEN;
  delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  delete process.env.META_CAPI_ACCESS_TOKEN;

  assert.equal(metaPixelEnabled(), false);
  assert.equal(metaCapiEnabled(), false);

  const skipped = await sendMetaConversionEvent({
    eventName: "ViewContent",
    customData: { content_name: "test" },
  });
  assert.equal(skipped.ok, false);
  assert.equal(skipped.skipped, true);

  process.env.NEXT_PUBLIC_META_PIXEL_ID = pixelBefore;
  process.env.META_CAPI_ACCESS_TOKEN = tokenBefore;

  console.log("test-meta-conversions: PASS");
}

main().catch((error) => {
  console.error("test-meta-conversions: FAIL", error);
  process.exit(1);
});
