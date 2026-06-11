/**
 * Seed homepage banners + custom pages from "Website content - Sarjan Textiles Copy.docx".
 * Resets local transactional JSON (no clients/orders) — admin login stays in .env.local.
 *
 *   npx tsx scripts/seed-website-content-doc.ts --apply
 */
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { syncHomeHeroFromBanners } from "../src/lib/home-banners";
import {
  normalizeMobileAppConfig,
  syncMobileBannerSectionsFromHome,
} from "../src/lib/mobile-app-cms";
import type { CustomSitePage } from "../src/lib/cms-store";
import type { CmsCustomSection } from "../src/types/cms-custom";
import type { CmsHomeBanner } from "../src/lib/home-banners";
import { syncCustomSitePagesToProfileMenus } from "../src/lib/custom-site-page-mobile";
import { normalizeMobileProfileMenus } from "../src/lib/mobile-profile-menus";

const MAROON = "#7A1F1F";

const BANNER_IMAGES = [
  "/sarjan-assets/banner-textiles-studio.webp",
  "/sarjan-assets/register-wholesale-studio.webp",
  "/sarjan-assets/shirt-ajrak-black-studio.webp",
  "/sarjan-assets/shirt-blue-block-studio.webp",
  "/sarjan-assets/kurta-blue-floral-studio.webp",
  "/sarjan-assets/kurta-red-diamond-studio.webp",
] as const;

function textSection(id: string, body: string): CmsCustomSection {
  return {
    id,
    enabled: true,
    blocks: [{ id: `${id}-text`, type: "text", body }],
  };
}

function imageSection(
  id: string,
  image: string,
  alt: string,
): CmsCustomSection {
  return {
    id,
    enabled: true,
    layout: "banner",
    blocks: [{ id: `${id}-img`, type: "image", image, alt }],
  };
}

function page(
  slug: string,
  title: string,
  heroImage: string,
  heroSubtitle: string,
  sections: CmsCustomSection[],
  showInMobile = true,
): CustomSitePage {
  const now = new Date().toISOString();
  return {
    id: `page-${slug}`,
    slug,
    title,
    heroImage,
    heroSubtitle,
    enabled: true,
    showInMobile,
    metaTitle: `${title} | Sarjan Textiles`,
    metaDescription: heroSubtitle,
    sections,
    updatedAt: now,
  };
}

function buildBanners(): CmsHomeBanner[] {
  return [
    {
      id: "banner-1",
      image: BANNER_IMAGES[0],
      title: "Craft-Based Garment Manufacturers & Wholesalers",
      description:
        "Sarjan Textiles is a wholesale supplier and manufacturer of craft-based apparel, specializing in menswear, contemporary womenswear, and fusion wear. From ready wholesale collections to custom and private label production, we offer complete apparel solutions under one roof.",
      ctaLabel: "Explore More",
      ctaHref: "/craft-heritage-manufacturing",
      actionType: "url",
      actionValue: "/craft-heritage-manufacturing",
      enabled: true,
    },
    {
      id: "banner-2",
      image: BANNER_IMAGES[1],
      title: "A New Generation of Wholesale & Manufacturing Excellence",
      description:
        "With roots in a generational textile business, Sarjan Textiles was created to offer retailers, boutiques, and brands access to thoughtfully developed craft-based apparel through reliable wholesale supply and manufacturing solutions.",
      ctaLabel: "Learn More",
      ctaHref: "/about",
      actionType: "url",
      actionValue: "/about",
      enabled: true,
    },
    {
      id: "banner-3",
      image: BANNER_IMAGES[2],
      title: "Preserving Craft Through Contemporary Apparel",
      description:
        "We work closely with artisans and traditional textile processes to create garments that carry depth, texture, and cultural essence while adapting them for modern wardrobes and retail spaces.",
      ctaLabel: "Essence of Craft",
      ctaHref: "/essence-of-craft",
      actionType: "url",
      actionValue: "/essence-of-craft",
      enabled: true,
    },
    {
      id: "banner-4",
      image: BANNER_IMAGES[3],
      title: "Simplifying Craft-Based Manufacturing",
      description:
        "From sourcing and development to stitching, finishing, and production, we simplify the entire process for brands and retailers — delivering ready garments with consistency, craftsmanship, and scalability.",
      ctaLabel: "Our Manufacturing",
      ctaHref: "/simplifying-craft-manufacturing",
      actionType: "url",
      actionValue: "/simplifying-craft-manufacturing",
      enabled: true,
    },
    {
      id: "banner-5",
      image: BANNER_IMAGES[4],
      title: "Behind Every Garment Is a Human Process",
      description:
        "From artisan-led techniques and fabric preparation to stitching and finishing, our process values detail, patience, and craftsmanship at every stage.",
      ctaLabel: "Our Process",
      ctaHref: "/craft-process-detail",
      actionType: "url",
      actionValue: "/craft-process-detail",
      enabled: true,
    },
    {
      id: "banner-6",
      image: BANNER_IMAGES[5],
      title: "Built for Brands, Retailers & Modern Businesses",
      description:
        "End-to-end manufacturing · Craft expertise · Scalable production · Reliable finishing · Design understanding · Simplified sourcing process",
      ctaLabel: "Why Sarjan",
      ctaHref: "/why-brands-choose-sarjan",
      actionType: "url",
      actionValue: "/why-brands-choose-sarjan",
      enabled: true,
    },
  ];
}

