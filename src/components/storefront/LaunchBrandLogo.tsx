import { siteSettings } from "@/data/mock";

/** Original Sarjan logo on white background. */
export function LaunchBrandLogo() {
  return (
    <img
      className="sarjan-launch-page__logo"
      src={siteSettings.logo}
      alt={siteSettings.brandName}
      width={168}
      height={168}
    />
  );
}
