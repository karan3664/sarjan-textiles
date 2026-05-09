"use client";

import { useSearchParams } from "next/navigation";

export function ProductSortSelect({ value, labels }: { value: string; labels: Record<string, string> }) {
  const searchParams = useSearchParams();

  return (
    <div className="sarjan-sort-select">
      <select
        aria-label="Sort products"
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("sort", event.target.value);
          params.set("page", "1");
          window.location.assign(`/products?${params.toString()}`);
        }}
      >
        {Object.entries(labels).map(([optionValue, label]) => (
          <option value={optionValue} key={optionValue}>{label}</option>
        ))}
      </select>
      <span className="icon icon-arrow-down" aria-hidden="true" />
    </div>
  );
}
