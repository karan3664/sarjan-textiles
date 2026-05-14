import { AdminProductCreateClient } from "@/components/admin/AdminProductCreateClient";
import { AdminTemplateChrome } from "@/components/admin/AdminTemplateChrome";
import { getCmsSnapshot } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminProductsCreatePage({ searchParams }: { searchParams?: Promise<{ slug?: string }> }) {
  const cms = await getCmsSnapshot();
  const params = await searchParams;
  const editProduct = params?.slug ? cms.products.find((product) => product.slug === params.slug) : undefined;
  const title = editProduct ? "Edit Product" : "Add New Products";

  return (
    <AdminTemplateChrome active="products" title={title}>
      <AdminProductCreateClient initialProducts={cms.products} editProduct={editProduct} categoryMaster={cms.categoryMaster} />
    </AdminTemplateChrome>
  );
}
