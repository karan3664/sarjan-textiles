import { AuthPageClient } from "@/components/storefront/AuthPageClient";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export default function LoginPage() {
  return (
    <ModaveShell>
      <AuthPageClient mode="login" />
    </ModaveShell>
  );
}
