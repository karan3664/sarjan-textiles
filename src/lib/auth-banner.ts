import { getCmsSnapshot } from "@/lib/cms-store";
import { defaultAuthBanners } from "@/lib/auth-banner-defaults";

export type {
  AuthBannerAsset,
  AuthBannerSlot,
  AuthBanners,
} from "@/lib/auth-banner-types";

export {
  DEFAULT_AUTH_BANNER_ALT,
  defaultAuthBannerAsset,
  defaultAuthBanners,
} from "@/lib/auth-banner-defaults";

function isNonEmptyUrl(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeAsset(
  input: Partial<import("@/lib/auth-banner-types").AuthBannerAsset> | undefined,
  fallback: import("@/lib/auth-banner-types").AuthBannerAsset,
): import("@/lib/auth-banner-types").AuthBannerAsset {
  if (!input) return fallback;
  const webp = isNonEmptyUrl(input.webp) ? input.webp.trim() : fallback.webp;
  const avif = isNonEmptyUrl(input.avif)
    ? input.avif.trim()
    : isNonEmptyUrl(input.webp)
      ? input.webp.trim()
      : fallback.avif;
  const blurDataURL = isNonEmptyUrl(input.blurDataURL)
    ? input.blurDataURL.trim()
    : fallback.blurDataURL;
  const width =
    typeof input.width === "number" && input.width > 0
      ? input.width
      : fallback.width;
  const height =
    typeof input.height === "number" && input.height > 0
      ? input.height
      : fallback.height;
  const alt = isNonEmptyUrl(input.alt) ? input.alt.trim() : fallback.alt;

  return { webp, avif, blurDataURL, width, height, alt };
}

export function resolveAuthBanners(
  input?: Partial<import("@/lib/auth-banner-types").AuthBanners> | null,
): import("@/lib/auth-banner-types").AuthBanners {
  return {
    login: normalizeAsset(input?.login, defaultAuthBanners.login),
    register: normalizeAsset(input?.register, defaultAuthBanners.register),
    forgot: normalizeAsset(input?.forgot, defaultAuthBanners.forgot),
  };
}

export async function getAuthBannersForStorefront(): Promise<
  import("@/lib/auth-banner-types").AuthBanners
> {
  const cms = await getCmsSnapshot();
  return resolveAuthBanners(cms.siteSettings.authBanners);
}
