import { WishlistDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;

  return (
    <ModaveShell>
      <WishlistDynamic page={Number(page ?? 1)} />
    </ModaveShell>
  );
}
