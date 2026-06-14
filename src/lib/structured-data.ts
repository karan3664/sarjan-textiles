import { siteSettings as defaultSiteSettings } from "@/data/mock";
import type { Product } from "@/data/mock";
import type { CmsBlog, CmsSeoPage } from "@/lib/cms-store";
import type { CategoryHubPage } from "@/lib/cms-store";
import { buildProductImageAlt } from "@/lib/product-image-alt";
import { readEnglish } from "@/lib/cms-localize";
import type { MobileAppRelease } from "@/lib/mobile-app-release";

export type StructuredDataSiteSettings = Pick<
  typeof defaultSiteSettings,
  | "brandName"
  | "legalName"
  | "domain"
  | "logoIcon"
  | "email"
  | "phone"
  | "address"
  | "directionsUrl"
  | "openTimeWeekday"
  | "openTimeSunday"
  | "facebookUrl"
  | "instagramUrl"
  | "linkedinUrl"
  | "ordersEmail"
>;

export type ReviewSchemaInput = {
  author: string;
  rating: number;
  title: string;
  body: string;
  datePublished: string;
};

export type AggregateRatingInput = {
  ratingValue: number;
  reviewCount: number;
};

const SCHEMA_CONTEXT = "https://schema.org";

export const siteUrl = `https://${defaultSiteSettings.domain}`;

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path.startsWith("/") ? path : `/${path}`, siteUrl).toString();
}

function imageUrl(image?: string) {
  return absoluteUrl(image || "/sarjan-assets/banner-textiles-studio.webp");
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefined(item))
      .filter((item) => item !== undefined) as T;
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) continue;
      next[key] = stripUndefined(entry);
    }
    return next as T;
  }
  return value;
}

function socialProfiles(settings: StructuredDataSiteSettings) {
  return [
    settings.facebookUrl,
    settings.instagramUrl,
    settings.linkedinUrl,
  ].filter(Boolean);
}

function postalAddress(settings: StructuredDataSiteSettings) {
  const pinMatch = settings.address.match(/\b(\d{6})\b/);
  return {
    "@type": "PostalAddress",
    streetAddress:
      settings.address
        .replace(/^Sarjan Textiles,\s*/i, "")
        .replace(/,?\s*Gujarat\s+\d{6}$/i, "")
        .trim() || settings.address,
    addressLocality: "Bhuj",
    addressRegion: "Gujarat",
    postalCode: pinMatch?.[1] ?? "370001",
    addressCountry: "IN",
  };
}

function organizationEntity(
  settings: StructuredDataSiteSettings = defaultSiteSettings,
) {
  return {
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: settings.legalName,
    alternateName: settings.brandName,
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: imageUrl(settings.logoIcon),
      caption: `${settings.brandName} logo`,
    },
    image: imageUrl(settings.logoIcon),
    email: settings.email,
    telephone: settings.phone,
    address: postalAddress(settings),
    sameAs: socialProfiles(settings),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: settings.email,
        telephone: settings.phone,
        areaServed: "IN",
        availableLanguage: ["en", "hi", "gu"],
      },
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: settings.ordersEmail || settings.email,
        telephone: settings.phone,
        areaServed: "IN",
      },
    ],
  };
}

export function organizationJsonLd(
  settings: StructuredDataSiteSettings = defaultSiteSettings,
) {
  return stripUndefined({
    "@context": SCHEMA_CONTEXT,
    ...organizationEntity(settings),
  });
}

export function localBusinessJsonLd(
  settings: StructuredDataSiteSettings = defaultSiteSettings,
) {
  return stripUndefined({
    "@context": SCHEMA_CONTEXT,
    "@type": "ClothingStore",
    "@id": `${siteUrl}/#localbusiness`,
    name: settings.brandName,
    legalName: settings.legalName,
    url: siteUrl,
    image: imageUrl(settings.logoIcon),
    logo: imageUrl(settings.logoIcon),
    email: settings.email,
    telephone: settings.phone,
    address: postalAddress(settings),
    hasMap: settings.directionsUrl || undefined,
    sameAs: socialProfiles(settings),
    parentOrganization: { "@id": `${siteUrl}/#organization` },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "10:00",
        closes: "19:00",
      },
    ],
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, Credit Card, Bank Transfer",
  });
}

