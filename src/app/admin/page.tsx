import Link from "next/link";
import Script from "next/script";
import { clients, dashboard, home, orders, products, siteSettings } from "@/data/mock";

export default function AdminPage() {
  return (
    <div id="wrapper">
      <link rel="stylesheet" href="/template/admin/font/fonts.css" />
      <link rel="stylesheet" href="/template/admin/icon/icomoon/style.css" />
      <link rel="stylesheet" href="/template/admin/css/animate.min.css" />
      <link rel="stylesheet" href="/template/admin/css/animation.css" />
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
                  {["Dashboard", "Products", "Orders", "Clients", "CMS", "Settings"].map((item) => (
                    <li className="menu-item" key={item}>
                      <a href={`#${item.toLowerCase()}`} className="menu-item-button">
                        <div className="icon"><i className="icon-grid" /></div>
                        <div className="text">{item}</div>
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
                  <div className="tf-section-2 mb-30" id="dashboard">
                    {dashboard.metrics.map((metric) => (
                      <div className="wg-chart-default" key={metric.label}>
                        <div className="flex items-center justify-between">
                          <div className="body-text mb-2">{metric.label}</div>
                        </div>
                        <h4>{metric.value}</h4>
                      </div>
                    ))}
                  </div>

                  <div className="wg-box mb-30" id="products">
                    <div className="flex items-center justify-between">
                      <h5>Product Management</h5>
                      <button className="tf-button style-1">Add Product</button>
                    </div>
                    <div className="wg-table table-product-list">
                      <ul className="table-title flex gap20 mb-14">
                        <li><div className="body-title">Product</div></li>
                        <li><div className="body-title">SKU</div></li>
                        <li><div className="body-title">MOQ</div></li>
                        <li><div className="body-title">Price</div></li>
                        <li><div className="body-title">Stock</div></li>
                      </ul>
                      {products.map((product) => (
                        <ul className="flex gap20 align-items-center" key={product.id}>
                          <li><div className="product-item"><div className="image"><img src={product.images[0]} alt={product.name} /></div><div><div className="name">{product.name}</div><div className="text-tiny">{product.category}</div></div></div></li>
                          <li>{product.sku}</li>
                          <li>{product.moq}</li>
                          <li>₹{product.price.toLocaleString("en-IN")}</li>
                          <li>{product.stock}</li>
                        </ul>
                      ))}
                    </div>
                  </div>

                  <div className="wg-box mb-30" id="orders">
                    <h5>Orders</h5>
                    <div className="wg-table table-all-category">
                      {orders.map((order) => (
                        <ul className="flex gap20" key={order.id}>
                          <li><strong>{order.id}</strong></li>
                          <li>{order.client}</li>
                          <li><span className="block-available">{order.status}</span></li>
                          <li>₹{order.total.toLocaleString("en-IN")}</li>
                          <li>{order.creditDueOn}</li>
                        </ul>
                      ))}
                    </div>
                  </div>

                  <div className="wg-box mb-30" id="clients">
                    <h5>Client Approval & Credit</h5>
                    <div className="wg-table table-all-category">
                      {clients.map((client) => (
                        <ul className="flex gap20" key={client.id}>
                          <li><strong>{client.name}</strong></li>
                          <li>{client.city}</li>
                          <li><span className="block-available">{client.status}</span></li>
                          <li>₹{client.outstanding.toLocaleString("en-IN")}</li>
                        </ul>
                      ))}
                    </div>
                  </div>

                  <div className="wg-box" id="cms">
                    <h5>Homepage CMS</h5>
                    <fieldset><div className="body-title mb-10">Hero title</div><input type="text" defaultValue={home.hero.title} /></fieldset>
                    <fieldset><div className="body-title mb-10">Hero description</div><textarea defaultValue={home.hero.description} /></fieldset>
                    <fieldset><div className="body-title mb-10">Banner image</div><input type="text" defaultValue={home.hero.image} /></fieldset>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {["jquery.min.js", "countto.js", "bootstrap.min.js", "bootstrap-select.min.js", "lazysize.min.js", "swiper-bundle.min.js", "carousel.js", "theme-settings.js", "main.js"].map((script) => (
        <Script key={script} src={`/template/admin/js/${script}`} strategy="afterInteractive" />
      ))}
    </div>
  );
}
