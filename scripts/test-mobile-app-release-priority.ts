import assert from "node:assert/strict";

/** Mirrors production priority: git manifest beats Coolify env overrides. */
function resolveMobileVersion(input: {
  manifest?: { latestVersion: string; versionCode: number } | null;
  envVersion?: string;
  envCode?: string;
}) {
  const latestVersion =
    input.manifest?.latestVersion || input.envVersion?.trim() || "1.0.28";
  const versionCode = Number(
    input.manifest?.versionCode || input.envCode || "29",
  );
  return { latestVersion, versionCode };
}

assert.deepEqual(
  resolveMobileVersion({
    manifest: { latestVersion: "1.0.28", versionCode: 29 },
    envVersion: "1.0.27",
    envCode: "28",
  }),
  { latestVersion: "1.0.28", versionCode: 29 },
);

assert.deepEqual(
  resolveMobileVersion({
    manifest: null,
    envVersion: "1.0.27",
    envCode: "28",
  }),
  { latestVersion: "1.0.27", versionCode: 28 },
);

console.log("mobile-app-release priority: ok");
