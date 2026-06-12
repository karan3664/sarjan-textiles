import {
  isLaunchBypassPath,
  isSiteLaunchPending,
  shouldGateToLaunchPage,
} from "@/lib/site-launch";

describe("site-launch gate", () => {
  const launchAt = "2026-06-17T12:39:00+05:30";
  const beforeLaunch = Date.parse("2026-06-12T10:00:00+05:30");
  const afterLaunch = Date.parse("2026-06-18T10:00:00+05:30");

  beforeEach(() => {
    process.env.SITE_LAUNCH_AT = launchAt;
  });

  afterEach(() => {
    delete process.env.SITE_LAUNCH_AT;
  });

  it("gates storefront but not /launch while pending", () => {
    expect(isSiteLaunchPending(beforeLaunch)).toBe(true);
    expect(shouldGateToLaunchPage("/", beforeLaunch)).toBe(true);
    expect(isLaunchBypassPath("/launch")).toBe(true);
    expect(shouldGateToLaunchPage("/launch", beforeLaunch)).toBe(false);
  });

  it("does not gate after launch time", () => {
    expect(isSiteLaunchPending(afterLaunch)).toBe(false);
    expect(shouldGateToLaunchPage("/", afterLaunch)).toBe(false);
    expect(shouldGateToLaunchPage("/launch", afterLaunch)).toBe(false);
  });
});
