import Link from "next/link";
import { ModaveShell } from "@/components/storefront/ModaveShell";
import { PageTitle } from "@/components/storefront/PageTitle";
import { listActiveCollectionPages } from "@/lib/cms-store";
import { resolveCollection } from "@/lib/pages-localize";
import { cmsSeoJsonLd, cmsSeoMetadata } from "@/lib/page-seo";
import { sarjanButtonClass } from "@/lib/sarjan-button";
import { localeFromHeaders } from "@/lib/server-locale";
import { JsonLd } from "@/lib/seo";

export async function generateMetadata() {
  return cmsSeoMetadata("collections");
}

export default async function CollectionsPage() {
  const locale = await localeFromHeaders();
  const collections = (await listActiveCollectionPages()).map((page) =>
    resolveCollection(page, locale),
  );
  const jsonLd = await cmsSeoJsonLd("collections");

  return (
    <ModaveShell>
      <JsonLd data={jsonLd} />
      <PageTitle title="Collections" crumbs={["Home", "Collections"]} />
      <section className="flat-spacing-2">
        <div className="container">
          <p className="text-muted mb-4">
            Explore Ajrakh, Mashru, and block-print lines — each collection
            links to a curated wholesale catalog view.
          </p>
          <div className="row g-4">
            {collections.map((collection) => (
              <div className="col-md-4" key={collection.slug}>
                <div className="card h-100">
                  <div className="card-body d-flex flex-column">
                    <h3 className="h5">
                      <Link href={`/collections/${collection.slug}`}>
                        {collection.title}
                      </Link>
                    </h3>
                    <p className="text-muted flex-grow-1">
                      {collection.description}
                    </p>
                    <Link
                      href={`/collections/${collection.slug}`}
                      className={sarjanButtonClass("mt-2 align-self-start")}
                    >
                      <span className="text">View collection</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 mb-0">
            <Link href="/products" className="text-button">
              Browse full product catalog
            </Link>
          </p>
        </div>
      </section>
    </ModaveShell>
  );
}
