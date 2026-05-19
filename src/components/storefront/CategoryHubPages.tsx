import Link from "next/link";
import type { CategoryHubPage } from "@/lib/cms-store";
import { listActiveCategoryHubPages } from "@/lib/cms-store";

export async function CategoryHubIndexContent() {
  const hubs = await listActiveCategoryHubPages();
  if (!hubs.length) {
    return (
      <section className="flat-spacing">
        <div className="container">
          <p className="text-secondary">
            No category landing pages yet. Add them in Admin → Category pages.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flat-spacing sarjan-category-hub-index">
      <div className="container">
        <div className="heading-section text-center mb_40">
          <h1 className="heading">Shop by category</h1>
          <p className="subheading text-secondary">
            Main textile families. Open a hub to see sub-lines and jump into the
            catalog.
          </p>
        </div>
        <div className="tf-grid-layout md-col-3 sm-col-2 sarjan-hub-main-grid">
          {hubs.map((hub) => (
            <Link
              key={hub.id}
              href={`/categories/${hub.slug}`}
              className="sarjan-hub-main-card hover-img wg-blog style-1"
            >
              {hub.heroImage ? (
                <div className="image">
                  <img src={hub.heroImage} alt={hub.title} />
                </div>
              ) : null}
              <div className="content">
                <h5 className="title fw-5">{hub.title}</h5>
                {hub.subtitle ? (
                  <p className="body-text text-secondary mb_0">
                    {hub.subtitle}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function CategoryHubDetailContent({
  hub,
}: {
  hub: CategoryHubPage;
}) {
  const subs = hub.subcategories ?? [];

  return (
    <>
      <section className="flat-spacing pt-0 sarjan-category-hub-hero">
        <div className="container">
          <div className="sarjan-breadcrumb text-caption-1 text-secondary mb_16">
            <Link href="/">Home</Link>
            <span className="mx_8">/</span>
            <Link href="/categories">Categories</Link>
            <span className="mx_8">/</span>
            <span>{hub.title}</span>
          </div>
          <div className="heading-section text-center mb_32">
            <h1 className="heading">{hub.title}</h1>
            {hub.subtitle ? (
              <p className="subheading text-secondary">{hub.subtitle}</p>
            ) : null}
          </div>
          {hub.heroImage ? (
            <div className="sarjan-hub-hero-banner hover-img mb_32">
              <img src={hub.heroImage} alt={hub.title} />
            </div>
          ) : null}
          {hub.intro ? (
            <p className="body-text text-secondary text-center max-w-3xl mx-auto">
              {hub.intro}
            </p>
          ) : null}
        </div>
      </section>

      <section className="flat-spacing pt-0 pb_60">
        <div className="container">
          <div className="heading-section text-center mb_32">
            <h3 className="heading">Explore lines</h3>
          </div>
          {subs.length ? (
            <div className="tf-grid-layout md-col-3 sm-col-2 sarjan-hub-sub-grid">
              {subs.map((sub) => (
                <Link
                  key={sub.id}
                  href={sub.href || "/products"}
                  className="sarjan-hub-subcard hover-img wg-blog style-1"
                >
                  {sub.image ? (
                    <div className="image">
                      <img src={sub.image} alt={sub.title} />
                    </div>
                  ) : null}
                  <div className="content">
                    <h6 className="title fw-5">{sub.title}</h6>
                    {sub.description ? (
                      <p className="body-text text-secondary mb_0">
                        {sub.description}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-secondary text-center">
              No subcategory cards yet. Add tiles in Admin → Category pages.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
