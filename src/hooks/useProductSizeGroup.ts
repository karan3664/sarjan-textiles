"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import { FULL_SIZE_RUN } from "@/lib/cart-client";
import {
  productSizeRunForGroup,
  resolveProductSizeGroups,
  SIZE_GROUP_LABELS,
  type SizeGroupId,
} from "@/lib/size-groups";

const SIZE_GROUP_EVENT = "sarjan-pdp-size-group";

export function useProductSizeGroup(product: Pick<Product, "slug" | "sizes">) {
  const groups = useMemo(
    () => resolveProductSizeGroups(product.sizes, FULL_SIZE_RUN),
    [product.sizes],
  );

  const [selectedGroup, setSelectedGroupState] = useState<SizeGroupId>(
    groups.defaultGroup,
  );

  useEffect(() => {
    setSelectedGroupState(groups.defaultGroup);
  }, [product.slug, groups.defaultGroup]);

  useEffect(() => {
    const onExternal = (event: Event) => {
      const detail = (
        event as CustomEvent<{ slug: string; group: SizeGroupId }>
      ).detail;
      if (detail?.slug === product.slug && detail.group) {
        setSelectedGroupState(detail.group);
      }
    };
    window.addEventListener(SIZE_GROUP_EVENT, onExternal);
    return () => window.removeEventListener(SIZE_GROUP_EVENT, onExternal);
  }, [product.slug]);

  const setSelectedGroup = useCallback(
    (group: SizeGroupId) => {
      setSelectedGroupState(group);
      window.dispatchEvent(
        new CustomEvent(SIZE_GROUP_EVENT, {
          detail: { slug: product.slug, group },
        }),
      );
    },
    [product.slug],
  );

  const sizeRun = useMemo(
    () => productSizeRunForGroup(product.sizes, selectedGroup, FULL_SIZE_RUN),
    [product.sizes, selectedGroup],
  );

  return {
    groups,
    selectedGroup,
    setSelectedGroup,
    sizeRun,
    labels: SIZE_GROUP_LABELS,
  };
}
