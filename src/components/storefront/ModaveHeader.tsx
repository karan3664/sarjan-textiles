"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { navigation, siteSettings } from "@/data/site";

export function ModaveHeader() {
  const pathname = usePathname();
  const [client, setClient] = useState<{ companyName?: string; email?: string } | null>(null);
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    const sync = () => {
      try {
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

  const logout = () => {
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
              <a href="#mobileMenu" className="mobile-menu" data-bs-toggle="offcanvas" aria-controls="mobileMenu">
                <i className="icon icon-categories" />
              </a>
            </div>
            <div className="col-xl-2 col-md-4 col-6 text-center">
              <a href="/" className="logo-header">
                <img src={siteSettings.logo} alt={siteSettings.brandName} className="logo" />
              </a>
            </div>
            <div className="col-xl-5 col-md-4 col-3">
              <ul className="nav-icon d-flex justify-content-end align-items-center">
                <li className="nav-search">
                  <a href="#search" data-bs-toggle="modal" className="nav-icon-item">
                    <span className="icon icon-search2" />
                  </a>
                </li>
                <li className="nav-account">
                  <a href={client ? "/profile" : "/login"} className="nav-icon-item"><span className="icon icon-user" /></a>
                  <div className="dropdown-account dropdown-login">
                    {client ? (
                      <>
                        <div className="sub-top">
                          <a href="/profile" className="tf-btn btn-reset">My Account</a>
                          <p className="text-center text-secondary-2">{client.companyName ?? client.email}</p>
                        </div>
                        <div className="sub-bot">
                          <a href="/my-account-orders" className="body-text-1 link d-block mb_8">My Orders</a>
                          <button type="button" className="body-text-1 link sarjan-logout-btn" onClick={logout}>Logout</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="sub-top">
                          <a href="/login" className="tf-btn btn-reset">Login</a>
                          <p className="text-center text-secondary-2">Don&apos;t have an account? <a href="/register">Register</a></p>
                        </div>
                        <div className="sub-bot">
                          <span className="body-text-">Support</span>
                        </div>
                      </>
                    )}
                  </div>
                </li>
                <li className="nav-wishlist">
                  <a href="#wishlist" data-bs-toggle="modal" className="nav-icon-item">
                    <span className="icon icon-heart" />
                    <span className="wishlist-count">0</span>
                  </a>
                </li>
                <li className="nav-cart">
                  <a href="#shoppingCart" data-bs-toggle="modal" className="nav-icon-item">
                    <span className="icon icon-ShoppingBagOpen" />
                    <span className="count-box">0</span>
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
                  <li className={`menu-item${isActive(item.href) ? " active" : ""}`} key={item.href}>
                    <a href={item.href} className="item-link">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
