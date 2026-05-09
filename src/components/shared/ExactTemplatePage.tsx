import fs from "node:fs";
import path from "node:path";
import Script from "next/script";
import { getCartItems, mockApi } from "@/lib/mock-api";
import type { Product } from "@/data/mock";

type TemplateKind = "storefront" | "admin";

const scriptMap: Record<TemplateKind, string[]> = {
  storefront: [
    "jquery.min.js",
    "bootstrap.min.js",
    "swiper-bundle.min.js",
    "carousel.js",
    "bootstrap-select.min.js",
    "lazysize.min.js",
    "count-down.js",
    "wow.min.js",
    "multiple-modal.js",
    "drift.min.js",
    "main.js",
    "photoswipe-lightbox.umd.min.js",
    "photoswipe.umd.min.js",
    "zoom.js",
  ],
  admin: [
    "jquery.min.js",
    "countto.js",
    "bootstrap.min.js",
    "bootstrap-select.min.js",
    "lazysize.min.js",
    "swiper-bundle.min.js",
    "carousel.js",
    "theme-settings.js",
    "main.js",
  ],
};

const styleMap: Record<TemplateKind, string[]> = {
  storefront: [],
  admin: [
    "css/animate.min.css",
    "css/animation.css",
    "css/bootstrap.css",
    "css/bootstrap-select.min.css",
    "css/swiper-bundle.min.css",
    "css/styles.css",
    "font/fonts.css",
    "icon/icomoon/style.css",
  ],
};

