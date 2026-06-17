import type { CatalogFilters } from "@/lib/catalog";

export type CollectionRoute = {
  slug: string;
  title: string;
  description: string;
  filters?: CatalogFilters;
  q?: string;
  keywords?: string[];
};

/** Seed data for CMS `collectionPages` when none are stored yet. */
export const COLLECTION_ROUTES: CollectionRoute[] = [
  {
    slug: "ajrakh",
    title: "Ajrakh Collection",
    description:
      "Indigo resist and Ajrakh-inspired prints for shirts and kurtas.",
    q: "ajrak",
    filters: { category: "men" },
    keywords: ["ajrakh", "ajrak print", "indigo textile"],
  },
  {
    slug: "mashru",
    title: "Mashru Collection",
    description:
      "Silk-cotton mashru blends with a soft sheen for premium retail.",
    q: "mashru",
    filters: { category: "men" },
    keywords: ["mashru", "silk cotton blend", "textile mashru"],
  },
  {
    slug: "block-print",
    title: "Block Print Collection",
    description: "Hand-block and studio block prints across shirts and kurtas.",
    q: "block",
    filters: { category: "men" },
    keywords: ["block print", "bagru", "textile block print"],
  },
  {
    slug: "kaftan-shirts",
    title: "Kaftan Shirt Collection",
    description:
      "Modal Ajrakh kaftan shirts — relaxed free-size silhouettes for women's wholesale.",
    filters: { category: "women" },
    keywords: ["kaftan", "modal kaftan", "women's wear"],
  },
  {
    slug: "cotton-kurtas",
    title: "Cotton Kurta Collection",
    description:
      "Everyday cotton kurtas with dependable MOQs for retail repeat orders.",
    filters: { category: "mens-cotton-kurta" },
    keywords: ["cotton kurta", "men's cotton kurta", "printed kurta"],
  },
  {
    slug: "printed-shirts",
    title: "Printed Shirt Collection",
    description:
      "Cotton printed shirts for smart-casual and festive men's assortments.",
    filters: { category: "mens-shirt" },
    keywords: ["printed shirt", "cotton shirt", "men's shirt"],
  },
  {
    slug: "short-kurtas",
    title: "Short Kurta Collection",
    description: "Shorter-length cotton kurtas for contemporary men's edits.",
    filters: { category: "mens-short-kurta" },
    keywords: ["short kurta", "men's short kurta"],
  },
  {
    slug: "mirror-work-kurtas",
    title: "Mirror Work Kurta Collection",
    description:
      "Embellished mashru kurtas with mirror-work detail for occasion-led buying.",
    filters: { category: "mens-mirror-work-kurta" },
    keywords: ["mirror work", "embellished kurta"],
  },
  {
    slug: "womens-clutch",
    title: "Women's Clutch Collection",
    description:
      "Embroidered clutch bags — assorted designs for boutique add-on sales.",
    filters: { category: "womens-clutch" },
    keywords: ["clutch", "women's clutch", "embroidered bag"],
  },
];
