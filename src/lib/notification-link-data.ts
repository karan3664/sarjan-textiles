const PRODUCT_PATH = /^\/app\/product\/([^/?#]+)/i;
const ORDER_PATH = /\/order\/([^/?#]+)/i;

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
    const match = path.match(PRODUCT_PATH);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
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
    const match = path.match(ORDER_PATH);
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
  }
  const orderId = orderIdFromLinkUrl(linkUrl);
  if (orderId) {
    data.orderId = orderId;
  }
  return data;
}
