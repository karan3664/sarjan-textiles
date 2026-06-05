"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";
import { usePathname } from "next/navigation";
import { siteSettings } from "@/data/site";
import { legacyHeaderNavLinks } from "@/lib/header-navigation";
import {
  clearClientSessionLocal,
  logoutClientSession,
  restoreClientSessionFromCookie,
} from "@/lib/client-auth-browser";
import { isClientPublicAuthPage } from "@/lib/auth-route-guards";
import { cartItemCount, readCart, syncCartWithApi } from "@/lib/cart-client";
import { showBootstrapModal } from "@/lib/bootstrap-modal";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SARJAN_LANG_COOKIE } from "@/lib/locale-cookie";
import type { AppLocale } from "@/lib/localized-text";
import type {
  StorefrontCatalogCategory,
  StorefrontCategoryHub,
  StorefrontHeaderNavLink,
} from "@/lib/storefront-header-data";
import {
  readWishlist,
  refreshWishlistFromCatalog,
} from "@/lib/wishlist-client";

type HeaderNavLink = StorefrontHeaderNavLink;

function catalogCategoryHref(slug: string) {
  const params = new URLSearchParams();
  params.set("category", slug);
  params.set("page", "1");
  return `/products?${params.toString()}`;
}

export function ModaveHeader({
  initialLocale = "en",
  initialNavItems,
  initialCategories = [],
  initialHubs = [],
}: {
  initialLocale?: AppLocale;
  initialNavItems?: HeaderNavLink[];
  initialCategories?: StorefrontCatalogCategory[];
  initialHubs?: StorefrontCategoryHub[];
}) {
  const pathname = usePathname();
  const [client, setClient] = useState<{
    companyName?: string;
    email?: string;
  } | null>(null);
  const [catalogCategories, setCatalogCategories] = useState(initialCategories);
  const [hubs, setHubs] = useState(initialHubs);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [navItems, setNavItems] = useState<HeaderNavLink[]>(
    initialNavItems ?? legacyHeaderNavLinks(),
  );

  function readHeaderLocale(): string {
    if (typeof document === "undefined") return initialLocale;
    const match = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SARJAN_LANG_COOKIE}=`));
    return match?.split("=")[1]?.trim() || initialLocale;
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const categoriesMenuActive = pathname.startsWith("/categories");

  useEffect(() => {
    if (initialNavItems?.length) {
      setNavItems(initialNavItems);
    }
    setCatalogCategories(initialCategories);
    setHubs(initialHubs);
  }, [initialNavItems, initialCategories, initialHubs]);

  useEffect(() => {
    const sync = () => {
      try {
        const token = localStorage.getItem("sarjan-client-token")?.trim();
        if (!token) {
          setClient(null);
          return;
        }
        setClient(JSON.parse(localStorage.getItem("sarjan-client") ?? "null"));
      } catch {
        setClient(null);
      }
    };

    if (isClientPublicAuthPage(pathname)) {
      /* Login/register: drop stale localStorage so header does not show Logout */
      clearClientSessionLocal();
      setClient(null);
      window.addEventListener("sarjan-auth-updated", sync);
      window.addEventListener("storage", sync);
      return () => {
        window.removeEventListener("sarjan-auth-updated", sync);
        window.removeEventListener("storage", sync);
      };
    }

    sync();
    if (!localStorage.getItem("sarjan-client-token")?.trim()) {
      void restoreClientSessionFromCookie().then((restored) => {
        if (restored.ok) sync();
        else setClient(null);
      });
    }
    window.addEventListener("sarjan-auth-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sarjan-auth-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, [pathname]);

  useEffect(() => {
    const lang = readHeaderLocale();
    fetch(`/api/navigation?lang=${encodeURIComponent(lang)}`)
      .then((res) => res.json())
      .then((data: { items?: HeaderNavLink[] }) => {
        if (Array.isArray(data.items) && data.items.length) {
          setNavItems(data.items);
        }
      })
      .catch(() => undefined);
  }, [pathname]);

  useEffect(() => {
    const lang = readHeaderLocale();
    fetch(`/api/categories?lang=${encodeURIComponent(lang)}`)
      .then((res) => res.json())
      .then(
        (data: {
          categories?: StorefrontCatalogCategory[];
          hubs?: StorefrontCategoryHub[];
        }) => {
          setCatalogCategories(
            Array.isArray(data.categories) ? data.categories : [],
          );
          setHubs(Array.isArray(data.hubs) ? data.hubs : []);
        },
      )
      .catch(() => {
        setCatalogCategories([]);
        setHubs([]);
      });
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    const syncCounts = async () => {
      const validWishlist = await refreshWishlistFromCatalog();
      const cart = await syncCartWithApi();
      if (cancelled) return;
      setWishlistCount(validWishlist.length);
      setCartCount(cartItemCount(cart));
    };

    void syncCounts();
    const onWishlistUpdated = () => {
      setWishlistCount(readWishlist().length);
    };
    const onCartUpdated = () => {
      setCartCount(cartItemCount(readCart()));
    };
    const onAuthUpdated = () => {
      void syncCounts();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncCounts();
    };

    window.addEventListener("sarjan-wishlist-updated", onWishlistUpdated);
    window.addEventListener("sarjan-cart-updated", onCartUpdated);
    window.addEventListener("sarjan-auth-updated", onAuthUpdated);
    window.addEventListener("storage", onWishlistUpdated);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("sarjan-wishlist-updated", onWishlistUpdated);
      window.removeEventListener("sarjan-cart-updated", onCartUpdated);
      window.removeEventListener("sarjan-auth-updated", onAuthUpdated);
      window.removeEventListener("storage", onWishlistUpdated);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <header id="header" className="header-default header-style-4">
      <div className="main-header">
        <div className="container">
          <div className="row wrapper-header align-items-center">
            <div className="col-xl-5 d-none d-xl-block">
              <div className="wrapper-header-left d-flex align-items-center gap-20" />
            </div>
            <div className="col-md-4 col-3 d-xl-none">
              <button
                type="button"
                className="mobile-menu sarjan-mobile-menu-trigger"
                data-bs-toggle="offcanvas"
                data-bs-target="#mobileMenu"
                aria-controls="mobileMenu"
                aria-label="Open menu"
              >
                <span className="sarjan-mobile-menu-trigger__icon" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>
            <div className="col-xl-2 col-md-4 col-6 text-center">
              <Link href="/" className="logo-header">
                <img
                  src={siteSettings.logo}
                  alt={siteSettings.brandName}
                  className="logo"
                />
              </Link>
            </div>
            <div className="col-xl-5 col-md-4 col-3">
              <ul className="nav-icon d-flex justify-content-end align-items-center">
                <li className="nav-lang d-none d-md-block">
                  <LanguageSwitcher initialLocale={initialLocale} />
                </li>
                <li className="nav-search">
                  <a
                    href="#"
                    role="button"
                    data-bs-toggle="modal"
                    data-bs-target="#search"
                    className="nav-icon-item"
                    onClick={(event) => {
                      event.preventDefault();
                      showBootstrapModal("search");
                    }}
                  >
                    <span className="icon icon-search2" />
                  </a>
                </li>
                <li className="nav-account sarjan-nav-account-desktop">
                  <a
                    href={client ? "/profile" : "/login"}
                    className="nav-icon-item"
                  >
                    <span className="icon icon-user" />
                  </a>
                  <div className="dropdown-account dropdown-login">
                    {client ? (
                      <>
                        <div className="sub-top">
                          <a
                            href="/profile"
                            className={withBtnIcon("tf-btn btn-reset")}
                          >
                            <TfButtonIcon
                              icon="icon-user"
                              textClassName="text text-button"
                            >
                              My Account
                            </TfButtonIcon>
                          </a>
                          <p className="text-center text-secondary-2">
                            {client.companyName ?? client.email}
                          </p>
                        </div>
                        <div className="sub-bot">
                          <a
                            href="/my-account-orders"
                            className="body-text-1 link d-block mb_8"
                          >
                            My Orders
                          </a>
                          <a
                            href="/my-account-testimonials"
                            className="body-text-1 link d-block mb_8"
                          >
                            Share Testimonial
                          </a>
                          <button
                            type="button"
                            className="body-text-1 link sarjan-logout-btn"
                            onClick={() => logoutClientSession()}
                          >
                            Logout
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="sub-top">
                          <a
                            href="/login"
                            className={withBtnIcon("tf-btn btn-reset")}
                          >
                            <TfButtonIcon
                              icon="icon-user"
                              textClassName="text text-button"
                            >
                              Login
                            </TfButtonIcon>
                          </a>
                          <p className="text-center text-secondary-2">
                            Don&apos;t have an account?{" "}
                            <a href="/register">Register</a>
                          </p>
                        </div>
                        <div className="sub-bot">
                          <Link
                            href="/contact"
                            className="body-text-1 link d-block"
                          >
                            Contact us
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </li>
                <li className="nav-wishlist">
                  <a
                    href="#wishlist"
                    data-bs-toggle="modal"
                    className="nav-icon-item"
                  >
                    <span className="icon icon-heart" />
                    <span className="wishlist-count">{wishlistCount}</span>
                  </a>
                </li>
                <li className="nav-cart">
                  <a
                    href="#shoppingCart"
                    data-bs-toggle="modal"
                    className="nav-icon-item"
                  >
                    <span className="icon icon-ShoppingBagOpen" />
                    <span className="count-box">{cartCount}</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="header-bottom d-none d-xl-block header-dark">
        <div className="container">
          <div className="wrapper-header d-flex justify-content-center align-items-center">
            <nav className="box-navigation text-center">
              <ul className="box-nav-ul d-flex align-items-center justify-content-center d-none d-xl-flex">
                {navItems.map((item) => (
                  <Fragment key={`${item.href}-${item.label}`}>
                    <li
                      className={`menu-item${isActive(item.href) ? " active" : ""}`}
                    >
                      <a href={item.href} className="item-link">
                        {item.label}
                      </a>
                    </li>
                    {item.showCategoriesDropdown ? (
                      <li
                        className={`menu-item position-relative${categoriesMenuActive ? " active" : ""}`}
                        key="nav-categories"
                      >
                        <Link href="/categories" className="item-link">
                          Categories
                        </Link>
                        <div className="sub-menu sarjan-nav-categories-dropdown">
                          <div className="menu-heading">Browse</div>
                          <ul className="menu-list mb_8">
                            <li>
                              <Link
                                href="/categories"
                                className="menu-link-text"
                              >
                                All category hubs
                              </Link>
                            </li>
                            <li>
                              <Link href="/products" className="menu-link-text">
                                Full catalog
                              </Link>
                            </li>
                          </ul>
                          {hubs.length ? (
                            <>
                              <div className="menu-heading">
                                Collection hubs
                              </div>
                              <ul className="menu-list mb_8">
                                {hubs.map((hub) => (
                                  <li key={hub.slug}>
                                    <a
                                      href={`/categories/${hub.slug}`}
                                      className="menu-link-text"
                                    >
                                      {hub.title}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : null}
                          {catalogCategories.length ? (
                            <>
                              <div className="menu-heading">
                                Catalog filters
                              </div>
                              <ul className="menu-list">
                                {catalogCategories.map((cat) => (
                                  <li key={cat.slug}>
                                    <a
                                      href={catalogCategoryHref(cat.slug)}
                                      className="menu-link-text"
                                      title={`${cat.name} (${cat.productCount})`}
                                    >
                                      {cat.name}
                                      <span className="text-caption-2 text-secondary">
                                        {" "}
                                        ({cat.productCount})
                                      </span>
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : null}
                        </div>
                      </li>
                    ) : null}
                  </Fragment>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
      <div
        className="offcanvas offcanvas-start canvas-mb sarjan-mobile-menu"
        id="mobileMenu"
        tabIndex={-1}
        aria-labelledby="mobileMenuLabel"
      >
        <div className="mb-canvas-content sarjan-mobile-menu__canvas">
          <button
            type="button"
            className="icon-close-popup"
            data-bs-dismiss="offcanvas"
            aria-label="Close menu"
          >
            <i className="icon icon-close" />
          </button>
          <div className="mb-body sarjan-mobile-menu__body">
            <div className="sarjan-mobile-menu__auth" id="mobileMenuLabel">
              {client ? (
                <>
                  <p className="sarjan-mobile-menu__user-label">Signed in as</p>
                  <p className="sarjan-mobile-menu__user-name">
                    {client.companyName ?? client.email}
                  </p>
                  <div className="sarjan-mobile-menu__actions">
                    <Link
                      href="/profile"
                      className="sarjan-mobile-menu__btn"
                      data-bs-dismiss="offcanvas"
                    >
                      My Account
                    </Link>
                    <Link
                      href="/my-account-orders"
                      className="sarjan-mobile-menu__btn"
                      data-bs-dismiss="offcanvas"
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/my-account-testimonials"
                      className="sarjan-mobile-menu__btn"
                      data-bs-dismiss="offcanvas"
                    >
                      Share Testimonial
                    </Link>
                    <button
                      type="button"
                      className="sarjan-mobile-menu__btn sarjan-mobile-menu__btn--logout sarjan-logout-btn"
                      onClick={() => {
                        logoutClientSession();
                      }}
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div className="sarjan-mobile-menu__actions sarjan-mobile-menu__actions--guest">
                  <Link
                    href="/login"
                    className="sarjan-mobile-menu__btn sarjan-mobile-menu__btn--primary"
                    data-bs-dismiss="offcanvas"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="sarjan-mobile-menu__btn sarjan-mobile-menu__btn--outline"
                    data-bs-dismiss="offcanvas"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>

            <div className="sarjan-mobile-menu__lang">
              <LanguageSwitcher initialLocale={initialLocale} />
            </div>

            <form
              className="form-search sarjan-mobile-menu__search"
              action="/products"
            >
              <input
                type="text"
                name="q"
                placeholder="Search products, fabric, SKU"
              />
              <button type="submit" aria-label="Search">
                <i className="icon-search" />
              </button>
            </form>

            <nav className="sarjan-mobile-menu__nav" aria-label="Mobile">
              <p className="sarjan-mobile-menu__section-label">Menu</p>
              <ul className="nav-ul-mb sarjan-mobile-menu__links">
                {navItems.map((item) => (
                  <Fragment key={`mb-${item.href}-${item.label}`}>
                    <li
                      className={`nav-mb-item${isActive(item.href) ? " active" : ""}`}
                    >
                      <a
                        href={item.href}
                        className="mb-menu-link"
                        data-bs-dismiss="offcanvas"
                      >
                        <span>{item.label}</span>
                      </a>
                    </li>
                    {item.showCategoriesDropdown &&
                    !navItems.some((entry) => entry.href === "/categories") ? (
                      <li
                        className={`nav-mb-item${categoriesMenuActive ? " active" : ""}`}
                      >
                        <Link
                          href="/categories"
                          className="mb-menu-link"
                          data-bs-dismiss="offcanvas"
                        >
                          <span>Categories</span>
                        </Link>
                      </li>
                    ) : null}
                  </Fragment>
                ))}
              </ul>

              <details className="sarjan-mobile-menu__details">
                <summary className="sarjan-mobile-menu__details-summary">
                  Browse categories
                </summary>
                <ul className="nav-ul-mb sarjan-mobile-menu__sub">
                  {hubs.map((hub) => (
                    <li className="nav-mb-item" key={`hub-${hub.slug}`}>
                      <a
                        href={`/categories/${hub.slug}`}
                        className="mb-menu-link"
                        data-bs-dismiss="offcanvas"
                      >
                        <span>{hub.title}</span>
                      </a>
                    </li>
                  ))}
                  {catalogCategories.map((cat) => (
                    <li className="nav-mb-item" key={`cat-${cat.slug}`}>
                      <a
                        href={catalogCategoryHref(cat.slug)}
                        className="mb-menu-link"
                        data-bs-dismiss="offcanvas"
                      >
                        <span>
                          {cat.name}{" "}
                          <span className="text-caption-2">
                            ({cat.productCount})
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </nav>

            <div className="mb-other-content sarjan-mobile-menu__footer">
              <div className="group-icon sarjan-mobile-menu__quick">
                <a
                  href="#wishlist"
                  className="site-nav-icon"
                  data-bs-dismiss="offcanvas"
                  data-bs-toggle="modal"
                >
                  <i className="icon icon-heart" />
                  <span>Wishlist</span>
                </a>
                <a
                  href="#shoppingCart"
                  className="site-nav-icon"
                  data-bs-dismiss="offcanvas"
                  data-bs-toggle="modal"
                >
                  <i className="icon icon-ShoppingBagOpen" />
                  <span>Cart ({cartCount})</span>
                </a>
              </div>
              <div className="text-need">Need help?</div>
              <ul className="mb-info">
                <li>
                  <i className="icon icon-mail" />
                  <a href={`mailto:${siteSettings.email}`}>
                    {siteSettings.email}
                  </a>
                </li>
                <li>
                  <i className="icon icon-phone" />
                  <a href={`tel:${siteSettings.phone.replace(/\s/g, "")}`}>
                    {siteSettings.phone}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
