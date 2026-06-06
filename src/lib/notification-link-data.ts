const APP_PRODUCT_PATH = /^\/app\/product\/([^/?#]+)/i;
const WEB_PRODUCT_PATH = /^\/products\/([^/?#]+)/i;

const RESERVED_PRODUCT_LISTING_SLUGS = new Set(["shirts", "kurtas", "jackets"]);

function decodeRef(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function refFromPathname(pathname: string): string | null {
  const appMatch = pathname.match(APP_PRODUCT_PATH);
  if (appMatch?.[1]) {
    return decodeRef(appMatch[1]);
  }

  const webMatch = pathname.match(WEB_PRODUCT_PATH);
  if (webMatch?.[1]) {
    const slug = decodeRef(webMatch[1]);
    if (!slug || RESERVED_PRODUCT_LISTING_SLUGS.has(slug.toLowerCase())) {
      return null;
    }
    return slug;
  }

  return null;
}

/** Extract product ref (id or slug) from a shared catalog URL. */
export function productRefFromLinkUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const path = trimmed.includes("://")
      ? new URL(trimmed).pathname
      : trimmed.startsWith("/")
        ? trimmed
        : `/${trimmed}`;
    return refFromPathname(path);
  } catch {
    return null;
  }
}

export function orderIdFromLinkUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const path = trimmed.includes("://")
      ? new URL(trimmed).pathname
      : trimmed.startsWith("/")
        ? trimmed
        : `/${trimmed}`;
    const match = path.match(/\/order\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/** FCM data keys the mobile app reads for deep links. */
export function notificationDataFromLinkUrl(
  linkUrl: string,
): Record<string, string> {
  const data: Record<string, string> = { url: linkUrl };
  const productId = productRefFromLinkUrl(linkUrl);
  if (productId) {
    data.productId = productId;
    data.type = "product";
  }
  const orderId = orderIdFromLinkUrl(linkUrl);
  if (orderId) {
    data.orderId = orderId;
  }
  return data;
}
