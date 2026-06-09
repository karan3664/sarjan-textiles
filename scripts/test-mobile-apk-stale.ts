import assert from "node:assert/strict";
import { isCachedApkStale } from "../src/lib/mobile-apk-path";

assert.equal(isCachedApkStale(null, 32), true);
assert.equal(isCachedApkStale(31, 32), true);
assert.equal(isCachedApkStale(32, 32), false);
assert.equal(isCachedApkStale(32, undefined), false);

console.log("mobile-apk stale check: ok");
