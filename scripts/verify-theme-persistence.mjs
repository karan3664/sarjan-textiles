/**
 * Smoke-check theme cookie → SSR html attributes on key routes.
 * Run with dev server: npm run dev  →  node scripts/verify-theme-persistence.mjs
 */
const BASE = process.env.THEME_TEST_BASE ?? "http://localhost:3001";

const ROUTES = ["/", "/products", "/profile", "/admin"];

async function fetchTheme(route, cookie) {
  const res = await fetch(`${BASE}${route}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  const html = await res.text();
  const pref = html.match(/data-theme-pref="([^"]+)"/)?.[1] ?? "missing";
  const theme = html.match(/<html[^>]*data-theme="([^"]+)"/)?.[1] ?? "unset";
  const adminShell = html.includes("sarjan-admin-shell");
  return { route, status: res.status, pref, theme, adminShell };
}

async function main() {
  console.log(`Theme persistence check → ${BASE}\n`);

  for (const route of ROUTES) {
    const light = await fetchTheme(route, "sarjan-theme=light");
    const dark = await fetchTheme(route, "sarjan-theme=dark");
    console.log(
      `${route}\n  light cookie → pref=${light.pref} theme=${light.theme}\n  dark cookie  → pref=${dark.pref} theme=${dark.theme}${light.adminShell || dark.adminShell ? " (admin shell)" : ""}`,
    );
    if (light.pref !== "light" || light.theme !== "light") {
      console.error(`  FAIL: expected light/light on ${route}`);
      process.exitCode = 1;
    }
    if (dark.pref !== "dark" || dark.theme !== "dark") {
      console.error(`  FAIL: expected dark/dark on ${route}`);
      process.exitCode = 1;
    }
  }

  if (!process.exitCode) {
    console.log("\nAll routes honor sarjan-theme cookie on SSR.");
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
