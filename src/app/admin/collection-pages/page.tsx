import { AdminCollectionsClient } from "@/components/admin/AdminCollectionsClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";
import { flattenCollectionForAdmin } from "@/lib/pages-localize";

export const dynamic = "force-dynamic";

export default async function AdminCollectionPages() {
  const cms = await getCmsSnapshot();

  return (
    <AdminTemplateChrome active="collectionPages" title="Collection pages">
      <AdminCollectionsClient
        initialCollections={(cms.collectionPages ?? []).map(
          flattenCollectionForAdmin,
        )}
      />
    </AdminTemplateChrome>
  );
}