function buildCustomSitePages(): CustomSitePage[] {
  const craftBody =
    "Sarjan Textiles is a craft-based apparel manufacturer and wholesaler serving retailers, boutiques, brands, and distributors across India and beyond.\n\nBuilt on generations of textile understanding, we specialize in wholesale apparel, private label manufacturing, custom product development, and bulk production. Our strength lies in combining traditional craftsmanship with modern production systems to create garments that are authentic, commercially relevant, and scalable.\n\nWhether you are looking for ready wholesale collections or a complete manufacturing partner, we simplify the entire process by bringing sourcing, development, production, and finishing together under one roof.";

  const essenceBody =
    "For us, craft is not simply surface decoration; it is a language of heritage, process, patience, and human touch.\n\nAt Sarjan Textiles, we collaborate with skilled artisans and traditional textile clusters to bring authenticity into contemporary apparel. From handcrafted details and heritage-inspired textiles to artisanal processes and thoughtful finishing, every garment reflects a balance between tradition and modernity.\n\nWe believe that craftsmanship should not disappear within fast-moving fashion cycles. Instead, it should evolve — becoming accessible, wearable, and relevant for today's brands and consumers.\n\nOur work focuses on preserving the soul of traditional crafts while adapting them into garments that feel refined, contemporary, and commercially practical for modern retail.";

  const manufacturingBody =
    "At Sarjan Textiles, we provide an integrated manufacturing ecosystem designed to reduce complexity for brands, retailers, and boutiques.\n\nInstead of managing multiple vendors for fabrics, craft development, stitching, and production, our clients can rely on a single streamlined process handled entirely by our team.\n\nOur capabilities include:\n• Fabric sourcing\n• Craft and textile development\n• Sampling\n• Pattern making\n• Garment manufacturing\n• Finishing and quality control\n• Bulk production\n• Private label manufacturing\n• White label production\n\nWith strong artisan networks and our own garment manufacturing unit, we handle both craftsmanship and scalability — ensuring that every garment maintains quality while meeting commercial production requirements.";

  const processBody =
    "Every garment passes through multiple hands, processes, and layers of refinement before reaching its final form.\n\nAt Sarjan Textiles, we believe the beauty of craft lies not only in the finished garment, but also in the process behind it — the preparation, the imperfections, the textures, and the human involvement at every stage.\n\nOur workflow combines traditional craftsmanship with organized manufacturing systems to create garments that feel thoughtful, refined, and production-ready.\n\nFrom textile sourcing and artisan collaboration to cutting, stitching, finishing, and quality checks, every step is approached with precision and care.";

  const whyBody =
    "We understand that modern brands and retailers require more than just products; they require reliability, understanding, consistency, and ease of execution.\n\nAt Sarjan Textiles, we bridge the gap between traditional craftsmanship and modern production systems, allowing our clients to develop collections without the complexity of managing multiple sourcing and manufacturing partners.\n\nWhat makes us different:\n• Complete end-to-end garment manufacturing\n• Strong network of skilled artisans\n• Understanding of contemporary retail aesthetics\n• Consistent finishing and quality control\n• Flexible private label and white label capabilities\n• Scalable production systems\n• Simplified and hassle-free workflow for clients\n\nOur goal is to make craft-based apparel manufacturing more organized, accessible, and efficient for growing brands and retailers.";

  const partnerBody =
    "We collaborate with brands, retailers, boutiques, and private labels looking for reliable craft-based garment manufacturing solutions.\n\nWhether you need custom development, scalable production, white label manufacturing, or complete end-to-end execution, our team works closely with you to simplify the process and deliver garments ready for market.\n\nFrom sourcing and development to final production, we aim to make apparel manufacturing more seamless, organized, and craft-driven for modern businesses.";

  return [
    page(
      "craft-heritage-manufacturing",
      "Where Craft Heritage Meets Contemporary Manufacturing",
      BANNER_IMAGES[0],
      "",
      [
        textSection("main", craftBody),
        {
          id: "cta",
          enabled: true,
          blocks: [
            {
              id: "contact-btn",
              type: "button",
              label: "Partner With Us",
              href: "/contact",
            },
          ],
        },
      ],
    ),
    page(
      "essence-of-craft",
      "The Essence of Craft in Every Garment",
      BANNER_IMAGES[2],
      "Heritage, process, and human touch in contemporary apparel.",
      [
        imageSection(
          "hero",
          BANNER_IMAGES[2],
          "Craft essence at Sarjan Textiles",
        ),
        textSection("main", essenceBody),
      ],
    ),
    page(
      "simplifying-craft-manufacturing",
      "Simplifying Craft-Based Manufacturing",
      BANNER_IMAGES[3],
      "Integrated manufacturing from sourcing to bulk production.",
      [
        imageSection(
          "hero",
          BANNER_IMAGES[3],
          "Manufacturing at Sarjan Textiles",
        ),
        textSection("main", manufacturingBody),
      ],
    ),
    page(
      "craft-process-detail",
      "A Process Rooted in Detail & Craftsmanship",
      BANNER_IMAGES[4],
      "Thoughtful refinement at every stage of garment making.",
      [
        imageSection(
          "hero",
          BANNER_IMAGES[4],
          "Garment process at Sarjan Textiles",
        ),
        textSection("main", processBody),
      ],
    ),
    page(
      "why-brands-choose-sarjan",
      "Why Brands Choose Sarjan Textiles",
      BANNER_IMAGES[5],
      "Reliability, craft expertise, and scalable production.",
      [
        imageSection(
          "hero",
          BANNER_IMAGES[5],
          "Brands partner with Sarjan Textiles",
        ),
        textSection("main", whyBody),
      ],
    ),
    page(
      "partner-with-sarjan",
      "Partner With Sarjan Textiles",
      BANNER_IMAGES[1],
      "End-to-end craft-based garment manufacturing for modern businesses.",
      [
        imageSection("hero", BANNER_IMAGES[1], "Partner with Sarjan Textiles"),
        textSection("main", partnerBody),
        {
          id: "cta",
          enabled: true,
          blocks: [
            {
              id: "contact-btn",
              type: "button",
              label: "Contact Us",
              href: "/contact",
            },
          ],
        },
      ],
    ),
  ];
}

