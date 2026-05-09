import { AccountDashboardPage } from "@/components/storefront/AccountPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export default function ProfilePage() {
  return (
    <ModaveShell>
      <AccountDashboardPage />
    </ModaveShell>
  );
}
