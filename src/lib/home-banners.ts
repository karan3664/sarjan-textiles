export type CmsHomeBanner = {
  id: string;
  image: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  actionType?: "product" | "category" | "url" | "none";
  actionValue?: string;
  enabled?: boolean;
};

type HomeBannerSource = {
  banners?: CmsHomeBanner[];
  hero?: {
    image?: string;
    images?: string[];
    eyebrow?: string;
    title?: string;
    description?: string;
    primaryCta?: { label?: string; href?: string };
  };
};

function readText(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function normalizeHomeBanners(home: HomeBannerSource): CmsHomeBanner[] {
  const saved = (home.banners ?? []).filter(
    (banner) => banner.enabled !== false && banner.image?.trim(),
  );
  if (saved.length) {
    return saved.map((banner, index) => ({
      ...banner,
      id: banner.id || `banner-${index + 1}`,
      enabled: banner.enabled !== false,
    }));
  }

  const hero = home.hero ?? {};
  const images = (
    Array.isArray(hero.images) && hero.images.length
      ? hero.images
      : hero.image
        ? [hero.image]
        : []
  ).filter(Boolean);

  return images.map((image, index) => ({
    id: `banner-${index + 1}`,
    image,
    eyebrow: index === 0 ? readText(hero.eyebrow) : "",
    title: index === 0 ? readText(hero.title) : "",
    description: index === 0 ? readText(hero.description) : "",
    ctaLabel: index === 0 ? readText(hero.primaryCta?.label) : "",
    ctaHref: index === 0 ? readText(hero.primaryCta?.href) : "",
    actionType: "url" as const,
    actionValue: index === 0 ? readText(hero.primaryCta?.href) : "",
    enabled: true,
  }));
}

export function syncHomeHeroFromBanners<T extends HomeBannerSource>(
  home: T,
): T {
  const banners = normalizeHomeBanners(home);
  const images = banners.map((banner) => banner.image).filter(Boolean);
  const first = banners[0];

  return {
    ...home,
    banners,
    hero: {
      ...home.hero,
      images,
      image: images[0] ?? home.hero?.image ?? "",
      eyebrow: first?.eyebrow ?? home.hero?.eyebrow ?? "",
      title: first?.title ?? home.hero?.title ?? "",
      description: first?.description ?? home.hero?.description ?? "",
      primaryCta: {
        label: first?.ctaLabel ?? home.hero?.primaryCta?.label ?? "Explore",
        href: first?.ctaHref ?? home.hero?.primaryCta?.href ?? "#catalog",
      },
    },
  };
}

export function homeBannersToAppFeed(banners: CmsHomeBanner[]) {
  return banners
    .filter((banner) => banner.enabled !== false && banner.image?.trim())
    .map((banner) => ({
      id: banner.id,
      image: banner.image,
      title: banner.title ?? "",
      subtitle: banner.eyebrow ?? "",
      actionType: banner.actionType ?? (banner.ctaHref ? "url" : "none"),
      actionValue: banner.actionValue ?? banner.ctaHref ?? "",
    }));
}

export function imageIndexForSlide(
  slides: Array<{ kind: string }>,
  activeIndex: number,
) {
  let imageIndex = 0;
  for (let index = 0; index <= activeIndex; index += 1) {
    if (slides[index]?.kind === "image") {
      imageIndex += 1;
    }
  }
  return Math.max(0, imageIndex - 1);
}
