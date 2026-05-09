export const COMPARE_KEY = "sarjan-compare";
export const MAX_COMPARE_ITEMS = 3;

export function readCompare(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COMPARE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_COMPARE_ITEMS) : [];
  } catch {
    return [];
  }
}

export function writeCompare(slugs: string[]) {
  const unique = Array.from(new Set(slugs.filter(Boolean))).slice(0, MAX_COMPARE_ITEMS);
  window.localStorage.setItem(COMPARE_KEY, JSON.stringify(unique));
  window.dispatchEvent(new CustomEvent("sarjan-compare-updated"));
  return unique;
}

export function addCompare(slug: string) {
  return writeCompare([slug, ...readCompare().filter((item) => item !== slug)]);
}

export function removeCompare(slug: string) {
  return writeCompare(readCompare().filter((item) => item !== slug));
}
