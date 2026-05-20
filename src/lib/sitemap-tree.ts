import { siteSettings } from "@/data/mock";
import {
  getCachedCmsSnapshot,
  listActiveCategoryHubPages,
  type CmsSeoPage,
} from "@/lib/cms-store";
import {
  COLLECTION_ROUTES,
  PRODUCT_CATEGORY_ROUTES,
} from "@/lib/product-seo-slug";

export type SitemapTreeNode = {
  id: string;
  label: string;
  path: string;
  priority?: number;
  changeFrequency?: string;
  section?: string;
  children?: SitemapTreeNode[];
};

export type SitemapTreeMeta = {
  generatedAt: string;
  totalUrls: number;
  xmlUrl: string;
};

function node(
  partial: Omit<SitemapTreeNode, "children"> & { children?: SitemapTreeNode[] },
): SitemapTreeNode {
  return { ...partial, children: partial.children ?? [] };
}

function seoNode(page: CmsSeoPage): SitemapTreeNode {
  const priority = page.id === "home" ? 1 : page.id === "products" ? 0.9 : 0.7;
  return node({
    id: `seo-${page.id}`,
    label: page.label,
    path: page.path,
    priority,
    changeFrequency:
      page.id === "products"
        ? "daily"
        : page.id === "home"
          ? "weekly"
          : "monthly",
    section: "main",
  });
}

export async function buildSitemapTree(): Promise<{
  tree: SitemapTreeNode;
  meta: SitemapTreeMeta;
}> {
  const { blogs, products, seoPages, customSitePages } =
    await getCachedCmsSnapshot();
  const categoryHubs = await listActiveCategoryHubPages();

  const indexedSeo = seoPages.filter((page) => !page.noIndex);
  const home = indexedSeo.find((page) => page.id === "home");
  const otherSeo = indexedSeo.filter((page) => page.id !== "home");

  const productCategoryChildren = PRODUCT_CATEGORY_ROUTES.map((route) =>
    node({
      id: `pcat-${route.slug}`,
      label: route.title,
      path: `/products/${route.slug}`,
      priority: 0.85,
      changeFrequency: "daily",
      section: "catalog",
    }),
  );

  const collectionChildren = COLLECTION_ROUTES.map((route) =>
    node({
      id: `coll-${route.slug}`,
      label: route.title,
      path: `/collections/${route.slug}`,
      priority: 0.8,
      changeFrequency: "weekly",
      section: "catalog",
    }),
  );

  const hubChildren = categoryHubs.map((hub) =>
    node({
      id: `hub-${hub.slug}`,
      label: hub.title ?? hub.slug,
      path: `/categories/${hub.slug}`,
      priority: 0.75,
      changeFrequency: "weekly",
      section: "catalog",
    }),
  );

  const productChildren = products.map((product) =>
    node({
      id: `p-${product.slug}`,
      label: product.name,
      path: `/products/${product.slug}`,
      priority: 0.8,
      changeFrequency: "weekly",
      section: "products",
    }),
  );

  const blogChildren = blogs.map((blog) =>
    node({
      id: `b-${blog.slug}`,
      label: blog.title,
      path: `/blog/${String(blog.slug).trim()}`,
      priority: 0.7,
      changeFrequency: "monthly",
      section: "blog",
    }),
  );

  const customChildren = (customSitePages ?? [])
    .filter((page) => page.enabled !== false && page.slug?.trim())
    .map((page) =>
      node({
        id: `custom-${page.slug}`,
        label: page.title ?? page.slug ?? "Page",
        path: `/site/${String(page.slug).trim()}`,
        priority: 0.65,
        changeFrequency: "monthly",
        section: "custom",
      }),
    );

  const catalogBranch = node({
    id: "branch-catalog",
    label: "Catalog SEO hubs",
    path: "/products",
    priority: 0.85,
    section: "group",
    children: [
      node({
        id: "group-pcat",
        label: `Product categories (${productCategoryChildren.length})`,
        path: "/products",
        section: "group",
        children: productCategoryChildren,
      }),
      node({
        id: "group-coll",
        label: `Collections (${collectionChildren.length})`,
        path: "/collections",
        section: "group",
        children: collectionChildren,
      }),
      ...(hubChildren.length
        ? [
            node({
              id: "group-hubs",
              label: `Category hubs (${hubChildren.length})`,
              path: "/categories",
              section: "group",
              children: hubChildren,
            }),
          ]
        : []),
    ],
  });

  const mainPages = otherSeo.map(seoNode);

  const productsBranch = node({
    id: "branch-products",
    label: `Product pages (${productChildren.length})`,
    path: "/products",
    priority: 0.8,
    section: "group",
    children: productChildren,
  });

  const blogBranch = node({
    id: "branch-blog",
    label: `Blog articles (${blogChildren.length})`,
    path: "/blog",
    priority: 0.7,
    section: "group",
    children: blogChildren,
  });

  const customBranch =
    customChildren.length > 0
      ? node({
          id: "branch-custom",
          label: `Custom CMS pages (${customChildren.length})`,
          path: "/site",
          priority: 0.65,
          section: "group",
          children: customChildren,
        })
      : null;

  const children: SitemapTreeNode[] = [
    node({
      id: "branch-main",
      label: "Main pages",
      path: "/",
      section: "group",
      children: mainPages,
    }),
    catalogBranch,
    productsBranch,
    blogBranch,
    ...(customBranch ? [customBranch] : []),
  ];

  const tree = node({
    id: "root",
    label: home?.label ?? "Homepage",
    path: home?.path ?? "/",
    priority: 1,
    changeFrequency: "weekly",
    section: "home",
    children,
  });

  const countNodes = (n: SitemapTreeNode): number =>
    1 + (n.children?.reduce((sum, c) => sum + countNodes(c), 0) ?? 0);

  return {
    tree,
    meta: {
      generatedAt: new Date().toISOString(),
      totalUrls: countNodes(tree),
      xmlUrl: `https://${siteSettings.domain}/sitemap.xml`,
    },
  };
}
