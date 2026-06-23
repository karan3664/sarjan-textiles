import { AuthPageClient } from "@/components/storefront/AuthPageClient";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getAuthBannersForStorefront } from "@/lib/auth-banner";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string; next?: string }>;
}) {
  const params = await searchParams;
  const initialLoginMethod =
    params.method === "password" ? ("password" as const) : ("otp" as const);
  const banners = await getAuthBannersForStorefront();
  return (
    <ModaveShell>
      <AuthPageClient
        mode="login"
        banners={banners}
        initialLoginMethod={initialLoginMethod}
      />
    </ModaveShell>
  );
}
