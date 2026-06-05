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
    keywords: ["ajrakh", "ajrak print", "indigo textile"],
  },
  {
    slug: "mashru",
    title: "Mashru Collection",
    description:
      "Silk-cotton mashru blends with a soft sheen for premium retail.",
    q: "mashru",
    keywords: ["mashru", "silk cotton blend", "textile mashru"],
  },
  {
    slug: "block-print",
    title: "Block Print Collection",
    description: "Hand-block and studio block prints across shirts and kurtas.",
    q: "block",
    keywords: ["block print", "bagru", "textile block print"],
  },
];
