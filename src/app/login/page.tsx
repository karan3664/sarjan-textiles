import { AuthPageClient } from "@/components/storefront/AuthPageClient";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getAuthBannersForStorefront } from "@/lib/auth-banner";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const banners = await getAuthBannersForStorefront();
  return (
    <ModaveShell>
      <AuthPageClient mode="login" banners={banners} />
    </ModaveShell>
  );
}
