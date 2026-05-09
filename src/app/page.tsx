import { HomeDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <ModaveShell>
      <HomeDynamic />
    </ModaveShell>
  );
}
