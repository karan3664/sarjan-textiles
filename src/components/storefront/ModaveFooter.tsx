import Link from "next/link";
import { footerInformationLinks, siteSettings } from "@/data/mock";
import { normalizeBrandLogo } from "@/data/site";
import { getLocalizedCmsSnapshot } from "@/lib/cms-locale-sync";
import { localeFromHeaders } from "@/lib/server-locale";
import {
  translateStorefrontNav,
  translateStorefrontUi,
} from "@/lib/storefront-ui";
import { FooterNewsletterForm } from "./FooterNewsletterForm";

export async function ModaveFooter() {
  const locale = await localeFromHeaders();
  const cms = await getLocalizedCmsSnapshot();
  const settings = {
    ...siteSettings,
    ...cms.siteSettings,
    logo: normalizeBrandLogo(cms.siteSettings.logo ?? siteSettings.logo),
  };
  const directionsHref =
    settings.directionsUrl?.trim() ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`;
  return (
    <footer id="footer" className="footer bg-main sarjan-footer">
      <div className="footer-wrap">
        <div className="footer-body">
          <div className="container">
            <div className="row g-4 g-lg-3 align-items-start sarjan-footer-top">
              <div className="col-12 col-lg-2">
                <div className="footer-infor">
                  <div className="footer-logo">
                    <Link href="/">
                      <img src={settings.logo} alt={settings.brandName} />
                    </Link>
                  </div>
                  <div className="footer-address">
                    <p>{settings.address}</p>
                    <a
                      href={directionsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tf-btn-default style-white fw-6"
                    >
                      {translateStorefrontUi("getDirection", locale)}
                      <i className="icon-arrowUpRight" />
                    </a>
                  </div>
                  <ul className="footer-info">
                    <li>
                      <i className="icon-mail" />
                      <p>{settings.ordersEmail}</p>
                    </li>
                    <li>
                      <i className="icon-phone" />
                      <p>
                        <a
                          href={`tel:${settings.phone.replace(/\s/g, "")}`}
                          className="sarjan-footer-phone"
                        >
                          {settings.phone}
                        </a>
                      </p>
                    </li>
                  </ul>
                  <ul className="tf-social-icon style-white">
                    <li>
                      <a
                        href={settings.facebookUrl ?? "#"}
                        className="social-facebook"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className="icon icon-fb" />
                      </a>
                    </li>
                    <li>
                      <a
                        href={settings.instagramUrl ?? "#"}
                        className="social-instagram"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className="icon icon-instagram" />
                      </a>
                    </li>
                    <li>
                      <a
                        href={settings.linkedinUrl ?? "#"}
                        className="social-linkedin"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="LinkedIn"
                      >
                        <img
                          src="/sarjan-assets/email-icon-linkedin.svg"
                          alt=""
                          width={18}
                          height={18}
                          className="sarjan-footer-linkedin-icon"
                        />
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="col-12 col-lg-3">
                <div className="footer-menu footer-menu-sarjan-split">
                  <div className="footer-col-block sarjan-footer-info-block">
                    <div className="footer-heading text-button footer-heading-mobile">
                      {settings.footerInfoHeading ??
                        translateStorefrontUi("information", locale)}
                    </div>
                    <div className="tf-collapse-content">
                      <ul className="footer-menu-list">
                        {footerInformationLinks.map((item) => (
                          <li className="text-caption-1" key={item.href}>
                            <Link href={item.href} className="footer-menu_item">
                              {translateStorefrontNav(item.label, locale)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-2">
                <div className="footer-menu footer-menu-sarjan-split">
                  <div className="footer-col-block">
                    <div className="footer-heading text-button footer-heading-mobile">
                      {translateStorefrontUi("policies", locale)}
                    </div>
                    <div className="tf-collapse-content">
                      <ul className="footer-menu-list">
                        <li className="text-caption-1">
                          <Link
                            href="/privacy-policy"
                            className="footer-menu_item"
                          >
                            {translateStorefrontUi("privacyPolicy", locale)}
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link
                            href="/term-of-use"
                            className="footer-menu_item"
                          >
                            {translateStorefrontUi("termsOfUse", locale)}
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link
                            href="/refund-policy"
                            className="footer-menu_item"
                          >
                            {translateStorefrontUi("refundPolicy", locale)}
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link
                            href="/shipping-policy"
                            className="footer-menu_item"
                          >
                            {translateStorefrontUi("shippingPolicy", locale)}
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link href="/site-map" className="footer-menu_item">
                            {translateStorefrontUi("siteMap", locale)}
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-2">
                <div className="footer-menu footer-menu-sarjan-split">
                  <div className="footer-col-block">
                    <div className="footer-heading text-button footer-heading-mobile">
                      {settings.footerCustomerHeading ?? "Customer Services"}
                    </div>
                    <div className="tf-collapse-content">
                      <ul className="footer-menu-list">
                        <li className="text-caption-1">
                          <Link href="/login" className="footer-menu_item">
                            {translateStorefrontUi("clientLogin", locale)}
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link href="/register" className="footer-menu_item">
                            {translateStorefrontUi(
                              "clientRegistration",
                              locale,
                            )}
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link href="/download" className="footer-menu_item">
                            {translateStorefrontUi(
                              "downloadAndroidApp",
                              locale,
                            )}
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link href="/cart" className="footer-menu_item">
                            {translateStorefrontUi("orderCart", locale)}
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link href="/wishlist" className="footer-menu_item">
                            {translateStorefrontUi("myWishlist", locale)}
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link
                            href="/order-feedback"
                            className="footer-menu_item"
                          >
                            {translateStorefrontUi("orderFeedback", locale)}
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-12 col-lg-3">
                <div className="footer-newsletter footer-col-block sarjan-footer-newsletter-block">
                  <div className="footer-heading text-button footer-heading-mobile">
                    {settings.footerNewsletterHeading ?? "Newsletter"}
                  </div>
                  <div className="tf-collapse-content">
                    <p>{settings.footerNote}</p>
                    <FooterNewsletterForm />
                    <p className="text-caption-1">
                      {settings.footerNewsletterText ??
                        "B2B ordering with admin approval, MOQ planning, and dispatch tracking."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div className="footer-bottom-wrap">
                  <div className="left">
                    <p className="text-caption-1">
                      ©2026 {settings.brandName}.{" "}
                      {translateStorefrontUi("allRightsReserved", locale)}
                    </p>
                  </div>
                  <div className="right">
                    <p className="text-caption-1">
                      <a
                        href="https://karandigitallabs.com"
                        target="_blank"
                        rel="noreferrer"
                        className="footer-menu_item sarjan-footer-credit"
                      >
                        {settings.footerCredit ??
                          "Designed & Developed by Karan Digital Labs"}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
