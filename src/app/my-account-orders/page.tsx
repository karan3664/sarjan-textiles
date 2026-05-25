import { Suspense } from "react";
import { AccountOrdersPage } from "@/components/storefront/AccountPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export default function MyAccountOrdersPage() {
  return (
    <ModaveShell>
      <Suspense
        fallback={
          <div className="container flat-spacing">
            <p className="text-secondary">Loading orders…</p>
          </div>
        }
      >
        <AccountOrdersPage />
      </Suspense>
    </ModaveShell>
  );
}