function extractBody(html: string) {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  return body.replace(/<script[\s\S]*?<\/script>/gi, "");
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function cycleProducts(html: string) {
  let titleIndex = 0;
  let priceIndex = 0;
  const products = mockApi.products;

  return html
    .replace(/(<a[^>]*class="(?:title link|name-product link|cart-title link)"[^>]*>)([\s\S]*?)(<\/a>)/g, (match, start, _content, end) => {
      const product = products[titleIndex % products.length];
      titleIndex += 1;
      return `${start}${escapeHtml(product.name)}${end}`;
    })
    .replace(/(<span[^>]*class="[^"]*(?:current-price|price)[^"]*"[^>]*>)\$[\d.,]+(<\/span>)/g, (match, start, end) => {
      const product = products[priceIndex % products.length];
      priceIndex += 1;
      return `${start}${formatInr(product.price)}${end}`;
    })
    .replace(/(<div[^>]*class="[^"]*(?:cart-price|cart-total|total-price|price-on-sale)[^"]*"[^>]*>)\$[\d.,]+(<\/div>)/g, (match, start, end) => {
      const product = products[priceIndex % products.length];
      priceIndex += 1;
      return `${start}${formatInr(product.price)}${end}`;
    });
}

function applyCommonData(html: string) {
  const settings = mockApi.siteSettings;

  return html
    .replaceAll("Modave", escapeHtml(settings.brandName))
    .replaceAll("Themesflat", escapeHtml(settings.brandName))
    .replaceAll("©2024 Sarjan Textiles. All Rights Reserved.", `©2026 ${escapeHtml(settings.brandName)}. All Rights Reserved.`)
    .replaceAll("Enter your e-mail", settings.email)
    .replaceAll("Fashion", "Textiles")
    .replaceAll("Women", "Printed Shirts")
    .replaceAll("Men", "Kurtas")
    .replaceAll("Kids", "Festive Prints")
    .replaceAll("Shop Printed Shirts", mockApi.home.categories[0]?.name ?? "Printed Shirts")
    .replaceAll("Shop Kurtas", mockApi.home.categories[1]?.name ?? "Kurtas")
    .replaceAll("Shop Festive Prints", mockApi.home.categories[2]?.name ?? "Festive Prints");
}

function applyHomeData(html: string) {
  const hero = mockApi.home.hero;
  const title = escapeHtml(hero.title).replace(" ready ", " ready <br>");

  return html
    .replace(/(<div class="heading text-white title-display[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/, `$1${title}$3`)
    .replace(/(<p class="body-text-1 subheading text-white[^"]*"[^>]*>)([\s\S]*?)(<\/p>)/, `$1${escapeHtml(hero.description)}$3`)
    .replace(/(<span class="text">)Explore Collection(<\/span>)/, `$1${escapeHtml(hero.primaryCta.label)}$2`)
    .replaceAll("New Arrivals", "Latest Textile Arrivals")
    .replaceAll("Best Seller", "Top Wholesale Demand")
    .replaceAll("Sale Off", "MOQ Ready Stock");
}

function applyProductDetailData(html: string, product: Product = mockApi.products[0]) {
  return html
    .replace(/(<div class="text text-btn-uppercase">)([\s\S]*?)(<\/div>\s*<h3 class="name">)/, `$1${escapeHtml(product.category)}$3`)
    .replace(/(<h3 class="name">)([\s\S]*?)(<\/h3>)/, `$1${escapeHtml(product.name)}$3`)
    .replace(/(<h5 class="price-on-sale font-2">)\$[\d.,]+(<\/h5>)/g, `$1${formatInr(product.price)}$2`)
    .replace(/(<div class="compare-at-price font-2">)\$[\d.,]+(<\/div>)/g, `$1${formatInr(Math.round(product.price * 1.18))}$2`)
    .replace(/(<div class="badges-on-sale text-btn-uppercase">\s*)-[\d]+%(\s*<\/div>)/g, `$1MOQ ${product.moq}$2`)
    .replace(/(<div class="tf-product-info-desc">[\s\S]*?<p>)([\s\S]*?)(<\/p>)/, `$1${escapeHtml(product.description)} SKU ${escapeHtml(product.sku)}. Fabric: ${escapeHtml(product.fabric)}.$3`)
    .replaceAll("Clothing", escapeHtml(product.category))
    .replaceAll("Stretch Strap Top", escapeHtml(product.name))
    .replaceAll("Gray", escapeHtml(product.colors[0] ?? "Black"))
    .replaceAll("Beige", escapeHtml(product.colors[1] ?? "Ivory"))
    .replaceAll("Grey", escapeHtml(product.colors[2] ?? "Teal"))
    .replaceAll("$79.99", formatInr(product.price));
}

function applyBlogListData(html: string) {
  let index = 0;
  const blogs = mockApi.blogs;

  return html
    .replaceAll("Blog Default", "Textile Journal")
    .replace(/(<h4 class="title fw-5">\s*<a class="link" href="[^"]*">)([\s\S]*?)(<\/a>\s*<\/h4>)/g, (match, start, _content, end) => {
      const blog = blogs[index % blogs.length];
      index += 1;
      return `${start}${escapeHtml(blog.title)}${end}`;
    })
    .replace(/(<div class="body-text-1">)([\s\S]*?)(<\/div>)/g, (match, start, _content, end) => {
      const blog = blogs[(index - 1 + blogs.length) % blogs.length];
      return `${start}${escapeHtml(blog.excerpt)}${end}`;
    })
    .replaceAll("February 28, 2024", blogs[0]?.date ?? "2026-05-08");
}

function applyBlogDetailData(html: string) {
  const blog = mockApi.blogs[0];

  return html
    .replace(/(<h3 class="fw-5">)([\s\S]*?)(<\/h3>)/, `$1${escapeHtml(blog.title)}$3`)
    .replace(/(<p class="body-text-1">by <a class="link" href="#">)([\s\S]*?)(<\/a><\/p>)/, `$1${escapeHtml(mockApi.siteSettings.brandName)}$3`)
    .replace(/(<div class="content">\s*<p class="body-text-1 mb_12">)([\s\S]*?)(<\/p>)/, `$1${escapeHtml(blog.content)}$3`)
    .replaceAll("February 28, 2024", blog.date)
    .replaceAll("Fashion Trends", "Textile Buying")
    .replaceAll("Fashion", "Textiles")
    .replaceAll("Trending", "B2B Orders");
}

function buildCartRows() {
  const items = getCartItems();

  return items
    .map((item) => {
      if (!item) return "";
      return `
        <tr class="tf-cart-item file-delete">
          <td class="tf-cart-item_product">
            <a href="/products/${escapeHtml(item.product.slug)}" class="img-box">
              <img src="${escapeHtml(item.product.images[0])}" alt="${escapeHtml(item.product.name)}">
            </a>
            <div class="cart-info">
              <a href="/products/${escapeHtml(item.product.slug)}" class="cart-title link">${escapeHtml(item.product.name)}</a>
              <div class="variant-box">
                <div class="tf-select"><select><option selected="selected">${escapeHtml(item.color)}</option></select></div>
                <div class="tf-select"><select><option selected="selected">${escapeHtml(item.size)}</option></select></div>
              </div>
            </div>
          </td>
          <td data-cart-title="Price" class="tf-cart-item_price text-center">
            <div class="cart-price text-button price-on-sale">${formatInr(item.product.price)}</div>
          </td>
          <td data-cart-title="Quantity" class="tf-cart-item_quantity">
            <div class="wg-quantity mx-md-auto">
              <span class="btn-quantity btn-decrease">-</span>
              <input type="text" class="quantity-product" name="number" value="${item.quantity}">
              <span class="btn-quantity btn-increase">+</span>
            </div>
          </td>
          <td data-cart-title="Total" class="tf-cart-item_total text-center">
            <div class="cart-total text-button total-price">${formatInr(item.lineTotal)}</div>
          </td>
          <td data-cart-title="Remove" class="remove-cart"><span class="remove icon icon-close"></span></td>
        </tr>`;
    })
    .join("");
}

function applyCartData(html: string) {
  const rows = buildCartRows();
  const total = getCartItems().reduce((sum, item) => sum + (item?.lineTotal ?? 0), 0);

  return html
    .replace(/(<tbody>)([\s\S]*?)(<\/tbody>)/, `$1${rows}$3`)
    .replace(/\$186,99/g, formatInr(total))
    .replace(/\$186\.99/g, formatInr(total))
    .replace(/Check Out/g, "Place Order Request")
    .replace(/Checkout/g, "Order Request")
    .replace(/Free shipping/g, "Admin approval required");
}

function applyCheckoutData(html: string) {
  const total = getCartItems().reduce((sum, item) => sum + (item?.lineTotal ?? 0), 0);

  return applyCartData(html)
    .replaceAll("Payment", "Manual Cheque Collection")
    .replaceAll("Credit Card", `${mockApi.siteSettings.creditTermDays}-Day Credit`)
    .replaceAll("Place order", "Submit Order Request")
    .replace(/\$500\.00/g, formatInr(50000))
    .replace(/(<span class="total-price-checkout">)([\s\S]*?)(<\/span>)/, `$1${formatInr(total)}$3`);
}

function applyFileData(html: string, file: string) {
  if (file === "home-fashion-chicHaven.html") return applyHomeData(html);
  if (file === "product-detail.html") return applyProductDetailData(html);
  if (file === "blog-default.html") return applyBlogListData(html);
  if (file === "blog-detail.html") return applyBlogDetailData(html);
  if (file === "shopping-cart.html") return applyCartData(html);
  if (file === "checkout.html") return applyCheckoutData(html);
  if (file === "about-us.html") {
    return html
      .replace(/(<h3[^>]*>)([\s\S]*?)(<\/h3>)/, `$1${escapeHtml(mockApi.pages.about.title)}$3`)
      .replace(/(<p[^>]*>)([\s\S]*?)(<\/p>)/, `$1${escapeHtml(mockApi.pages.about.body)}$3`);
  }
  if (file === "contact-02.html") {
    return html
      .replaceAll("Contact Us", mockApi.pages.contact.title)
      .replaceAll("support@example.com", mockApi.siteSettings.email)
      .replaceAll("+1 666 234 8888", mockApi.siteSettings.phone);
  }
  return html;
}

function rewriteHtml(html: string, kind: TemplateKind) {
  const base = kind === "storefront" ? "/template/storefront" : "/template/admin";
  const logo = "/sarjan-assets/sarjan-logo-full.png";
  const favicon = "/sarjan-assets/sarjan-favicon-192.png";
  const banner = "/sarjan-assets/banner-textiles-studio.webp";
  const sarjanProducts = [
    "/sarjan-assets/shirt-ajrak-black-studio.webp",
    "/sarjan-assets/shirt-mustard-block-studio.webp",
    "/sarjan-assets/shirt-blue-block-studio.webp",
    "/sarjan-assets/shirt-ivory-red-blue-studio.webp",
    "/sarjan-assets/kurta-blue-floral-studio.webp",
    "/sarjan-assets/kurta-teal-diamond-studio.webp",
    "/sarjan-assets/kurta-red-medallion-studio.webp",
    "/sarjan-assets/kurta-beige-diamond-studio.webp",
  ];
  let productIndex = 0;

  const adminHomeMenu = `
                                <li class="menu-item">
                                    <a href="/admin/home" class="menu-item-button">
                                        <div class="icon">
                                            <i class="icon-edit"></i>
                                        </div>
                                        <div class="text text-title">Home Page CMS</div>
                                    </a>
                                </li>`;

  return applyCommonData(html)
    .replace(
      kind === "admin" ? /(<div class="text text-title">Dashboard<\/div>\s*<\/a>\s*<\/li>)/ : /$^/,
      `$1${adminHomeMenu}`,
    )
    .replaceAll("images/logo/logo.svg", logo)
    .replaceAll("images/logo/logo-white.svg", logo)
    .replaceAll("images/logo/favicon.png", favicon)
    .replace(/images\/(?:products|product)\/[^"')\s]+/g, () => {
      const image = sarjanProducts[productIndex % sarjanProducts.length];
      productIndex += 1;
      return image;
    })
    .replace(/images\/(slider|banner|collections)\/[^"')\s]+/g, banner)
    .replace(/(^|["'(=:\s])images\/(country|avatar|item|categories|payment|shop|logo)\//g, `$1${base}/images/$2/`)
    .replaceAll('src="images/', `src="${base}/images/`)
    .replaceAll("src='images/", `src='${base}/images/`)
    .replaceAll('data-src="images/', `data-src="${base}/images/`)
    .replaceAll("data-src='images/", `data-src='${base}/images/`)
    .replaceAll('href="images/', `href="${base}/images/`)
    .replaceAll("href='images/", `href='${base}/images/`)
    .replaceAll('data-zoom="images/', `data-zoom="${base}/images/`)
    .replaceAll("data-zoom='images/", `data-zoom='${base}/images/`)
    .replaceAll('href="home-fashion-chicHaven.html"', 'href="/"')
    .replaceAll('href="product-detail.html"', 'href="/products/ajrak-black-shirt"')
    .replaceAll('href="blog-default.html"', 'href="/blog"')
    .replaceAll('href="blog-detail.html"', 'href="/blog/how-b2b-textile-buyers-plan-seasonal-assortments"')
    .replaceAll('href="about-us.html"', 'href="/about"')
    .replaceAll('href="contact-02.html"', 'href="/contact"')
    .replaceAll('href="login.html"', 'href="/login"')
    .replaceAll('href="register.html"', 'href="/register"')
    .replaceAll('href="wish-list.html"', 'href="/wishlist"')
    .replaceAll('href="shopping-cart.html"', 'href="/cart"')
    .replaceAll('href="checkout.html"', 'href="/checkout"')
    .replace(kind === "admin" ? /href="([a-z0-9-]+)\.html"/g : /$^/, (_match, page) => {
      if (page === "index") return 'href="/admin"';
      return `href="/admin/${page}"`;
    })
    .replace(kind === "admin" ? /href="\.\.\/index\.html"/g : /$^/, 'href="/"');
}

export function ExactTemplatePage({ file, kind = "storefront" }: { file: string; kind?: TemplateKind }) {
  const folder = kind === "storefront" ? "modave" : "admin-modave";
  const filePath = path.join(process.cwd(), "reference", folder, file);
  const html = cycleProducts(applyFileData(rewriteHtml(extractBody(fs.readFileSync(filePath, "utf8")), kind), file));
  const scriptBase = kind === "storefront" ? "/template/storefront/js" : "/template/admin/js";

  return (
    <>
      {styleMap[kind].map((style) => (
        <link key={`${kind}-${style}`} rel="stylesheet" href={`/${kind === "storefront" ? "template/storefront" : "template/admin"}/${style}`} />
      ))}
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {scriptMap[kind].map((script) => (
        <Script key={`${kind}-${script}`} src={`${scriptBase}/${script}`} strategy="afterInteractive" />
      ))}
    </>
  );
}
