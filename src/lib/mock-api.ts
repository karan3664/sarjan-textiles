import {
  blogs,
  cart,
  clients,
  dashboard,
  home,
  navigation,
  orders,
  pages,
  products,
  siteSettings,
} from "@/data/mock";

export const mockApi = {
  siteSettings,
  navigation,
  home,
  products,
  categories: Array.from(new Set(products.map((product) => product.category))).map((name) => ({
    name,
    count: products.filter((product) => product.category === name).length,
  })),
  cart,
  orders,
  blogs,
  pages,
  admin: {
    dashboard,
    products,
    orders,
    clients,
  },
};

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getBlogBySlug(slug: string) {
  return blogs.find((blog) => blog.slug === slug);
}

export function getCartItems() {
  return cart.items
    .map((item) => {
      const product = getProductBySlug(item.productSlug);
      return product ? { ...item, product, lineTotal: product.price * item.quantity } : null;
    })
    .filter(Boolean);
}
