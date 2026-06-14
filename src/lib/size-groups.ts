import { FULL_SIZE_RUN } from "@/lib/cart-client";

export type SizeGroupId = "regular" | "plus" | "free";

export const FREE_SIZE = "Free Size";
export const FREE_SIZE_RUN = [FREE_SIZE] as const;

export const SIZE_GROUP_ORDER: SizeGroupId[] = ["regular", "plus", "free"];

export const SIZE_GROUP_LABELS: Record<SizeGroupId, string> = {
  regular: "S to XXL",
  plus: "3XL to 5XL",
  free: "Free Size",
};

export const SIZE_GROUPS: Record<SizeGroupId, readonly string[]> = {
  regular: ["S", "M", "L", "XL", "XXL"],
  plus: ["3XL", "4XL", "5XL"],
  free: FREE_SIZE_RUN,
};

const DEPRECATED_SIZES = new Set(["XS"]);

export function isDeprecatedSize(size: string) {
  return DEPRECATED_SIZES.has(size.trim());
}

export function filterActiveSizes(sizes: string[]) {
  return sizes.filter((size) => !isDeprecatedSize(size));
}

export type ProductSizeGroups = {
  regular: string[];
  plus: string[];
  free: string[];
  hasRegular: boolean;
  hasPlus: boolean;
  hasFree: boolean;
  showPicker: boolean;
  defaultGroup: SizeGroupId;
};

function normalizeSize(size: string) {
  return size.trim();
}

export function sizesInGroup(
  productSizes: string[] | undefined,
  group: SizeGroupId,
  fallbackWhenEmpty: string[] = FULL_SIZE_RUN,
): string[] {
  const catalog = filterActiveSizes(
    productSizes?.length ? productSizes : fallbackWhenEmpty,
  );
  const catalogNorm = new Set(catalog.map(normalizeSize));
  const picked = SIZE_GROUPS[group].filter((size) =>
    catalogNorm.has(normalizeSize(size)),
  );
  if (picked.length) return [...picked];
  if (!productSizes?.length) {
    return SIZE_GROUPS[group].filter((size) =>
      fallbackWhenEmpty.includes(normalizeSize(size)),
    );
  }
  return [];
}

export function resolveProductSizeGroups(
  productSizes: string[] | undefined,
  fallbackWhenEmpty: string[] = FULL_SIZE_RUN,
): ProductSizeGroups {
  const regular = sizesInGroup(productSizes, "regular", fallbackWhenEmpty);
  const plus = sizesInGroup(productSizes, "plus", fallbackWhenEmpty);
  const free = sizesInGroup(productSizes, "free", fallbackWhenEmpty);
  const hasRegular = regular.length > 0;
  const hasPlus = plus.length > 0;
  const hasFree = free.length > 0;
  const activeGroupCount = [hasRegular, hasPlus, hasFree].filter(
    Boolean,
  ).length;
  const defaultGroup: SizeGroupId =
    hasFree && !hasRegular && !hasPlus
      ? "free"
      : hasRegular
        ? "regular"
        : hasPlus
          ? "plus"
          : hasFree
            ? "free"
            : "regular";

  return {
    regular,
    plus,
    free,
    hasRegular,
    hasPlus,
    hasFree,
    showPicker: activeGroupCount > 1,
    defaultGroup,
  };
}

export function productSizeRunForGroup(
  productSizes: string[] | undefined,
  group: SizeGroupId,
  fallbackWhenEmpty: string[] = FULL_SIZE_RUN,
): string[] {
  const resolved = resolveProductSizeGroups(productSizes, fallbackWhenEmpty);
  if (group === "free") {
    return resolved.free.length
      ? resolved.free
      : resolved.regular.length
        ? resolved.regular
        : resolved.plus;
  }
  if (group === "regular") {
    return resolved.regular.length
      ? resolved.regular
      : resolved.free.length
        ? resolved.free
        : resolved.plus;
  }
  return resolved.plus.length
    ? resolved.plus
    : resolved.regular.length
      ? resolved.regular
      : resolved.free;
}

/** Default set for catalog cards / quick add when the customer has not picked a group yet. */
export function defaultProductSizeRun(
  productSizes: string[] | undefined,
  fallbackWhenEmpty: string[] = FULL_SIZE_RUN,
): string[] {
  const { defaultGroup } = resolveProductSizeGroups(
    productSizes,
    fallbackWhenEmpty,
  );
  return productSizeRunForGroup(productSizes, defaultGroup, fallbackWhenEmpty);
}
