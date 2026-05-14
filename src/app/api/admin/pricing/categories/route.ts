import { getCmsSnapshot, saveCategoryMaster, type ProductCategoryMaster } from "@/lib/cms-store";
import { verifyAdminToken } from "@/lib/admin-token";
import { cookies } from "next/headers";

function slugValue(value: string) {
  return value.toLowerCase().trim().replace(/['’]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET() {
  const cms = await getCmsSnapshot();
  return Response.json({ categories: cms.categoryMaster });
}

export async function POST(request: Request) {
  const session = await verifyAdminToken((await cookies()).get("sarjan-admin-session")?.value);
  if (!session) return Response.json({ error: "Admin login required" }, { status: 401 });

  const body = await request.json();
  const rawCategories = Array.isArray(body.categories) ? body.categories : [];
  const categories: ProductCategoryMaster[] = rawCategories
    .map((category: Partial<ProductCategoryMaster> & { level1?: string; level2?: string; level3?: string }) => {
      const path = Array.isArray(category.path)
        ? category.path.map((item) => String(item).trim()).filter(Boolean)
        : [category.level1, category.level2, category.level3].map((item) => String(item ?? "").trim()).filter(Boolean);
      const name = path.join(" > ");
      return {
        id: category.id || slugValue(name),
        name,
        path,
        active: category.active !== false,
        updatedAt: new Date().toISOString(),
      };
    })
    .filter((category: ProductCategoryMaster) => category.path.length);

  const cms = await saveCategoryMaster(categories);
  return Response.json({ categories: cms.categoryMaster });
}