function L(en: string) {
  return { en, hi: en, gu: en };
}

const LIVE_SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://sarjantextiles.com";

/** Pull published catalog from live so local matches production inventory. */
async function fetchLiveCatalogProducts() {
  const items: unknown[] = [];
  let page = 1;
  let total = Infinity;
  while (items.length < total) {
    const res = await fetch(
      `${LIVE_SITE}/api/catalog/products?limit=100&page=${page}&lang=en`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      console.warn(`Live catalog fetch failed (page ${page}): ${res.status}`);
      break;
    }
    const data = (await res.json()) as { items?: unknown[]; total?: number };
    const batch = Array.isArray(data.items) ? data.items : [];
    if (!batch.length) break;
    items.push(...batch);
    total = Number(data.total ?? items.length);
    page += 1;
    if (page > 20) break;
  }
  return items;
}

async function apply() {
  const root = process.cwd();
  const cmsPath = path.join(root, "data", "cms-db.json");
  const raw = await readFile(cmsPath, "utf8");
  const cms = JSON.parse(raw) as Record<string, unknown>;
  const now = new Date().toISOString();

  const banners = buildBanners();
  const customSitePages = buildCustomSitePages();

  const home = (cms.home ?? {}) as Record<string, unknown>;
  const hero = (home.hero ?? {}) as Record<string, unknown>;

  const syncedHome = syncHomeHeroFromBanners({
    ...(home as object),
    banners,
    hero: {
      ...(hero as object),
      eyebrow: L(""),
      title: L(banners[0]!.title ?? ""),
      description: L(banners[0]!.description ?? ""),
      primaryCta: {
        label: L("Explore More"),
        href: "/craft-heritage-manufacturing",
      },
      secondaryCta: {
        label: L("Partner With Us"),
        href: "/contact",
      },
      image: banners[0]!.image,
      images: banners.map((b) => b.image),
      videoEnabled: false,
      videoUrls: [],
    },
  } as unknown as Parameters<typeof syncHomeHeroFromBanners>[0]);

  const syncedRecord = syncedHome as Record<string, unknown>;
  const sections = Array.isArray(syncedRecord.sections)
    ? [...(syncedRecord.sections as object[])]
    : [];

  const partnerIdx = sections.findIndex(
    (s) => (s as { id?: string }).id === "partner-cta",
  );
  const partnerSection = {
    id: "partner-cta",
    type: "custom",
    enabled: true,
    layout: "banner",
    title: "Let's Build Something Meaningful Together",
    subtitle:
      "Whether you are a retailer, boutique, emerging label, or established brand, we help transform ideas into thoughtfully manufactured garments.",
    blocks: [
      {
        id: "partner-cta-btn",
        type: "button",
        label: "Partner with us",
        href: "/contact",
      },
    ],
  };
  if (partnerIdx >= 0) {
    sections[partnerIdx] = partnerSection;
  } else {
    const testimonialIdx = sections.findIndex(
      (s) => (s as { type?: string }).type === "testimonials",
    );
    if (testimonialIdx >= 0) {
      sections.splice(testimonialIdx, 0, partnerSection);
    } else {
      sections.push(partnerSection);
    }
  }

  syncedRecord.sections = sections;

  const pages = (cms.pages ?? {}) as Record<string, Record<string, string>>;
  pages.about = {
    ...pages.about,
    title: "About Us",
    body: "Built on Generations of Textile Understanding\n\nSarjan Textiles was founded with the vision of bringing traditional textile knowledge into contemporary apparel manufacturing. Though our apparel journey began recently, our connection to textiles and crafts has spanned generations.\n\nOver the years, we observed a gap in the market — brands and retailers often had to coordinate with multiple vendors for fabrics, dyeing, printing, stitching, finishing, and production. The process was fragmented, time-consuming, and inconsistent.\n\nSarjan Textiles was created to simplify this ecosystem.\n\nToday, we work as an integrated craft-based garment manufacturing partner, offering ready stock wholesale collections and everything from sourcing and development to final garment production under one roof.\n\nBy combining skilled artisans, modern manufacturing processes, thoughtful design understanding, and scalable production capabilities, we help brands create collections that feel authentic, refined, and commercially relevant.",
    image: BANNER_IMAGES[1],
    history:
      "Though our apparel journey began recently, our connection to textiles and crafts has spanned generations.",
    mission:
      "Bring traditional textile knowledge into contemporary apparel manufacturing with reliable wholesale and production solutions.",
    vision:
      "Make craft-based apparel manufacturing organized, accessible, and efficient for growing brands and retailers.",
    infrastructure:
      "Integrated sourcing, craft development, sampling, manufacturing, finishing, and bulk production under one roof.",
  };

  const siteSettings = cms.siteSettings as Record<string, unknown>;
  const homeForMobile = syncedRecord as Parameters<
    typeof normalizeMobileAppConfig
  >[2];
  const mobileBase = normalizeMobileAppConfig(
    (cms.mobileApp as Parameters<typeof normalizeMobileAppConfig>[0]) ??
      undefined,
    siteSettings as Parameters<typeof normalizeMobileAppConfig>[1],
    homeForMobile,
  );
  let mobileApp = syncMobileBannerSectionsFromHome(mobileBase, homeForMobile);

  const homeSections = [...mobileApp.homeSections];
  const offerIdx = homeSections.findIndex((s) => s.id === "partner-cta-offer");
  const offerSection = {
    id: "partner-cta-offer",
    type: "offer" as const,
    enabled: true,
    title: L("Let's Build Something Meaningful Together"),
    body: L(
      "Whether you are a retailer, boutique, emerging label, or established brand, we help transform ideas into thoughtfully manufactured garments.",
    ),
    ctaLabel: L("Partner with us"),
    ctaTarget: "/contact",
    backgroundColor: MAROON,
    accentColor: "#FFFFFF",
  };
  if (offerIdx >= 0) {
    homeSections[offerIdx] = { ...homeSections[offerIdx], ...offerSection };
  } else {
    const instaIdx = homeSections.findIndex((s) => s.type === "instagram");
    if (instaIdx >= 0) {
      homeSections.splice(instaIdx, 0, offerSection);
    } else {
      homeSections.push(offerSection);
    }
  }

  mobileApp = {
    ...mobileApp,
    homeHeader: {
      ...mobileApp.homeHeader,
      promoTitle: L(banners[0]!.title ?? ""),
      promoSubtitle: L(banners[0]!.description ?? ""),
      exploreLabel: L("Explore More"),
    },
    homeSections,
    profileMenus: syncCustomSitePagesToProfileMenus(
      customSitePages,
      normalizeMobileProfileMenus(mobileApp.profileMenus),
    ),
  };

  const liveProducts = await fetchLiveCatalogProducts();
  const products =
    liveProducts.length > 0
      ? liveProducts
      : Array.isArray(cms.products)
        ? cms.products
        : [];

  const next = {
    ...cms,
    products,
    productFilters: Array.isArray(cms.productFilters) ? cms.productFilters : [],
    categoryMaster: Array.isArray(cms.categoryMaster) ? cms.categoryMaster : [],
    blogs: Array.isArray(cms.blogs) ? cms.blogs : [],
    testimonials: [],
    clientPricing: [],
    inventoryLogs: [],
    auditLogs: [],
    home: syncedRecord,
    pages,
    customSitePages,
    mobileApp,
    updatedAt: now,
  };

  await writeFile(cmsPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  const dataDir = path.join(root, "data");
  await mkdir(dataDir, { recursive: true });
  await writeFile(
    path.join(dataDir, "local-db.json"),
    `${JSON.stringify(
      {
        clients: [],
        orders: [],
        carts: {},
        resetRequests: [],
        feedbacks: [],
      },
      null,
      2,
    )}\n`,
  );

  for (const file of [
    "blog-comments.json",
    "admin-profile-overrides.json",
    "admin-notifications-state.json",
    "client-notifications.json",
    "newsletter-subscribers.json",
    "product-reviews.json",
    "review-helpful-votes.json",
  ]) {
    try {
      await rm(path.join(dataDir, file));
    } catch {
      // optional
    }
  }

  try {
    await rm(path.join(dataDir, "backups"), { recursive: true, force: true });
  } catch {
    // optional
  }

  const uploadsDir = path.join(root, "public", "uploads", "cms");
  await mkdir(uploadsDir, { recursive: true });
  try {
    const entries = await import("fs/promises").then((fs) =>
      fs.readdir(uploadsDir),
    );
    for (const entry of entries) {
      if (entry === ".gitkeep") continue;
      await rm(path.join(uploadsDir, entry), { recursive: true, force: true });
    }
  } catch {
    // no uploads
  }

  console.log("Applied website content seed:");
  console.log(`  - ${banners.length} homepage banners (sarjan-assets images)`);
  console.log(
    `  - ${customSitePages.length} custom site pages (mobile-enabled + profile menu)`,
  );
  console.log(
    `  - ${products.length} catalog products (from live when available)`,
  );
  console.log("  - partner CTA band (web + mobile)");
  console.log("  - about page updated");
  console.log("  - clients/orders/carts cleared (admin login unchanged)");
}

const args = new Set(process.argv.slice(2));
if (args.has("--apply")) {
  apply().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  console.log(
    "Run with --apply to update data/cms-db.json and reset local JSON.",
  );
}
