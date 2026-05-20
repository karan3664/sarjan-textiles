import Link from "next/link";
import type { AuthBannerAsset, AuthBannerSlot } from "@/lib/auth-banner-types";
import { AuthBannerImage } from "@/components/storefront/AuthBannerImage";

const COPY: Record<
  AuthBannerSlot,
  {
    eyebrow: string;
    title: string;
    text: string;
    ctaHref: string;
    ctaLabel: string;
  }
> = {
  login: {
    eyebrow: "Welcome back",
    title: "Your wholesale workspace",
    text: "Sign in to view B2B pricing, order history, dispatch updates, and saved addresses.",
    ctaHref: "/register",
    ctaLabel: "New buyer? Register",
  },
  register: {
    eyebrow: "Wholesale textiles",
    title: "Block print, Ajrakh & export-ready apparel",
    text: "Register your GST-verified business for catalog access, set-wise MOQ ordering, and B2B dispatch tracking.",
    ctaHref: "/login",
    ctaLabel: "Already approved? Login",
  },
  forgot: {
    eyebrow: "Account recovery",
    title: "Reset your password",
    text: "Use your registered business email. We will send secure reset instructions if the account exists.",
    ctaHref: "/login",
    ctaLabel: "Back to login",
  },
};

/** Decorative wholesale panel — CMS image (AVIF + WebP + blur), copy per auth mode. */
export function AuthSideVisual({
  mode,
  banner,
}: {
  mode: AuthBannerSlot;
  banner: AuthBannerAsset;
}) {
  const copy = COPY[mode];

  return (
    <div className="sarjan-auth-side-visual">
      <div className="sarjan-auth-side-visual__media">
        <AuthBannerImage banner={banner} />
      </div>
      <div className="sarjan-auth-side-visual__copy">
        <p className="sarjan-auth-side-visual__eyebrow">{copy.eyebrow}</p>
        <h4 className="sarjan-auth-side-visual__title">{copy.title}</h4>
        <p className="sarjan-auth-side-visual__text">{copy.text}</p>
        <Link
          href={copy.ctaHref}
          className="tf-btn btn-white has-border sarjan-auth-banner-cta"
        >
          <span className="text text-button">{copy.ctaLabel}</span>
        </Link>
      </div>
    </div>
  );
}
