import { AuthPageClient } from "@/components/storefront/AuthPageClient";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export default function RegisterPage() {
  return (
    <ModaveShell>
      <AuthPageClient mode="register" />
    </ModaveShell>
  );
}
