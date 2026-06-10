import { SearchResultPage } from "@/components/storefront/StaticPages";
import { ModaveShell } from "@/components/storefront/ModaveShell";
export const revalidate = 60;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  return (
    <ModaveShell>
      <SearchResultPage q={params.q ?? ""} page={Number(params.page ?? 1)} />
    </ModaveShell>
  );
}
