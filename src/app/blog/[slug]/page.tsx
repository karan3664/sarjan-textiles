import { BlogDetailDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCmsBlogBySlug } from "@/lib/cms-store";
import { resolveBlog } from "@/lib/content-localize";
import { getCacheableStorefrontLocale } from "@/lib/server-locale";
import { articleJsonLd, blogMetadata, JsonLdGraph } from "@/lib/seo";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blogRaw = await getCmsBlogBySlug(slug);
  if (!blogRaw) return {};
  const blog = resolveBlog(blogRaw, getCacheableStorefrontLocale());
  return blogMetadata(blog);
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blogRaw = await getCmsBlogBySlug(slug);
  if (!blogRaw) notFound();
  const blog = resolveBlog(blogRaw, getCacheableStorefrontLocale());

  return (
    <ModaveShell>
      <JsonLdGraph items={[articleJsonLd(blog)]} />
      <BlogDetailDynamic slug={slug} />
    </ModaveShell>
  );
}