export function websiteJsonLd(
  settings: StructuredDataSiteSettings = defaultSiteSettings,
) {
  return stripUndefined({
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: settings.brandName,
    alternateName: settings.legalName,
    url: siteUrl,
    description: defaultSiteSettings.seo.description,
    publisher: { "@id": `${siteUrl}/#organization` },
    inLanguage: ["en", "hi", "gu"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search-result?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });
}

/** Organization + LocalBusiness + WebSite — once per storefront page via ModaveShell. */
export function globalStructuredDataGraph(
  settings: StructuredDataSiteSettings = defaultSiteSettings,
) {
  const org = organizationEntity(settings);
  const local = localBusinessJsonLd(settings);
  const site = websiteJsonLd(settings);
  return [
    org,
    { ...local, "@context": undefined },
    { ...site, "@context": undefined },
  ].map((node) => stripUndefined(node));
}

export function webPageJsonLd(input: {
  name: string;
  description?: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "WebPage" | "ContactPage" | "CollectionPage" | "AboutPage";
}) {
  return stripUndefined({
    "@context": SCHEMA_CONTEXT,
    "@type": input.type ?? "WebPage",
    "@id": `${absoluteUrl(input.path)}#webpage`,
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: { "@id": `${siteUrl}/#organization` },
    primaryImageOfPage: input.image
      ? {
          "@type": "ImageObject",
          url: imageUrl(input.image),
          caption: input.imageAlt || input.name,
        }
      : undefined,
    publisher: { "@id": `${siteUrl}/#organization` },
  });
}

export function seoPageJsonLd(page: CmsSeoPage) {
  const metaTitle =
    readEnglish(page.metaTitle) || readEnglish(page.label) || "";
  const label = readEnglish(page.label) || metaTitle;
  const description = readEnglish(page.metaDescription);
  const pageType =
    page.id === "contact"
      ? "ContactPage"
      : page.id === "collections"
        ? "CollectionPage"
        : "WebPage";

  return webPageJsonLd({
    name: metaTitle || label,
    description,
    path: page.path,
    image: page.image,
    imageAlt: readEnglish(page.imageAlt) || label,
    type: pageType,
  });
}

export function contactPageJsonLd(
  settings: StructuredDataSiteSettings = defaultSiteSettings,
) {
  return stripUndefined({
    ...webPageJsonLd({
      name: `Contact ${settings.brandName}`,
      description: `Reach ${settings.brandName} for wholesale textile inquiries, orders, and support.`,
      path: "/contact",
      type: "ContactPage",
    }),
    mainEntity: {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
    },
  });
}

export function collectionPageJsonLd(input: {
  name: string;
  description?: string;
  path: string;
  image?: string;
}) {
  return webPageJsonLd({
    name: input.name,
    description: input.description,
    path: input.path,
    image: input.image,
    type: "CollectionPage",
  });
}

export function listingBreadcrumbJsonLd(
  crumbs: Array<{ name: string; path: string }>,
) {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

function categoryListingPath(categoryName: string) {
  const hay = categoryName.toLowerCase();
  if (hay.includes("kurta")) return "/products/kurtas";
  if (hay.includes("shirt")) return "/products/shirts";
  if (hay.includes("jacket")) return "/products/jackets";
  return "/products";
}

export function productBreadcrumbJsonLd(product: Product) {
  const categoryName = product.category || "Catalog";
  return listingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Products", path: "/products" },
    { name: categoryName, path: categoryListingPath(categoryName) },
    { name: product.name, path: `/products/${product.slug}` },
  ]);
}

