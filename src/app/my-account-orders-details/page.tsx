import { AccountOrderDetailsPage } from "@/components/storefront/AccountPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export default async function MyAccountOrderDetailsPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const params = await searchParams;
  return <ModaveShell><AccountOrderDetailsPage orderId={params.orderId} /></ModaveShell>;
}
