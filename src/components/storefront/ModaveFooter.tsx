import Link from "next/link";
import { navigation, siteSettings } from "@/data/mock";
import { getCachedCmsSnapshot } from "@/lib/cms-store";

export async function ModaveFooter() {
  const cms = await getCachedCmsSnapshot();
  const settings = { ...siteSettings, ...cms.siteSettings };
  const directionsHref =
    settings.directionsUrl?.trim() ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`;
  return (
    <footer id="footer" className="footer bg-main">
      <div className="footer-wrap">
        <div className="footer-body">
          <div className="container">
            <div className="row">
              <div className="col-lg-4">
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
                      GET DIRECTION
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
                      >
                        <i className="icon icon-fb" />
                      </a>
                    </li>
                    <li>
                      <a
                        href={settings.instagramUrl ?? "#"}
                        className="social-instagram"
                      >
                        <i className="icon icon-instagram" />
                      </a>
                    </li>
                    <li>
                      <a
                        href={settings.linkedinUrl ?? "#"}
                        className="social-linkedin"
                        aria-label="LinkedIn"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="currentColor"
                          aria-hidden
                        >
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
                        </svg>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="footer-menu">
                  <div className="footer-col-block">
                    <div className="footer-heading text-button footer-heading-mobile">
                      {settings.footerInfoHeading ?? "Information"}
                    </div>
                    <div className="tf-collapse-content">
                      <ul className="footer-menu-list">
                        {navigation.map((item) => (
                          <li className="text-caption-1" key={item.href}>
                            <Link href={item.href} className="footer-menu_item">
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="footer-col-block">
                    <div className="footer-heading text-button footer-heading-mobile">
                      Policies
                    </div>
                    <div className="tf-collapse-content">
                      <ul className="footer-menu-list">
                        <li className="text-caption-1">
                          <Link
                            href="/privacy-policy"
                            className="footer-menu_item"
                          >
                            Privacy policy
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link
                            href="/term-of-use"
                            className="footer-menu_item"
                          >
                            Terms of use
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link
                            href="/refund-policy"
                            className="footer-menu_item"
                          >
                            Refund policy
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link
                            href="/shipping-policy"
                            className="footer-menu_item"
                          >
                            Shipping policy
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="footer-col-block">
                    <div className="footer-heading text-button footer-heading-mobile">
                      {settings.footerCustomerHeading ?? "Customer Services"}
                    </div>
                    <div className="tf-collapse-content">
                      <ul className="footer-menu-list">
                        <li className="text-caption-1">
                          <Link href="/login" className="footer-menu_item">
                            Client Login
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link href="/register" className="footer-menu_item">
                            Client Registration
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link href="/cart" className="footer-menu_item">
                            Order Cart
                          </Link>
                        </li>
                        <li className="text-caption-1">
                          <Link href="/wishlist" className="footer-menu_item">
                            My Wishlist
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="footer-newsletter">
                  <div className="footer-heading text-button footer-heading-mobile">
                    {settings.footerNewsletterHeading ?? "Newsletter"}
                  </div>
                  <div className="tf-collapse-content">
                    <p>{settings.footerNote}</p>
                    <form className="form-newsletter subscribe-form style-black">
                      <div className="subscribe-content">
                        <fieldset className="email">
                          <input
                            type="email"
                            name="email-form"
                            className="subscribe-email"
                            placeholder="Enter your email"
                          />
                        </fieldset>
                        <div className="button-submit">
                          <button className="subscribe-button" type="button">
                            <i className="icon-arrowUpRight" />
                          </button>
                        </div>
                      </div>
                    </form>
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
                      ©2026 {settings.brandName}. All Rights Reserved.
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
