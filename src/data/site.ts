const asset = (file: string) => `/sarjan-assets/${file}`;

const sarjanRegisteredAddress =
  "Sarjan Textiles, First Floor, Jyoti Chambers - Rajniketan, New Station Rd, Dharanagar Kodki, Old Dhatia Falia, Bhuj, Gujarat 370001";

const sarjanDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sarjanRegisteredAddress)}`;

export const siteSettings = {
  domain: "sarjantextiles.com",
  brandName: "Sarjan Textiles",
  legalName: "Sarjan Textiles",
  logo: asset("sarjan-logo-full.png"),
  logoIcon: asset("sarjan-logo-icon.png"),
  favicon: asset("sarjan-favicon-192.png"),
  email: "info@sarjantextiles.com",
  salesEmail: "",
  ordersEmail: "info@sarjantextiles.com",
  phone: "+91 7567428100",
  address: sarjanRegisteredAddress,
  directionsUrl: sarjanDirectionsUrl,
  openTimeWeekday: "Mon - Sat: 10:00am - 7:00pm IST",
  openTimeSunday: "Sunday: By appointment",
  creditTermDays: 90,
  footerNote:
    "Premium textile collections for wholesalers, boutiques, and growing retail partners.",
  seo: {
    title: "Sarjan Textiles | B2B Textile Ordering Platform",
    description:
      "Explore Sarjan Textiles collections, place B2B orders, track dispatches, and manage 90-day credit workflows.",
  },
};

export const navigation = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Collections", href: "/collections" },
  { label: "Process", href: "/process" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
