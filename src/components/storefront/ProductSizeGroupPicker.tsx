"use client";

import {
  SIZE_GROUP_LABELS,
  type ProductSizeGroups,
  type SizeGroupId,
} from "@/lib/size-groups";

type ProductSizeGroupPickerProps = {
  groups: ProductSizeGroups;
  selectedGroup: SizeGroupId;
  onSelect: (group: SizeGroupId) => void;
  className?: string;
  title?: string;
};

export function ProductSizeGroupPicker({
  groups,
  selectedGroup,
  onSelect,
  className,
  title = "Size set",
}: ProductSizeGroupPickerProps) {
  if (!groups.showPicker) return null;

  return (
    <div
      className={`tf-product-info-size-group mb_12${className ? ` ${className}` : ""}`}
    >
      <div className="title mb_12">{title}:</div>
      <div className="sarjan-size-group-actions sarjan-pdp-size-group">
        {groups.hasRegular ? (
          <button
            type="button"
            className={`tf-button style-1${selectedGroup === "regular" ? " is-active" : ""}`}
            aria-pressed={selectedGroup === "regular"}
            onClick={() => onSelect("regular")}
          >
            {SIZE_GROUP_LABELS.regular}
          </button>
        ) : null}
        {groups.hasPlus ? (
          <button
            type="button"
            className={`tf-button style-1${selectedGroup === "plus" ? " is-active" : ""}`}
            aria-pressed={selectedGroup === "plus"}
            onClick={() => onSelect("plus")}
          >
            {SIZE_GROUP_LABELS.plus}
          </button>
        ) : null}
      </div>
    </div>
  );
}
