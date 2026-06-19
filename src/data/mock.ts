export type Product = {
  id: string;
  slug: string;
  /** Previous URLs kept for lookup + 301 redirects after SEO slug migration. */
  legacySlugs?: string[];
  name: string;
  sku: string;
  category: string;
  categoryPath?: string[];
  categoryLevel1?: string;
  categoryLevel2?: string;
  categoryLevel3?: string;
  fabric: string;
  price: number;
  moq: number;
  stock: number;
  reserved: number;
  sold: number;
  returned?: number;
  damaged?: number;
  colors: string[];
  sizes: string[];
  /** Available full sets for S–XXL group (per color). */
  stockRegularSets?: number;
  /** Available full sets for 3XL–5XL group (per color). */
  stockPlusSets?: number;
  images: string[];
  /** Ordered frames for drag-to-spin 360° view (8–36 images). */
  spin360Images?: string[];
  /** High-res fabric texture close-up for swatch zoom / AR preview. */
  fabricSwatchImage?: string;
  imageAlt?: string;
  description: string;
  care: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  variants?: Array<{
    sku: string;
    color: string;
    size: string;
    price: number;
    stock: number;
  }>;
  pricingRules?: Array<{ minQty: number; price: number }>;
  publicPrice?: number;
  effectivePrice?: number;
  pricingSource?: "public" | "client_custom" | "client_discount";
  clientDiscountPercentage?: number;
  isFeatured?: boolean;
  /** Highlight in new-arrivals rails (app + storefront). */
  isNewArrival?: boolean;
  /** Highlight in best-seller rails (app + storefront). */
  isBestSeller?: boolean;
  /** Admin: timed wholesale deal — original price stays in `price` until deal ends. */
  dealEnabled?: boolean;
  /** ISO datetime when deal expires. */
  dealEndsAt?: string;
  /** Wholesale unit price while deal is active (must be lower than `price`). */
  dealPrice?: number;
  /** Computed at read time (API responses). */
  dealActive?: boolean;
  dealOriginalPrice?: number;
  /** When false, hidden from catalog browse and cannot be ordered. */
  catalogActive?: boolean;
  /** Legacy alias for `catalogActive`. */
  active?: boolean;
  /** When set, only matching client tiers may purchase. */
  dealerTiers?: Array<"standard" | "premium" | "dealer">;
  /** Optional admin note (storefront uses unified unavailable copy). */
  unavailableReason?: string;
  /** Computed at read time (API responses). */
  available?: boolean;
  /** Storefront card star rating (defaults to 4 when omitted). */
  rating?: number;
  ratingCount?: number;
};

const asset = (file: string) => {
  const keepOriginal =
    file.startsWith("sarjan-logo") ||
    file.startsWith("sarjan-favicon") ||
    file.includes("Logo Final");
  return `/sarjan-assets/${keepOriginal ? file : file.replace(/\.(png|jpg|jpeg)$/i, ".webp")}`;
};

/** Single-line HQ for footer, contact, JSON-LD, and map “directions” fallback. */
export const sarjanRegisteredAddress =
  "Sarjan Textiles, Ground Floor, Jyoti Chambers - Rajniketan, New Station Rd, Dharanagar Kodki, Old Dhatia Falia, Bhuj, Gujarat 370001";

