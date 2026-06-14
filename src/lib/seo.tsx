import type { Metadata } from "next";
import { siteSettings } from "@/data/mock";
import type { Product } from "@/data/mock";
import type { CmsBlog, CmsPages, CmsSeoPage } from "@/lib/cms-store";
import { readEnglish } from "@/lib/cms-localize";
import { buildProductImageAlt } from "@/lib/product-image-alt";
import {
  absoluteUrl,
  articleJsonLd,
  blogJsonLd,
  contactPageJsonLd,
  listingBreadcrumbJsonLd,
  organizationJsonLd,
  productBreadcrumbJsonLd,
  productJsonLd,
  productReviewJsonLd,
  seoPageJsonLd,
  siteUrl,
  jsonLdGraph,
  type AggregateRatingInput,
  type ReviewSchemaInput,
} from "@/lib/structured-data";

export {
  absoluteUrl,
  articleJsonLd,
  blogJsonLd,
  collectionPageJsonLd,
  contactPageJsonLd,
  categoryHubDetailJsonLd,
  categoryHubIndexJsonLd,
  faqPageJsonLd,
  globalStructuredDataGraph,
  itemListJsonLd,
  listingBreadcrumbJsonLd,
  localBusinessJsonLd,
  mobileApplicationJsonLd,
  organizationJsonLd,
  productBreadcrumbJsonLd,
  productCatalogItemListJsonLd,
  productJsonLd,
  productReviewJsonLd,
  seoPageJsonLd,
  siteUrl,
  webPageJsonLd,
  websiteJsonLd,
  jsonLdGraph,
  type AggregateRatingInput,
  type ReviewSchemaInput,
} from "@/lib/structured-data";

type SeoInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  imageAlt?: string;
  keywords?: string[];
  type?: "website" | "article";
  noIndex?: boolean;
};

type SeoProduct = Product & {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  imageAlt?: string;
};

type SeoBlog = CmsBlog & {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  imageAlt?: string;
};

type SeoPage = CmsPages[keyof CmsPages] & {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  imageAlt?: string;
};

function imageUrl(image?: string) {
  return absoluteUrl(image || "/sarjan-assets/banner-textiles-studio.webp");
}

export function splitKeywords(value?: string) {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

export function pageMetadata(input: SeoInput): Metadata {
  const url = absoluteUrl(input.path);
  const title = input.title.includes(siteSettings.brandName)
    ? input.title
    : `${input.title} | ${siteSettings.brandName}`;
  const description = input.description || siteSettings.seo.description;
  const image = imageUrl(input.image);

  return {
    title,
    description,
    keywords: input.keywords,
    alternates: { canonical: url },
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: input.type ?? "website",
      title,
      description,
      url,
      siteName: siteSettings.brandName,
      images: [
        { url: image, width: 1200, height: 630, alt: input.imageAlt || title },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function productMetadata(product: Product): Metadata {
  const item = product as SeoProduct;
  const canonical = absoluteUrl(`/products/${product.slug}`);
  const title = (item.metaTitle || product.name).includes(
    siteSettings.brandName,
  )
    ? item.metaTitle || product.name
    : `${item.metaTitle || product.name} | ${siteSettings.brandName}`;
  const description =
    item.metaDescription ||
    product.description ||
    `${product.name} by ${siteSettings.brandName}. MOQ ${product.moq}.`;
  const imageAlt = buildProductImageAlt(product);
  const ogImages = product.images
    .filter(Boolean)
    .slice(0, 4)
    .map((src, index) => ({
      url: imageUrl(src),
      width: 1200,
      height: 630,
      alt: buildProductImageAlt(product, { index }),
    }));

  return {
    title,
    description,
    keywords: splitKeywords(item.keywords).length
      ? splitKeywords(item.keywords)
      : [
          product.name,
          product.category,
          product.fabric,
          ...product.colors,
          ...product.sizes,
        ],
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: siteSettings.brandName,
      images: ogImages.length
        ? ogImages
        : [
            {
              url: imageUrl(product.images[0]),
              width: 1200,
              height: 630,
              alt: imageAlt,
            },
          ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImages[0]?.url ?? imageUrl(product.images[0])],
    },
  };
}

export function blogMetadata(blog: CmsBlog): Metadata {
  const item = blog as SeoBlog;
  return pageMetadata({
    title: item.metaTitle || blog.title,
    description: item.metaDescription || blog.excerpt,
    path: `/blog/${blog.slug}`,
    image: blog.image,
    imageAlt: item.imageAlt || blog.title,
    keywords: splitKeywords(item.keywords),
    type: "article",
  });
}

export function cmsPageMetadata(
  type: keyof CmsPages,
  page: CmsPages[keyof CmsPages],
): Metadata {
  const item = page as SeoPage;
  return pageMetadata({
    title: item.metaTitle || page.title,
    description: item.metaDescription || page.body,
    path: type === "about" ? "/about" : "/contact",
    image: page.image,
    imageAlt: item.imageAlt || page.title,
    keywords: splitKeywords(item.keywords),
  });
}

export function seoPageMetadata(page: CmsSeoPage) {
  const metaTitle = readEnglish(page.metaTitle);
  const label = readEnglish(page.label);
  return pageMetadata({
    title: metaTitle || label,
    description: readEnglish(page.metaDescription),
    path: page.path,
    image: page.image,
    imageAlt: readEnglish(page.imageAlt) || label,
    keywords: splitKeywords(readEnglish(page.keywords)),
    noIndex: page.noIndex,
  });
}

export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Single JSON-LD block with @graph — avoids duplicate entities per page. */
export function JsonLdGraph({ items }: { items: unknown[] }) {
  const graph = jsonLdGraph(items);
  if (!graph) return null;
  return <JsonLd data={graph} />;
}
