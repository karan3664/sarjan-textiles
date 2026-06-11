import assert from "node:assert/strict";
import {
  computeCampaignStatus,
  defaultMobileBrandingConfig,
  resolveActiveBrandingCampaign,
} from "../src/lib/mobile-branding-cms";

const stored = defaultMobileBrandingConfig();
assert.ok(stored.campaigns.length >= 10);

const launch = stored.campaigns.find((c) => c.id === "launch-experience");
assert.ok(launch);

const active = resolveActiveBrandingCampaign(
  {
    enabled: true,
    campaigns: [
      {
        ...launch!,
        status: "active",
        enabled: true,
        startAt: "2020-01-01T00:00:00.000Z",
        endAt: "2099-01-01T00:00:00.000Z",
        headline: "SARJAN TEXTILES",
        subheadline: "Premium Textiles",
        line3: undefined,
        ctaLabel: undefined,
      },
    ],
  },
  { now: new Date("2026-06-18T12:00:00.000Z") },
);

assert.equal(active?.animationTemplate, "launch");
assert.equal(
  computeCampaignStatus(
    { ...launch!, status: "active", enabled: true },
    new Date("2030-01-01"),
  ),
  "expired",
);

console.log("mobile-branding: ok");
