import Link from "next/link";
import Script from "next/script";
import type { ReactNode } from "react";

const adminStyles = [
  "css/animate.min.css",
  "css/animation.css",
  "css/bootstrap.css",
  "css/bootstrap-select.min.css",
  "css/swiper-bundle.min.css",
  "css/styles.css",
  "font/fonts.css",
  "icon/icomoon/style.css",
];

const adminScripts = [
  "jquery.min.js",
  "countto.js",
  "bootstrap.min.js",
  "bootstrap-select.min.js",
  "lazysize.min.js",
  "swiper-bundle.min.js",
  "carousel.js",
  "theme-settings.js",
  "main.js",
];

function MenuItem({ href, icon, label, active = false }: { href: string; icon: string; label: string; active?: boolean }) {
  return (
    <li className="menu-item">
      <Link href={href} className={`menu-item-button${active ? " active" : ""}`}>
        <div className="icon">
          <i className={icon} />
        </div>
        <div className="text text-title">{label}</div>
      </Link>
    </li>
  );
}

function Sidebar({ active }: { active: "dashboard" | "home" }) {
  return (
    <div className="section-menu-left">
      <div className="menu-backdrop" />
      <div className="box-logo">
        <Link href="/admin" id="site-logo-inner">
          <img
            id="logo_header"
            alt="Sarjan Textiles"
            src="/sarjan-assets/sarjan-logo-full.png"
            data-light="/sarjan-assets/sarjan-logo-full.png"
            data-dark="/sarjan-assets/sarjan-logo-full.png"
          />
        </Link>
        <div className="button-show-hide">
          <i className="icon-chevron-left" />
        </div>
      </div>
      <div className="section-menu-left-wrap">
        <div className="center">
          <ul>
            <MenuItem href="/admin" icon="icon-house" label="Dashboard" active={active === "dashboard"} />
            <MenuItem href="/admin/home" icon="icon-edit" label="Home Page CMS" active={active === "home"} />
            <MenuItem href="/admin/products-list" icon="icon-package" label="Products" />
            <MenuItem href="/admin/categories" icon="icon-folders" label="Categories" />
            <MenuItem href="/admin/orders-list" icon="icon-dollar" label="Orders" />
            <MenuItem href="/admin/user-list" icon="icon-users" label="Clients" />
            <MenuItem href="/admin/reports" icon="icon-chart-bar" label="Reports" />
            <MenuItem href="/admin/reviews" icon="icon-star-fill" label="Reviews" />
            <MenuItem href="/" icon="icon-sign-out" label="Front Store" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="header-dashboard">
      <div className="wrap">
        <div className="header-left">
          <div className="button-show-hide">
            <i className="icon-chevron-right" />
          </div>
          <form className="form-search flex-grow">
            <fieldset className="name">
              <input type="text" placeholder="Search CMS, products, orders" className="show-search style-1" name="name" />
            </fieldset>
            <div className="button-submit">
              <button type="button">
                <i className="icon-search" />
              </button>
            </div>
          </form>
        </div>
        <div className="header-grid">
          <div className="header-btn">
            <div className="popup-wrap noti type-header">
              <div className="dropdown">
                <button className="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <span className="header-item has-dot">
                    <i className="icon-bell" />
                  </span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end has-content">
                  <li>
                    <h6>Notifications</h6>
                  </li>
                  <li>
                    <div className="notifications-item item-2">
                      <div className="image">
                        <i className="icon-edit" />
                      </div>
                      <div>
                        <div className="text-title">Home CMS ready</div>
                        <div className="text-caption-1">Frontend pulls content from admin API.</div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="line1" />
          <div className="popup-wrap user type-header">
            <div className="dropdown">
              <button className="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <span className="header-user wg-user">
                  <span className="image">
                    <img className="lazyload" data-src="/template/admin/images/avatar/user-1.jpg" src="/template/admin/images/avatar/user-1.jpg" alt="" />
                  </span>
                  <span className="content">
                    <span className="text-button name">Super Admin</span>
                  </span>
                  <i className="icon icon-arrow-down" />
                </span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end has-content">
                <li>
                  <Link href="/admin/user-profile" className="user-item link">
                    <div className="text-title">Account</div>
                  </Link>
                </li>
                <li>
                  <Link href="/" className="user-item link">
                    <div className="text-title">Front Store</div>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminTemplateChrome({
  active,
  title,
  children,
}: {
  active: "dashboard" | "home";
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      {adminStyles.map((style) => (
        <link key={style} rel="stylesheet" href={`/template/admin/${style}`} />
      ))}
      <div id="wrapper">
        <div id="page">
          <div className="layout-wrap loader-off">
            <div id="preload" className="preload-container">
              <div className="preloading">
                <span />
              </div>
            </div>
            <Sidebar active={active} />
            <div className="section-content-right">
              <Header />
              <div className="main-content">
                <div className="main-content-inner">
                  <div className="flex flex-wrap justify-between gap14 items-center">
                    <h4 className="heading">{title}</h4>
                    <div className="text-caption-1 text-secondary">Sarjan Textiles CMS</div>
                  </div>
                  {children}
                </div>
                <div className="bottom-page">
                  <div className="body-text">Copyright © 2026 Sarjan Textiles.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {adminScripts.map((script) => (
        <Script key={script} src={`/template/admin/js/${script}`} strategy="afterInteractive" />
      ))}
    </>
  );
}
