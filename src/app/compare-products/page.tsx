import { ComparePageClient } from "@/components/storefront/ComparePageClient";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export default async function CompareProductsPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const params = await searchParams;
  return <ModaveShell><ComparePageClient initialIds={params.ids ?? ""} /></ModaveShell>;
}
