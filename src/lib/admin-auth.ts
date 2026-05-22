import { configuredAdmins, type ConfiguredAdmin } from "@/lib/admin-token";
import { mergedConfiguredAdmins } from "@/lib/admin-profile-override";
import { isPlausiblePasswordHash, verifyPassword } from "@/lib/local-db";

function passwordMatches(admin: ConfiguredAdmin, password: string) {
  const hash = admin.passwordHash?.trim();
  if (hash && isPlausiblePasswordHash(hash)) {
    return verifyPassword(password, hash);
  }
  return admin.password === password;
}

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<ConfiguredAdmin | null> {
  const normalized = email.trim().toLowerCase();
  const pass = password.trim();
  if (!normalized || !pass) return null;

  const admins = await mergedConfiguredAdmins(configuredAdmins());
  return (
    admins.find(
      (item) =>
        item.email.toLowerCase() === normalized && passwordMatches(item, pass),
    ) ?? null
  );
}
