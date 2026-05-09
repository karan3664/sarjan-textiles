import { PaymentConfirmationPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export default async function PaymentSuccess({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const params = await searchParams;
  return <ModaveShell><PaymentConfirmationPage orderId={params.orderId} /></ModaveShell>;
}
