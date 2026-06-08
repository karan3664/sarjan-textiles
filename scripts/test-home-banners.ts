import assert from "node:assert/strict";
import {
  homeBannersToAppFeed,
  normalizeHomeBanners,
  normalizeSectionBanners,
  syncHomeHeroFromBanners,
} from "../src/lib/home-banners";

const sample = syncHomeHeroFromBanners({
  hero: {
    image: "/uploads/cms/a.webp",
    images: ["/uploads/cms/a.webp", "/uploads/cms/b.webp"],
    eyebrow: "Eyebrow one",
    title: "Title one",
    description: "Desc one",
    primaryCta: { label: "Shop", href: "/products" },
  },
}) as {
  banners?: { id: string; image: string }[];
  hero?: { image?: string; images?: string[] };
};

assert.equal(sample.banners?.length, 2);
assert.equal(sample.hero?.image, "/uploads/cms/a.webp");
assert.equal(sample.hero?.images?.[1], "/uploads/cms/b.webp");

const saved = normalizeHomeBanners({
  banners: [
    {
      id: "b1",
      image: "/uploads/cms/x.webp",
      title: "Custom title",
      enabled: true,
    },
  ],
});

assert.equal(saved.length, 1);
assert.equal(saved[0]?.title, "Custom title");
assert.equal(homeBannersToAppFeed(saved)[0]?.title, "Custom title");

const sectionBanners = normalizeSectionBanners([
  { id: "s1", image: "/a.webp", title: "Section A", enabled: true },
  { id: "s2", image: "", title: "Hidden", enabled: true },
]);
assert.equal(sectionBanners.length, 1);
assert.equal(sectionBanners[0]?.title, "Section A");

console.log("home-banners: ok");
