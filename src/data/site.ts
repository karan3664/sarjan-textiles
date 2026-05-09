const asset = (file: string) => `/sarjan-assets/${file}`;

export const siteSettings = {
  domain: "sarjantextiles.com",
  brandName: "Sarjan Textiles",
  legalName: "Sarjan Textiles",
  logo: asset("sarjan-logo-full.png"),
  logoIcon: asset("sarjan-logo-icon.png"),
  favicon: asset("sarjan-favicon-192.png"),
  email: "info@sarjantextiles.com",
  salesEmail: "sales@sarjantextiles.com",
  ordersEmail: "orders@sarjantextiles.com",
  phone: "+91 98765 43210",
  address: "Surat, Gujarat, India",
  creditTermDays: 90,
  footerNote: "Premium textile collections for wholesalers, boutiques, and growing retail partners.",
  seo: {
    title: "Sarjan Textiles | B2B Textile Ordering Platform",
    description:
      "Explore Sarjan Textiles collections, place B2B orders, track dispatches, and manage 90-day credit workflows.",
  },
};

export const navigation = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
