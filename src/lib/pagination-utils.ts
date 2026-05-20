export type StorefrontPaginationQuery = Record<string, string | undefined>;

export function buildStorefrontPageHref(
  basePath: string,
  page: number,
  query: StorefrontPaginationQuery = {},
) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function paginationRangeLabel(
  page: number,
  perPage: number,
  total: number,
  noun = "items",
) {
  if (!total) return "";
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  return `Showing ${start}–${end} of ${total} ${noun}`;
}
