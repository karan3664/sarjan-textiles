/** Client-facing order lists: newest first. */
export function sortOrdersNewestFirst<T extends { createdAt: string }>(
  orders: T[],
): T[] {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
