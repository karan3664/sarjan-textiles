import type { Metadata } from "next";
import { siteSettings } from "@/data/mock";
import type { Product } from "@/data/mock";
import type { CmsBlog, CmsPages, CmsSeoPage } from "@/lib/cms-store";
import { readEnglish } from "@/lib/cms-localize";
import { buildProductImageAlt } from "@/lib/product-image-alt";

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

export const siteUrl = `https://${siteSettings.domain}`;

function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path.startsWith("/") ? path : `/${path}`, siteUrl).toString();
}

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

function categoryListingPath(categoryName: string) {
  const hay = categoryName.toLowerCase();
  if (hay.includes("kurta")) return "/products/kurtas";
  if (hay.includes("shirt")) return "/products/shirts";
  if (hay.includes("jacket")) return "/products/jackets";
  return "/products";
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

export function seoPageJsonLd(page: CmsSeoPage) {
  const metaTitle = readEnglish(page.metaTitle);
  const label = readEnglish(page.label);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metaTitle || label,
    description: readEnglish(page.metaDescription),
    url: absoluteUrl(page.path),
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: imageUrl(page.image),
      caption: readEnglish(page.imageAlt) || label,
    },
    publisher: {
      "@type": "Organization",
      name: siteSettings.brandName,
      logo: { "@type": "ImageObject", url: imageUrl(siteSettings.logoIcon) },
    },
  };
}

export function listingBreadcrumbJsonLd(
  crumbs: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
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

export function productJsonLd(product: Product) {
  const returnPolicyUrl = absoluteUrl("/refund-policy");
  const productUrl = absoluteUrl(`/products/${product.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": productUrl,
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
    brand: { "@type": "Brand", name: siteSettings.brandName },
    manufacturer: {
      "@type": "Organization",
      name: siteSettings.legalName,
      url: siteUrl,
    },
    seller: {
      "@type": "Organization",
      name: siteSettings.brandName,
      url: siteUrl,
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: siteSettings.brandName },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyUrl,
      },
    },
  };
}

export function blogJsonLd(blog: CmsBlog) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description: blog.excerpt,
    image: imageUrl(blog.image),
    datePublished: blog.date,
    author: { "@type": "Organization", name: siteSettings.brandName },
    publisher: {
      "@type": "Organization",
      name: siteSettings.brandName,
      logo: { "@type": "ImageObject", url: imageUrl(siteSettings.logoIcon) },
    },
    mainEntityOfPage: absoluteUrl(`/blog/${blog.slug}`),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteSettings.legalName,
    url: siteUrl,
    logo: imageUrl(siteSettings.logoIcon),
    email: siteSettings.email,
    telephone: siteSettings.phone,
    address: siteSettings.address,
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
