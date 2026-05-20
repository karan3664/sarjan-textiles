import type { Metadata } from "next";
import { siteSettings } from "@/data/mock";
import type { Product } from "@/data/mock";
import type { CmsBlog, CmsPages, CmsSeoPage } from "@/lib/cms-store";

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

export function productMetadata(product: Product): Metadata {
  const item = product as SeoProduct;
  return pageMetadata({
    title: item.metaTitle || product.name,
    description:
      item.metaDescription ||
      product.description ||
      `${product.name} by ${siteSettings.brandName}. MOQ ${product.moq}.`,
    path: `/products/${product.slug}`,
    image: product.images[0],
    imageAlt: item.imageAlt || product.name,
    keywords: splitKeywords(item.keywords).length
      ? splitKeywords(item.keywords)
      : [
          product.name,
          product.category,
          product.fabric,
          ...product.colors,
          ...product.sizes,
        ],
  });
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
  return pageMetadata({
    title: page.metaTitle || page.label,
    description: page.metaDescription,
    path: page.path,
    image: page.image,
    imageAlt: page.imageAlt,
    keywords: splitKeywords(page.keywords),
    noIndex: page.noIndex,
  });
}

export function seoPageJsonLd(page: CmsSeoPage) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.metaTitle || page.label,
    description: page.metaDescription,
    url: absoluteUrl(page.path),
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: imageUrl(page.image),
      caption: page.imageAlt || page.label,
    },
    publisher: {
      "@type": "Organization",
      name: siteSettings.brandName,
      logo: { "@type": "ImageObject", url: imageUrl(siteSettings.logoIcon) },
    },
  };
}

export function productBreadcrumbJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: absoluteUrl("/products"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.category || "Catalog",
        item: absoluteUrl("/products"),
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.name,
        item: absoluteUrl(`/products/${product.slug}`),
      },
    ],
  };
}

export function productJsonLd(product: Product) {
  const returnPolicyUrl = absoluteUrl("/refund-policy");
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map(imageUrl),
    description: product.description,
    sku: product.sku,
    brand: { "@type": "Brand", name: siteSettings.brandName },
    category: product.category,
    material: product.fabric,
    seller: {
      "@type": "Organization",
      name: siteSettings.brandName,
      url: siteUrl,
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: "INR",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
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
