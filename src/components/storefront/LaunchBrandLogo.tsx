import { siteSettings } from "@/data/mock";

/** Original Sarjan logo; black matte in PNG is removed via CSS blend on the dark launch page. */
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
