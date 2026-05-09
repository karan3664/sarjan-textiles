import Link from "next/link";
import Script from "next/script";
import { AdminCmsClient } from "@/components/admin/AdminCmsClient";
import { siteSettings } from "@/data/mock";

export const dynamic = "force-dynamic";

const menu = [
  ["dashboard", "Dashboard", "icon-grid"],
  ["homepage", "Homepage CMS", "icon-edit"],
  ["products", "Products", "icon-shopping-bag"],
  ["blogs", "Blogs", "icon-file"],
  ["settings", "Settings", "icon-settings"],
];

export default function AdminPage() {
  return (
    <div id="wrapper">
      <link rel="stylesheet" href="/template/admin/font/fonts.css" />
      <link rel="stylesheet" href="/template/admin/icon/icomoon/style.css" />
      <link rel="stylesheet" href="/template/admin/css/animate.min.css" />
      <link rel="stylesheet" href="/template/admin/css/animation.css" />
      <link rel="stylesheet" href="/template/admin/css/bootstrap.css" />
      <link rel="stylesheet" href="/template/admin/css/bootstrap-select.min.css" />
      <link rel="stylesheet" href="/template/admin/css/styles.css" />
      <div id="page">
        <div className="layout-wrap">
          <div className="section-menu-left">
            <div className="box-logo">
              <Link href="/admin"><img src={siteSettings.logo} alt={siteSettings.brandName} /></Link>
            </div>
            <div className="center">
              <div className="center-item">
                <ul className="menu-list">
                  {menu.map(([id, label, icon]) => (
                    <li className="menu-item" key={id}>
                      <a href={`#${id}`} className="menu-item-button">
                        <div className="icon"><i className={icon} /></div>
                        <div className="text">{label}</div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="section-content-right">
            <div className="header-dashboard">
              <div className="wrap">
                <div className="header-left"><h4>Sarjan Admin Panel</h4></div>
                <div className="header-grid"><Link href="/" className="tf-button style-1">View Storefront</Link></div>
              </div>
            </div>
            <div className="main-content">
              <div className="main-content-inner">
                <div className="main-content-wrap">
                  <AdminCmsClient />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {["jquery.min.js", "bootstrap.min.js", "bootstrap-select.min.js", "lazysize.min.js", "theme-settings.js", "main.js"].map((script) => (
        <Script key={script} src={`/template/admin/js/${script}`} strategy="afterInteractive" />
      ))}
    </div>
  );
}