export const sarjanDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(sarjanRegisteredAddress)}`;

import { defaultAuthBanners } from "@/lib/auth-banner-defaults";
import {
  defaultHeaderNavigation,
  legacyNavigation,
} from "@/lib/header-navigation";
import { defaultAccountNavigation } from "@/lib/account-navigation";

export const siteSettings = {
  /** India GST identification number (invoices / compliance). */
  gstin: "24JXPPK2159M2ZQ",
  domain: "sarjantextiles.com",
  brandName: "Sarjan Textiles",
  legalName: "Sarjan Textiles",
  logo: asset("sarjan-logo-full.png"),
  logoIcon: asset("sarjan-logo-full.png"),
  favicon: asset("sarjan-favicon-192.png"),
  email: "info@sarjantextiles.com",
  /** Deprecated on storefront contact; kept for CMS / older snapshots. */
  salesEmail: "",
  ordersEmail: "info@sarjantextiles.com",
  phone: "+91 7567428100",
  address: sarjanRegisteredAddress,
  /** Google Maps “Directions” deep link (editable in Admin → Home CMS). */
  directionsUrl: sarjanDirectionsUrl,
  openTimeWeekday: "Mon - Sat: 10:00am - 7:00pm IST",
  openTimeSunday: "Sunday: By appointment",
  creditTermDays: 30,
  platformFee: {
    enabled: false,
    amountInr: 10,
    gstRate: 0.18,
    label: "Platform Fee",
  },
  shipping: {
    enabled: true,
    amountPer100Pieces: 500,
  },
  footerNote:
    "Premium textile collections for wholesalers, boutiques, and growing retail partners.",
  footerInfoHeading: "Information",
  footerCustomerHeading: "Customer Services",
  footerNewsletterHeading: "Newsletter",
  footerNewsletterText:
    "B2B ordering with admin approval, MOQ planning, and dispatch tracking.",
  footerCredit: "Designed & Developed by Karan Digital Labs",
  facebookUrl: "https://www.facebook.com/share/1CbPStUvKP/",
  instagramUrl: "https://www.instagram.com/sarjantextiles/",
  linkedinUrl: "https://www.linkedin.com/company/sarjantextiles/",
  seo: {
    title: "Sarjan Textiles | B2B Textile Ordering Platform",
    description:
      "Explore Sarjan Textiles collections, place B2B orders, track dispatches, and manage 30-day credit workflows.",
  },
  /** Login / register / forgot side banners (CMS-editable, WebP + AVIF + blur). */
  authBanners: defaultAuthBanners,
  /** Top nav bar — reorder, hide, or link any page (Admin → Header menu). */
  headerNavigation: defaultHeaderNavigation,
  /** Account dropdown + sidebar links (Admin → Account menu). */
  accountNavigation: defaultAccountNavigation,
  /** Admin-managed palette for product create/edit color chips. */
  productColorMaster: [
    "Black",
    "Indigo",
    "Ivory",
    "Mustard",
    "Maroon",
    "Blue",
    "Peach",
    "Teal",
    "Red",
    "Brown",
    "Beige",
    "White",
    "Green",
  ],
};

export const navigation = legacyNavigation;

/** Footer “Information” column — includes pages not shown in the top nav. */
export const footerInformationLinks = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Collections", href: "/collections" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQs", href: "/faqs" },
  { label: "Inquiry", href: "/inquiry" },
  { label: "Certifications", href: "/certifications" },
  { label: "Process", href: "/process" },
  { label: "Blog", href: "/blog" },
];

const baseProducts: Product[] = [
  {
    id: "PRD-001",
    slug: "ajrak-black-shirt",
    name: "Ajrak Black Printed Shirt",
    sku: "SAR-SH-AJ-BLK",
    category: "Printed Shirts",
    fabric: "Cotton cambric",
    price: 680,
    moq: 24,
    stock: 420,
    reserved: 72,
    sold: 118,
    colors: ["Black", "Indigo", "Ivory"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    images: [
      asset("shirt-ajrak-black-studio.png"),
      asset("shirt-blue-block-studio.png"),
    ],
    description:
      "A rich black Ajrak-inspired shirt designed for boutique and wholesale buyers who need a strong festive print story.",
    care: "Gentle wash separately. Dry in shade.",
    isFeatured: true,
  },
  {
    id: "PRD-002",
    slug: "mustard-block-shirt",
    name: "Mustard Block Print Shirt",
    sku: "SAR-SH-MS-BLK",
    category: "Printed Shirts",
    fabric: "Cotton flex",
    price: 640,
    moq: 24,
    stock: 310,
    reserved: 48,
    sold: 96,
    colors: ["Mustard", "Maroon", "Blue"],
    sizes: ["S", "M", "L", "XL"],
    images: [
      asset("shirt-mustard-block-studio.png"),
      asset("shirt-ivory-red-blue-studio.png"),
    ],
    description:
      "A warm mustard block print shirt made for everyday retail shelves and repeat wholesale orders.",
    care: "Machine wash cold. Use mild detergent.",
    isFeatured: true,
  },
  {
    id: "PRD-003",
    slug: "blue-floral-kurta",
    name: "Blue Floral Kurta",
    sku: "SAR-KU-BL-FLR",
    category: "Kurtas",
    fabric: "Rayon cotton blend",
    price: 820,
    moq: 18,
    stock: 260,
    reserved: 40,
    sold: 132,
    colors: ["Blue", "Peach", "Teal"],
    sizes: ["M", "L", "XL", "XXL"],
    images: [
      asset("kurta-blue-floral-studio.png"),
      asset("kurta-peach-floral-studio.png"),
    ],
    description:
      "A polished floral kurta range with soft handfeel, clean finishing, and high repeat demand.",
    care: "Hand wash recommended. Iron inside out.",
    isFeatured: true,
  },
  {
    id: "PRD-004",
    slug: "teal-star-grid-kurta",
    name: "Teal Star Grid Kurta",
    sku: "SAR-KU-TL-GRD",
    category: "Kurtas",
    fabric: "Cotton slub",
    price: 790,
    moq: 18,
    stock: 380,
    reserved: 66,
    sold: 101,
    colors: ["Teal", "Black", "Beige"],
    sizes: ["M", "L", "XL", "XXL"],
    images: [
      asset("kurta-teal-star-grid-studio.png"),
      asset("kurta-black-star-grid-studio.png"),
    ],
    description:
      "A crisp geometric kurta collection suitable for festive assortments and smart casual edits.",
    care: "Wash dark colors separately.",
    isFeatured: true,
  },
  {
    id: "PRD-005",
    slug: "red-medallion-kurta",
    name: "Red Medallion Kurta",
    sku: "SAR-KU-RD-MDL",
    category: "Kurtas",
    fabric: "Cotton rayon",
    price: 860,
    moq: 18,
    stock: 190,
    reserved: 34,
    sold: 144,
    colors: ["Red", "Maroon", "Brown"],
    sizes: ["M", "L", "XL", "XXL"],
    images: [
      asset("kurta-red-medallion-studio.png"),
      asset("kurta-maroon-small-motif-studio.png"),
    ],
    description:
      "A strong medallion print kurta for high-impact display, gifting, and occasion-led buying.",
    care: "Do not bleach. Dry in shade.",
  },
  {
    id: "PRD-006",
    slug: "beige-diamond-kurta",
    name: "Beige Diamond Kurta",
    sku: "SAR-KU-BG-DMD",
    category: "Kurtas",
    fabric: "Fine cotton",
    price: 760,
    moq: 18,
    stock: 335,
    reserved: 52,
    sold: 87,
    colors: ["Beige", "Brown", "Teal"],
    sizes: ["M", "L", "XL"],
    images: [
      asset("kurta-beige-diamond-studio.png"),
      asset("kurta-brown-blue-diamond-studio.png"),
    ],
    description:
      "A neutral diamond motif kurta that fits year-round core inventory and everyday wear selections.",
    care: "Steam iron on medium heat.",
  },
];

const kurtaImages = [
  asset("kurta-blue-floral-studio.png"),
  asset("kurta-teal-star-grid-studio.png"),
  asset("kurta-red-medallion-studio.png"),
  asset("kurta-beige-diamond-studio.png"),
  asset("kurta-black-star-grid-studio.png"),
  asset("kurta-brown-blue-diamond-studio.png"),
  asset("kurta-maroon-small-motif-studio.png"),
  asset("kurta-peach-floral-studio.png"),
  asset("kurta-red-diamond-studio.png"),
  asset("kurta-teal-diamond-studio.png"),
];

const shirtImages = [
  asset("shirt-ajrak-black-studio.png"),
  asset("shirt-mustard-block-studio.png"),
  asset("shirt-blue-block-studio.png"),
  asset("shirt-ivory-red-blue-studio.png"),
];

const palettes = [
  ["Indigo", "Ivory", "Black"],
  ["Maroon", "Beige", "Brown"],
  ["Teal", "Mustard", "White"],
  ["Navy", "Red", "Grey"],
  ["Green", "Cream", "Charcoal"],
];

const fabrics = [
  "Cotton cambric",
  "Cotton flex",
  "Rayon cotton blend",
  "Fine cotton",
  "Cotton slub",
  "Viscose cotton",
];
const printNames = [
  "Ajrak",
  "Bagru",
  "Block",
  "Floral",
  "Paisley",
  "Diamond",
  "Medallion",
  "Star Grid",
  "Buti",
  "Ikat",
];

const generatedProducts: Product[] = Array.from(
  { length: 1994 },
  (_, index) => {
    const n = index + 7;
    const isKurta = index % 2 === 0;
    const print = printNames[index % printNames.length];
    const color = palettes[index % palettes.length][0];
    const category = isKurta ? "Men's Kurtas" : "Men's Shirts";
    const imagePool = isKurta ? kurtaImages : shirtImages;
    const primaryImage = imagePool[index % imagePool.length];

    const categoryPart = isKurta ? "kurta" : "shirt";
    const patternPart = print.toLowerCase().replaceAll(" ", "-");
    const colorPart = color.toLowerCase().replaceAll(" ", "-");
    const slugBase = `${categoryPart}-${patternPart === "ajrak" ? "ajrakh" : patternPart}-${colorPart}`;

    return {
      id: `PRD-${String(n).padStart(4, "0")}`,
      slug: slugBase,
      name: `${color} ${print} ${isKurta ? "Men's Kurta" : "Men's Shirt"}`,
      sku: `SAR-${isKurta ? "KU" : "SH"}-${String(n).padStart(4, "0")}`,
      category,
      fabric: fabrics[index % fabrics.length],
      price: isKurta ? 720 + ((index * 17) % 480) : 520 + ((index * 13) % 360),
      moq: isKurta ? 18 : 24,
      stock: 80 + ((index * 29) % 920),
      reserved: (index * 7) % 160,
      sold: 20 + ((index * 11) % 430),
      colors: palettes[index % palettes.length],
      sizes: isKurta ? ["M", "L", "XL", "XXL"] : ["S", "M", "L", "XL", "XXL"],
      images: [primaryImage, imagePool[(index + 3) % imagePool.length]],
      description: `${category} mock catalog item for admin-managed Sarjan textile product data, MOQ ordering, stock tracking, and B2B approval flow.`,
      care: "Gentle wash separately. Dry in shade.",
      isFeatured: index < 10,
    };
  },
);

export const products: Product[] = [...baseProducts, ...generatedProducts];

export const home = {
  sections: [
    { id: "hero", type: "hero", title: "Hero Banner", enabled: true },
    {
      id: "categories",
      type: "categories",
      title: "Category Cards",
      enabled: true,
    },
    {
      id: "top-picks",
      type: "topPicks",
      title: "Featured Products",
      enabled: true,
    },
    { id: "marquee", type: "marquee", title: "Marquee Text", enabled: true },
    {
      id: "featured-product",
      type: "featuredProduct",
      title: "Product Feature",
      enabled: true,
    },
    {
      id: "trending-products",
      type: "trendingProducts",
      title: "Trending Products",
      enabled: true,
    },
    { id: "services", type: "services", title: "Service Icons", enabled: true },
    {
      id: "testimonials",
      type: "testimonials",
      title: "Testimonials",
      enabled: true,
    },
    { id: "gallery", type: "gallery", title: "Shop Gallery", enabled: true },
    { id: "brands", type: "brands", title: "Clients Slider", enabled: true },
  ],
  hero: {
    eyebrow: "Wholesale textile collections",
    title: "Premium prints ready for your next retail season",
    description:
      "Curated shirts, kurtas, and textile ranges with MOQ-based ordering, admin approval, dispatch tracking, and 30-day credit workflows.",
    primaryCta: { label: "Explore Catalog", href: "#catalog" },
    secondaryCta: { label: "Register as Client", href: "/register" },
    image: asset("banner-textiles-studio.png"),
    images: [
      asset("banner-textiles-studio.png"),
      asset("shirt-ajrak-black-studio.png"),
      asset("kurta-blue-floral-studio.png"),
    ],
    /** Muted autoplay video slides after banner images (optional). */
    videoEnabled: false,
    videoUrl: "",
    videoUrls: [] as string[],
  },
  banners: [
    {
      id: "banner-1",
      image: asset("banner-textiles-studio.png"),
      eyebrow: "Wholesale textile collections",
      title: "Premium prints ready for your next retail season",
      description:
        "Curated shirts, kurtas, and textile ranges with MOQ-based ordering, admin approval, dispatch tracking, and 30-day credit workflows.",
      ctaLabel: "Explore Catalog",
      ctaHref: "#catalog",
      actionType: "url",
      actionValue: "#catalog",
      enabled: true,
    },
    {
      id: "banner-2",
      image: asset("shirt-ajrak-black-studio.png"),
      eyebrow: "Printed shirts",
      title: "Ajrak & festive prints for retail shelves",
      description: "",
      ctaLabel: "Shop shirts",
      ctaHref: "/products",
      actionType: "url",
      actionValue: "/products",
      enabled: true,
    },
    {
      id: "banner-3",
      image: asset("kurta-blue-floral-studio.png"),
      eyebrow: "Kurtas",
      title: "Floral kurtas with wholesale MOQ",
      description: "",
      ctaLabel: "Browse kurtas",
      ctaHref: "/products",
      actionType: "url",
      actionValue: "/products",
      enabled: true,
    },
  ],
  highlights: [
    { value: "30", label: "Day credit cycle" },
    { value: "24+", label: "MOQ for shirts" },
    { value: "18+", label: "MOQ for kurtas" },
    { value: "100%", label: "Admin approved orders" },
  ],
  categories: [
    { name: "Printed Shirts", image: asset("category-printed-shirts.webp") },
    { name: "Kurtas", image: asset("category-kurtas.webp") },
    { name: "Festive Prints", image: asset("category-festive-prints.webp") },
  ],
  marqueeTop: [
    "Embrace Endless Possibilities",
    "Simplify Your Style Statement",
    "Embrace New Horizons",
  ],
  marqueeBottom: [
    "Redesign Your Path",
    "Craft Your Own Adventure",
    "Welcome Limitless Opportunities",
  ],
  /** Modave icon font class between marquee lines (e.g. icon-tshirt). */
  marqueeIcon: "icon-tshirt",
  /** Optional custom image URL; overrides marqueeIcon when set. */
  marqueeIconImage: "",
  trendingTitle: "Top Trending",
  trendingDescription:
    "Browse wholesale-ready Sarjan prints loved by retail buyers.",
  services: [
    {
      icon: "icon-ShoppingBagOpen",
      title: "Easy Ordering",
      body: "Manual cheque collection after approved credit cycle.",
    },
    {
      icon: "icon-shipping",
      title: "Dispatch Tracking",
      body: "Production, packing, dispatch, and delivery status.",
    },
    {
      icon: "icon-headset",
      title: "Sales Support",
      body: "Dedicated team support for repeat B2B buyers.",
    },
    {
      icon: "icon-sealCheck",
      title: "Admin Approval",
      body: "Every client and order goes through approval workflow.",
    },
  ],
  testimonials: [
    {
      author: "Aarav Ethnic Studio",
      quote:
        "Sarjan gives us consistent prints, clear MOQ planning, and reliable dispatch updates for seasonal buying.",
      product: "Ajrak Black Printed Shirt",
      price: "₹680",
      rating: 5,
      image: asset("shirt-ajrak-black-studio.png"),
      avatar: "/sarjan-assets/sarjan-favicon-192.png",
    },
    {
      author: "Nayra Boutique",
      quote:
        "The credit workflow and order history make repeat purchasing easier for our retail calendar.",
      product: "Blue Floral Kurta",
      price: "₹820",
      rating: 5,
      image: asset("kurta-blue-floral-studio.png"),
      avatar: "/sarjan-assets/sarjan-favicon-192.png",
    },
  ],
  galleryTitle: "Shop Instagram",
  galleryDescription: "Fresh textile stories from Sarjan collections.",
  partnerLogos: [
    "/template/storefront/images/brand/vanfaba.png",
    "/template/storefront/images/brand/anvouge.png",
    "/template/storefront/images/brand/carolin.png",
    "/template/storefront/images/brand/shangxi.png",
    "/template/storefront/images/brand/ecomife.png",
    "/template/storefront/images/brand/cheryl.png",
    "/template/storefront/images/brand/sopify.png",
    "/template/storefront/images/brand/pennyw.png",
    "/template/storefront/images/brand/panadoxn.png",
  ],
};

export const blogs = [
  {
    slug: "how-b2b-textile-buyers-plan-seasonal-assortments",
    title: "How B2B textile buyers plan seasonal assortments",
    excerpt:
      "A simple planning guide for building reliable print stories across shirts and kurtas.",
    image: asset("banner-textiles-studio.png"),
    date: "2026-05-08",
    content:
      "Retail-ready assortments work best when each print story has a hero product, a core repeat item, and a safe neutral option. Sarjan Textiles structures collections around MOQ, color families, and predictable dispatch stages so wholesale buyers can plan with confidence.",
  },
  {
    slug: "why-credit-workflows-matter-in-textile-orders",
    title: "Why credit workflows matter in textile orders",
    excerpt:
      "A clear order, dispatch, and outstanding-payment process reduces manual follow-up.",
    image: asset("shirt-ajrak-black-studio.png"),
    date: "2026-05-07",
    content:
      "A 30-day cheque cycle needs visibility. The platform records order approvals, dispatch movement, outstanding amounts, and client history so the sales and accounts team can coordinate without scattered spreadsheets.",
  },
];

export const pages = {
  about: {
    title: "Textile collections built for long-term B2B partners",
    body: "Sarjan Textiles supplies printed shirts, kurtas, and fabric-led collections to wholesale and retail partners. The platform is designed to make ordering, approval, dispatch, and credit tracking simple for both clients and the admin team.",
    image: asset("sarjan-logo-full.png"),
    history:
      "Sarjan Textiles grew from a textile-first business focused on reliable printed collections for wholesale and retail partners.",
    mission:
      "Make B2B textile ordering transparent, organized, and easy to operate from catalog to credit collection.",
    vision:
      "Build an ERP-ready textile business platform with strong catalog, dispatch, inventory, and client workflows.",
    infrastructure:
      "Admin-managed CMS, product catalog, inventory controls, dispatch tracking, credit ledger, and future integrations.",
  },
  contact: {
    title: "Connect with Sarjan Textiles",
    body: "Share your buying requirement, category interest, and preferred quantity. The Sarjan team will review your request and guide you through client approval.",
    image: asset("banner-textiles-studio.png"),
  },
};

export const clients = [
  {
    id: "CL-1001",
    name: "Aarav Ethnic Studio",
    city: "Ahmedabad",
    status: "Approved",
    outstanding: 58320,
  },
  {
    id: "CL-1002",
    name: "Vastra Retail Co.",
    city: "Surat",
    status: "Pending",
    outstanding: 0,
  },
  {
    id: "CL-1003",
    name: "Nayra Boutique",
    city: "Rajkot",
    status: "Approved",
    outstanding: 34100,
  },
];

export const orders = [
  {
    id: "ORD-2026-001",
    client: "Aarav Ethnic Studio",
    status: "In Production",
    total: 48960,
    items: 72,
    placedOn: "2026-05-08",
    creditDueOn: "2026-08-06",
  },
  {
    id: "ORD-2026-002",
    client: "Nayra Boutique",
    status: "Ready for Dispatch",
    total: 34100,
    items: 44,
    placedOn: "2026-05-07",
    creditDueOn: "2026-08-05",
  },
];

export const cart = {
  items: [
    {
      productSlug: "ajrak-black-shirt",
      quantity: 24,
      size: "L",
      color: "Black",
    },
    {
      productSlug: "blue-floral-kurta",
      quantity: 18,
      size: "XL",
      color: "Blue",
    },
  ],
};

export const dashboard = {
  summary: [
    {
      label: "Total Orders",
      value: "128",
      icon: "icon-clipboard-text",
      note: "42 this month",
    },
    {
      label: "Total Clients",
      value: "34",
      icon: "icon-users",
      note: "7 pending approval",
    },
    {
      label: "Outstanding Payments",
      value: "₹9.24L",
      icon: "icon-hand-coins",
      note: "30-day cheque cycle",
    },
    {
      label: "Ready Dispatch",
      value: "11",
      icon: "icon-send",
      note: "Packed / ready",
    },
  ],
  groups: [
    {
      title: "Orders",
      icon: "icon-clipboard-text",
      items: [
        { label: "Total Orders", value: "128" },
        { label: "Pending Orders", value: "18" },
        { label: "Approved Orders", value: "74" },
        { label: "Dispatch Pending", value: "11" },
        { label: "Completed Orders", value: "25" },
      ],
    },
    {
      title: "Clients",
      icon: "icon-users",
      items: [
        { label: "Total Clients", value: "34" },
        { label: "Active Clients", value: "27" },
        { label: "Pending Approval Clients", value: "7" },
      ],
    },
    {
      title: "Inventory",
      icon: "icon-package",
      items: [
        { label: "Low Stock", value: "9" },
        { label: "Out of Stock", value: "3" },
        { label: "Reserved Stock", value: "418 pcs" },
      ],
    },
    {
      title: "Finance",
      icon: "icon-dollar",
      items: [
        { label: "Outstanding Payments", value: "₹9.24L" },
        { label: "Overdue Payments", value: "₹1.38L" },
        { label: "Monthly Revenue", value: "₹14.8L" },
      ],
    },
    {
      title: "Website",
      icon: "icon-storefront",
      items: [
        { label: "Total Visitors", value: "8,420" },
        { label: "Inquiry Count", value: "63" },
        { label: "Contact Requests", value: "21" },
      ],
    },
  ],
  charts: {
    monthlyOrders: [
      { label: "Jan", value: 22 },
      { label: "Feb", value: 28 },
      { label: "Mar", value: 34 },
      { label: "Apr", value: 39 },
      { label: "May", value: 42 },
    ],
    productDemand: [
      { label: "Printed Shirts", value: 86 },
      { label: "Kurtas", value: 72 },
      { label: "Festive Prints", value: 58 },
      { label: "Ajrak Range", value: 46 },
    ],
    clientActivity: [
      { label: "Aarav Ethnic Studio", value: 31 },
      { label: "Nayra Boutique", value: 24 },
      { label: "Vastra Retail Co.", value: 18 },
      { label: "Kavya Retail", value: 14 },
    ],
    dispatchTrend: [
      { label: "Packed", value: 16 },
      { label: "Ready", value: 11 },
      { label: "Dispatched", value: 22 },
      { label: "Delivered", value: 25 },
    ],
  },
  recentOrders: [
    {
      id: "ORD-2026-001",
      client: "Aarav Ethnic Studio",
      date: "2026-05-08",
      total: "₹48,960",
      paymentStatus: "Pending",
      dispatchStatus: "In Production",
      approvalStatus: "Approved",
    },
    {
      id: "ORD-2026-002",
      client: "Nayra Boutique",
      date: "2026-05-07",
      total: "₹34,100",
      paymentStatus: "Pending",
      dispatchStatus: "Ready for Dispatch",
      approvalStatus: "Approved",
    },
    {
      id: "ORD-2026-003",
      client: "Vastra Retail Co.",
      date: "2026-05-06",
      total: "₹62,400",
      paymentStatus: "Not Started",
      dispatchStatus: "Pending",
      approvalStatus: "Pending",
    },
  ],
  alerts: [
    {
      label: "Ajrak Black Printed Shirt",
      detail: "Low stock: 42 pcs available, 72 reserved",
    },
    { label: "Teal Star Grid Kurta", detail: "Out of stock in XL / XXL" },
    { label: "Cheque collection", detail: "5 invoices due within next 7 days" },
  ],
};
