"use client";

import type { Product } from "@/data/mock";
import { useProductSizeGroup } from "@/hooks/useProductSizeGroup";
import { ProductDetailStickyAtcButton } from "./ProductDetailBuySection";
import { ProductSizeGroupPicker } from "./ProductSizeGroupPicker";

export function ProductDetailStickyAtcClient({
  product,
}: {
  product: Product;
}) {
  const { groups, selectedGroup, setSelectedGroup, sizeRun } =
    useProductSizeGroup(product);

  return (
    <div className="tf-sticky-atc-infos">
      <ProductSizeGroupPicker
        groups={groups}
        selectedGroup={selectedGroup}
        onSelect={setSelectedGroup}
        className="tf-sticky-atc-size-group"
        title="Size set"
      />
      <div className="tf-sticky-atc-size d-flex gap-12 align-items-center">
        <div className="tf-sticky-atc-infos-title text-title">Set:</div>
        <div
          className="text-caption-1 text-secondary"
          data-product-size-run-label
        >
          {sizeRun.join(" / ")}
        </div>
      </div>
      <div className="tf-sticky-atc-quantity d-flex gap-12 align-items-center">
        <div className="tf-sticky-atc-infos-title text-title">Sets:</div>
        <div className="wg-quantity style-1">
          <span className="btn-quantity minus-btn">-</span>
          <input type="text" name="number" defaultValue={1} />
          <span className="btn-quantity plus-btn">+</span>
        </div>
      </div>
      <div className="tf-sticky-atc-btns">
        <ProductDetailStickyAtcButton product={product} sizeRun={sizeRun} />
      </div>
    </div>
  );
}
