"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation, siteSettings } from "@/data/site";
import { readCart } from "@/lib/cart-client";
import { refreshWishlistFromCatalog } from "@/lib/wishlist-client";

type CatalogCategory = {
  name: string;
  slug: string;
  productCount: number;
};

type CategoryHubNav = {
  title: string;
  slug: string;
};

function catalogCategoryHref(slug: string) {
  const params = new URLSearchParams();
  params.set("category", slug);
  params.set("page", "1");
  return `/products?${params.toString()}`;
}

export function ModaveHeader() {
  const pathname = usePathname();
  const [client, setClient] = useState<{
    companyName?: string;
    email?: string;
  } | null>(null);
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategory[]>(
    [],
  );
  const [hubs, setHubs] = useState<CategoryHubNav[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const categoriesMenuActive = pathname.startsWith("/categories");

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
    sync();
    window.addEventListener("sarjan-auth-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sarjan-auth-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then(
        (data: { categories?: CatalogCategory[]; hubs?: CategoryHubNav[] }) => {
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncCounts = async () => {
      const validWishlist = await refreshWishlistFromCatalog();
      if (cancelled) return;
      setWishlistCount(validWishlist.length);
      setCartCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
    };

    void syncCounts();
    const onWishlistUpdated = () => {
      void syncCounts();
    };
    const onCartUpdated = () => {
      setCartCount(readCart().reduce((sum, item) => sum + item.quantity, 0));
    };

    window.addEventListener("sarjan-wishlist-updated", onWishlistUpdated);
    window.addEventListener("sarjan-cart-updated", onCartUpdated);
    window.addEventListener("storage", onWishlistUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("sarjan-wishlist-updated", onWishlistUpdated);
      window.removeEventListener("sarjan-cart-updated", onCartUpdated);
      window.removeEventListener("storage", onWishlistUpdated);
    };
  }, []);

  const logout = () => {
    void fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    localStorage.removeItem("sarjan-client");
    localStorage.removeItem("sarjan-client-token");
    window.dispatchEvent(new CustomEvent("sarjan-auth-updated"));
    window.location.assign("/login");
  };

  return (
    <header id="header" className="header-default header-style-4">
      <div className="main-header">
        <div className="container">
          <div className="row wrapper-header align-items-center">
            <div className="col-xl-5 d-none d-xl-block">
              <div className="wrapper-header-left d-flex align-items-center gap-20" />
            </div>
            <div className="col-md-4 col-3 d-xl-none">
              <a
                href="#mobileMenu"
                className="mobile-menu"
                data-bs-toggle="offcanvas"
                data-bs-target="#mobileMenu"
                aria-controls="mobileMenu"
                aria-label="Open menu"
              >
                <i className="icon icon-categories" />
              </a>
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
                <li className="nav-search">
                  <a
                    href="#search"
                    data-bs-toggle="modal"
                    className="nav-icon-item"
                  >
                    <span className="icon icon-search2" />
                  </a>
                </li>
                <li className="nav-account">
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
                          <a href="/profile" className="tf-btn btn-reset">
                            My Account
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
                            onClick={logout}
                          >
                            Logout
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="sub-top">
                          <a href="/login" className="tf-btn btn-reset">
                            Login
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
                {navigation.map((item) => (
                  <Fragment key={item.href}>
                    <li
                      className={`menu-item${isActive(item.href) ? " active" : ""}`}
                    >
                      <a href={item.href} className="item-link">
                        {item.label}
                      </a>
                    </li>
                    {item.href === "/products" ? (
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
        className="offcanvas offcanvas-start canvas-mb"
        id="mobileMenu"
        tabIndex={-1}
        aria-labelledby="mobileMenuLabel"
      >
        <div className="mb-canvas-content">
          <button
            type="button"
            className="icon-close-popup"
            data-bs-dismiss="offcanvas"
            aria-label="Close menu"
          >
            <i className="icon icon-close" />
          </button>
          <div className="mb-body">
            <div>
              <form className="form-search" action="/products">
                <input
                  type="text"
                  name="q"
                  placeholder="Search products, fabric, SKU"
                />
                <button type="submit" aria-label="Search">
                  <i className="icon-search" />
                </button>
              </form>
              <ul className="nav-ul-mb" id="mobileMenuLabel">
                {navigation.map((item) => (
                  <li
                    className={`nav-mb-item${isActive(item.href) ? " active" : ""}`}
                    key={item.href}
                  >
                    <a
                      href={item.href}
                      className="mb-menu-link"
                      data-bs-dismiss="offcanvas"
                    >
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
                <li
                  className={`nav-mb-item${categoriesMenuActive ? " active" : ""}`}
                >
                  <Link
                    href="/categories"
                    className="mb-menu-link fw-6"
                    data-bs-dismiss="offcanvas"
                  >
                    <span>Category hubs</span>
                  </Link>
                </li>
                {hubs.map((hub) => (
                  <li className="nav-mb-item" key={`hub-${hub.slug}`}>
                    <a
                      href={`/categories/${hub.slug}`}
                      className="mb-menu-link ps-3"
                      data-bs-dismiss="offcanvas"
                    >
                      <span>{hub.title}</span>
                    </a>
                  </li>
                ))}
                <li className="nav-mb-item">
                  <span className="mb-menu-link fw-6 text-secondary">
                    Shop by category
                  </span>
                </li>
                {catalogCategories.map((cat) => (
                  <li className="nav-mb-item" key={`cat-${cat.slug}`}>
                    <a
                      href={catalogCategoryHref(cat.slug)}
                      className="mb-menu-link ps-3"
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
            </div>
            <div className="mb-other-content">
              <div className="group-icon">
                <a
                  href={client ? "/profile" : "/login"}
                  className="site-nav-icon"
                  data-bs-dismiss="offcanvas"
                >
                  <i className="icon icon-user" />
                  <span>{client ? "Account" : "Login"}</span>
                </a>
                <a
                  href="#wishlist"
                  className="site-nav-icon"
                  data-bs-dismiss="offcanvas"
                  data-bs-toggle="modal"
                >
                  <i className="icon icon-heart" />
                  <span>Wishlist</span>
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
