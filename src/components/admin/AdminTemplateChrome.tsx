import Link from "next/link";
import Script from "next/script";
import type { ReactNode } from "react";
import { AdminSidebarController } from "./AdminSidebarController";

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

type AdminActiveSection = "dashboard" | "customers" | "orders" | "dispatch" | "payments" | "inventory" | "pricing" | "home" | "testimonials" | "products" | "filters" | "blogs" | "about" | "contact" | "inquiries" | "audit";

function Sidebar({ active }: { active: AdminActiveSection }) {
  return (
    <div className="section-menu-left">
      <div className="menu-backdrop" />
      <div className="box-logo">
        <Link href="/admin" id="site-logo-inner" className="sarjan-admin-sidebar-logo">
          <img
            id="logo_header"
            alt="Sarjan Textiles"
            src="/sarjan-assets/sarjan-logo-icon.png"
            data-light="/sarjan-assets/sarjan-logo-icon.png"
            data-dark="/sarjan-assets/sarjan-logo-icon.png"
          />
          <span>Sarjan Textiles</span>
        </Link>
        <button type="button" className="sarjan-admin-toggle sarjan-admin-toggle-close" data-admin-menu-close aria-label="Hide sidebar">
          <i className="icon-chevron-left" />
        </button>
      </div>
      <div className="section-menu-left-wrap">
        <div className="center">
          <ul>
            <MenuItem href="/admin" icon="icon-house" label="Dashboard" active={active === "dashboard"} />
            <MenuItem href="/admin/customers" icon="icon-users" label="Client Management" active={active === "customers"} />
            <MenuItem href="/admin/products-list" icon="icon-package" label="Products" active={active === "products"} />
            <MenuItem href="/admin/product-filters" icon="icon-chart-bar" label="Product Filters" active={active === "filters"} />
            <MenuItem href="/admin/categories" icon="icon-folders" label="Categories" />
            <MenuItem href="/admin/products-low" icon="icon-basket" label="Inventory" active={active === "inventory"} />
            <MenuItem href="/admin/orders" icon="icon-dollar" label="Orders" active={active === "orders"} />
            <MenuItem href="/admin/dispatch" icon="icon-send" label="Dispatch" active={active === "dispatch"} />
            <MenuItem href="/admin/payments" icon="icon-hand-coins" label="Payments & Credit" active={active === "payments"} />
            <MenuItem href="/admin/pricing" icon="icon-dollar" label="Client Pricing" active={active === "pricing"} />
            <MenuItem href="/admin/home" icon="icon-edit" label="CMS / Home Page" active={active === "home"} />
            <MenuItem href="/admin/about" icon="icon-edit" label="About Us" active={active === "about"} />
            <MenuItem href="/admin/contact" icon="icon-edit" label="Contact Us" active={active === "contact"} />
            <MenuItem href="/admin/contact-inquiries" icon="icon-message" label="Contact Inquiries" active={active === "inquiries"} />
            <MenuItem href="/admin/blogs-list" icon="icon-edit" label="Blogs" active={active === "blogs"} />
            <MenuItem href="/admin/testimonials" icon="icon-message" label="Testimonials" active={active === "testimonials"} />
            <MenuItem href="/admin/tags" icon="icon-chart-bar" label="SEO" />
            <MenuItem href="/admin/notice" icon="icon-bell" label="Notifications" />
            <MenuItem href="/admin/reports" icon="icon-chart-bar" label="Reports" />
            <MenuItem href="/admin/audit" icon="icon-clipboard-text" label="Audit Logs" active={active === "audit"} />
            <MenuItem href="/admin/change-password" icon="icon-users" label="Roles & Permissions" />
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
          <button type="button" className="sarjan-admin-toggle sarjan-admin-toggle-open" data-admin-menu-toggle aria-label="Toggle sidebar">
            <i className="icon-chevron-right" />
          </button>
          <form className="form-search flex-grow">
            <fieldset className="name">
              <input type="text" placeholder="Enter your e-mail" className="show-search style-1" name="name" tabIndex={2} value="" aria-required="true" required readOnly />
            </fieldset>
            <div className="button-submit">
              <button className="" type="submit">
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
  active: AdminActiveSection;
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
            <AdminSidebarController />
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
