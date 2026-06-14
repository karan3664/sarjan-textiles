import Link from "next/link";
import { getCachedCmsSnapshot } from "@/lib/cms-store";
import { resolveStaticCmsPage } from "@/lib/content-localize";
import type { AppLocale } from "@/lib/localized-text";
import { getCacheableStorefrontLocale } from "@/lib/server-locale";
import { translateStorefrontUi } from "@/lib/storefront-ui";
import { isCmsHtmlContent, splitCmsTextParagraphs } from "@/lib/cms-html";
import { CmsHtml } from "@/components/shared/CmsHtml";
import { PageTitle } from "./PageTitle";
import { PageFaqSection } from "./PageFaqSection";

export type AboutSectionKey = "history" | "mission";

const ABOUT_SECTION_LINKS: AboutSectionKey[] = ["history", "mission"];

async function loadAboutCms() {
  const cms = await getCachedCmsSnapshot();
  const locale = getCacheableStorefrontLocale();
  const page = resolveStaticCmsPage(cms.pages.about, locale);
  const about = page as typeof page & {
    history?: string;
    mission?: string;
    vision?: string;
    imageAlt?: string;
    sections?: unknown[];
  };
  return { cms, locale, page, about };
}

function AboutBody({ html }: { html: string }) {
  if (isCmsHtmlContent(html)) {
    return (
      <div className="sarjan-about-body cms-html-content">
        <CmsHtml html={html} />
      </div>
    );
  }
  const paragraphs = splitCmsTextParagraphs(html);
  if (paragraphs.length <= 1) {
    return <p className="sarjan-about-body text-secondary mb_0">{html}</p>;
  }
  return (
    <div className="sarjan-about-body cms-html-content">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-secondary">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function sectionHref(key: AboutSectionKey) {
  return `/about/${key}`;
}

function sectionContent(
  about: Awaited<ReturnType<typeof loadAboutCms>>["about"],
  key: AboutSectionKey,
) {
  if (key === "history") {
    return (
      about.history?.trim() ||
      "Sarjan Textiles history is managed from admin CMS."
    );
  }
  if (key === "mission") {
    return (
      about.mission?.trim() ||
      "Build a clean B2B ordering system for wholesale buyers with reliable catalog, dispatch, inventory, and credit visibility."
    );
  }
  return about.vision?.trim() || "";
}

function AboutSectionNav({
  locale,
  active,
}: {
  locale: AppLocale;
  active?: AboutSectionKey;
}) {
  return (
    <div className="sarjan-about-section-nav">
      {ABOUT_SECTION_LINKS.map((key) => {
        const label = translateStorefrontUi(key, locale);
        const isActive = active === key;
        return (
          <Link
            key={key}
            href={sectionHref(key)}
            className={`sarjan-about-section-btn${isActive ? " sarjan-about-section-btn--active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

export async function AboutMainContent() {
  const { locale, page } = await loadAboutCms();
  const introLabel = translateStorefrontUi("introduction", locale);

  return (
    <section className="flat-spacing about-us-main pb_0 sarjan-about-main">
      <div className="container">
        <div className="sarjan-about-card">
          <div className="sarjan-about-intro-wrap">
            <p className="sarjan-about-intro-label">{introLabel}</p>
            <AboutBody html={page.body ?? ""} />
          </div>
          <div className="sarjan-about-actions">
            <AboutSectionNav locale={locale} />
            <Link href="/contact" className="sarjan-about-contact-btn">
              {translateStorefrontUi("contactTeam", locale)}
            </Link>
          </div>
        </div>
      </div>
      <PageFaqSection page="about" />
    </section>
  );
}

export async function AboutSectionContent({
  section,
}: {
  section: AboutSectionKey;
}) {
  const { locale, page, about } = await loadAboutCms();
  const aboutTitle =
    page.title?.trim() || translateStorefrontUi("aboutOurStore", locale);
  const sectionTitle = translateStorefrontUi(section, locale);

  return (
    <>
      <PageTitle
        title={sectionTitle}
        crumbs={["Home", aboutTitle, sectionTitle]}
      />
      <section className="flat-spacing about-us-main pb_0 sarjan-about-section-page">
        <div className="container">
          <div className="sarjan-about-card">
            <Link href="/about" className="sarjan-about-back link">
              ← {aboutTitle}
            </Link>
            <div className="sarjan-about-intro-wrap">
              <h3 className="title">{sectionTitle}</h3>
              <AboutBody html={sectionContent(about, section)} />
            </div>
            <div className="sarjan-about-actions">
              <AboutSectionNav locale={locale} active={section} />
              <Link href="/contact" className="sarjan-about-contact-btn">
                {translateStorefrontUi("contactTeam", locale)}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
