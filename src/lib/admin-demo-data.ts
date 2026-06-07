/** Scaffold clients/orders — only when ALLOW_ADMIN_DEMO_DATA=true (local UI preview). */
export function includeAdminDemoData(): boolean {
  return process.env.ALLOW_ADMIN_DEMO_DATA === "true";
}
