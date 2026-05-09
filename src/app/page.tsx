import { HomeDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";

export const revalidate = 300;

export default function HomePage() {
  return (
    <ModaveShell>
      <HomeDynamic />
    </ModaveShell>
  );
}
