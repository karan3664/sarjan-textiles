/**
 * Point home category cards at the new studio illustrations.
 * Run: npx tsx --env-file=.env.local scripts/patch-home-category-images.ts
 */
import { getCmsSnapshot, saveCmsSnapshot } from "../src/lib/cms-store";
import { readEnglish } from "../src/lib/cms-localize";

const IMAGE_BY_NAME: Record<string, string> = {
  "Printed Shirts": "/sarjan-assets/category-printed-shirts.webp",
  Kurtas: "/sarjan-assets/category-kurtas.webp",
  "Festive Prints": "/sarjan-assets/category-festive-prints.webp",
};

async function main() {
  const cms = await getCmsSnapshot();
  const nextCategories = cms.home.categories.map((category) => {
    const key = readEnglish(category.name);
    const image = IMAGE_BY_NAME[key];
    return image ? { ...category, image } : category;
  });

  const next = await saveCmsSnapshot({
    home: { ...cms.home, categories: nextCategories },
  });

  console.log(
    "Updated category images:",
    next.home.categories.map((c) => ({
      name: readEnglish(c.name),
      image: c.image,
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
