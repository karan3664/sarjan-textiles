import { BlogDetailDynamic } from "@/components/storefront/ModaveSections";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { getCmsBlogBySlug } from "@/lib/cms-store";
import { blogJsonLd, blogMetadata, JsonLd } from "@/lib/seo";
import { notFound } from "next/navigation";

export const revalidate = 300;

export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await getCmsBlogBySlug(slug);
  if (!blog) return {};
  return blogMetadata(blog);
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await getCmsBlogBySlug(slug);
  if (!blog) notFound();

  return (
    <ModaveShell>
      <JsonLd data={blogJsonLd(blog)} />
      <BlogDetailDynamic slug={slug} />
    </ModaveShell>
  );
}