export function itemListJsonLd(input: {
  name: string;
  path: string;
  items: Array<{
    name: string;
    path: string;
    description?: string;
    image?: string;
  }>;
}) {
  return stripUndefined({
    "@context": SCHEMA_CONTEXT,
    "@type": "ItemList",
    name: input.name,
    url: absoluteUrl(input.path),
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
      item: stripUndefined({
        "@type": "CollectionPage",
        name: item.name,
        description: item.description,
        url: absoluteUrl(item.path),
        image: item.image ? imageUrl(item.image) : undefined,
      }),
    })),
  });
}

/** ItemList of Product nodes for catalog/category listing pages. */
export function productCatalogItemListJsonLd(input: {
  name: string;
  path: string;
  products: Array<
    Pick<Product, "name" | "slug" | "images" | "description" | "price">
  >;
}) {
  return stripUndefined({
    "@context": SCHEMA_CONTEXT,
    "@type": "ItemList",
    name: input.name,
    url: absoluteUrl(input.path),
    numberOfItems: input.products.length,
    itemListElement: input.products.map((product, index) => {
      const productUrl = absoluteUrl(`/products/${product.slug}`);
      return {
        "@type": "ListItem",
        position: index + 1,
        url: productUrl,
        item: stripUndefined({
          "@type": "Product",
          name: product.name,
          url: productUrl,
          description: product.description,
          image: product.images?.[0] ? imageUrl(product.images[0]) : undefined,
          offers: product.price
            ? {
                "@type": "Offer",
                price: product.price,
                priceCurrency: "INR",
                url: productUrl,
              }
            : undefined,
        }),
      };
    }),
  });
}

export function categoryHubIndexJsonLd(
  hubs: Array<
    Pick<CategoryHubPage, "title" | "slug" | "subtitle" | "heroImage">
  >,
) {
  const collection = collectionPageJsonLd({
    name: "Shop by category",
    description:
      "Browse Sarjan Textiles main category hubs for wholesale kurta, shirt, and textile collections.",
    path: "/categories",
    image: "/sarjan-assets/banner-textiles-studio.webp",
  });
  const list = itemListJsonLd({
    name: "Sarjan Textiles categories",
    path: "/categories",
    items: hubs.map((hub) => ({
      name: hub.title,
      path: `/categories/${hub.slug}`,
      description: hub.subtitle,
      image: hub.heroImage,
    })),
  });
  return [collection, list];
}

export function categoryHubDetailJsonLd(hub: CategoryHubPage) {
  const collection = collectionPageJsonLd({
    name: hub.title,
    description: hub.intro || hub.subtitle,
    path: `/categories/${hub.slug}`,
    image: hub.heroImage,
  });
  const crumbs = listingBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Categories", path: "/categories" },
    { name: hub.title, path: `/categories/${hub.slug}` },
  ]);
  const subs = hub.subcategories ?? [];
  if (!subs.length) return [collection, crumbs];
  const list = itemListJsonLd({
    name: `${hub.title} subcategories`,
    path: `/categories/${hub.slug}`,
    items: subs.map((sub) => ({
      name: sub.title,
      path: sub.href || `/products?category=${encodeURIComponent(sub.title)}`,
      description: sub.description,
      image: sub.image,
    })),
  });
  return [collection, crumbs, list];
}

export function faqPageJsonLd(items: Array<[string, string]>) {
  return stripUndefined({
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    "@id": `${siteUrl}/faqs#faq`,
    mainEntity: items.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  });
}

export function articleJsonLd(blog: CmsBlog) {
  const articleUrl = absoluteUrl(`/blog/${blog.slug}`);
  return stripUndefined({
    "@context": SCHEMA_CONTEXT,
    "@type": "Article",
    "@id": `${articleUrl}#article`,
    headline: blog.title,
    description: blog.excerpt,
    image: [imageUrl(blog.image)],
    datePublished: blog.date,
    dateModified: blog.date,
    author: {
      "@type": "Organization",
      name: defaultSiteSettings.brandName,
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: defaultSiteSettings.brandName,
      logo: {
        "@type": "ImageObject",
        url: imageUrl(defaultSiteSettings.logoIcon),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    isPartOf: { "@id": `${siteUrl}/#website` },
    inLanguage: "en",
  });
}

export function mobileApplicationJsonLd(release: MobileAppRelease) {
  return stripUndefined({
    "@context": SCHEMA_CONTEXT,
    "@type": "MobileApplication",
    "@id": `${siteUrl}/download#mobileapp`,
    name: `${defaultSiteSettings.brandName} App`,
    operatingSystem: "Android",
    applicationCategory: "BusinessApplication",
    description:
      "Wholesale B2B textile ordering app for Sarjan Textiles clients — catalog, cart, orders, and tracking.",
    url: release.downloadPageUrl,
    downloadUrl: release.apkUrl,
    softwareVersion: release.latestVersion,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: `${SCHEMA_CONTEXT}/InStock`,
    },
    publisher: { "@id": `${siteUrl}/#organization` },
    screenshot: imageUrl("/sarjan-assets/banner-textiles-studio.webp"),
  });
}

export function productJsonLd(
  product: Product,
  reviews?: ReviewSchemaInput[],
  aggregate?: AggregateRatingInput,
) {
  const returnPolicyUrl = absoluteUrl("/refund-policy");
  const productUrl = absoluteUrl(`/products/${product.slug}`);
  const ratingFromReviews =
    aggregate?.reviewCount && aggregate.reviewCount > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: aggregate.ratingValue,
          reviewCount: aggregate.reviewCount,
          bestRating: 5,
          worstRating: 1,
        }
      : product.ratingCount && product.rating
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.ratingCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined;

  const reviewNodes =
    reviews && reviews.length
      ? reviews.map((review) => ({
          "@type": "Review",
          author: { "@type": "Person", name: review.author },
          datePublished: review.datePublished,
          name: review.title,
          reviewBody: review.body,
          reviewRating: {
            "@type": "Rating",
            ratingValue: review.rating,
            bestRating: 5,
            worstRating: 1,
          },
        }))
      : undefined;

  return stripUndefined({
    "@context": SCHEMA_CONTEXT,
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    url: productUrl,
    description: product.description,
    sku: product.sku,
    category: product.category,
    material: product.fabric,
    color: product.colors?.length ? product.colors : undefined,
    image: product.images.filter(Boolean).map((src, index) => ({
      "@type": "ImageObject",
      url: imageUrl(src),
      caption: buildProductImageAlt(product, { index }),
    })),
    brand: { "@type": "Brand", name: defaultSiteSettings.brandName },
    manufacturer: {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: product.price,
      availability:
        product.stock > 0
          ? `${SCHEMA_CONTEXT}/InStock`
          : `${SCHEMA_CONTEXT}/OutOfStock`,
      seller: { "@id": `${siteUrl}/#organization` },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyUrl,
      },
    },
    aggregateRating: ratingFromReviews,
    review: reviewNodes,
  });
}

/** @deprecated Use productJsonLd with reviews — kept for import compatibility. */
export function productReviewJsonLd(
  product: Product,
  reviews: ReviewSchemaInput[],
  aggregate?: AggregateRatingInput,
) {
  if (!aggregate?.reviewCount) return null;
  const node = productJsonLd(product, reviews, aggregate);
  return { ...node, "@context": SCHEMA_CONTEXT };
}

export function blogJsonLd(blog: CmsBlog) {
  return articleJsonLd(blog);
}

export function jsonLdGraph(items: unknown[]) {
  const graph = items
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .filter(Boolean)
    .map((item) => {
      if (item && typeof item === "object" && "@context" in item) {
        const { ["@context"]: _context, ...rest } = item as Record<
          string,
          unknown
        >;
        return stripUndefined(rest);
      }
      return stripUndefined(item);
    });
  if (!graph.length) return null;
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": graph,
  };
}
