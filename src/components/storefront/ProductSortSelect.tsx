"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ProductSortSelectInner({
  value,
  labels,
  basePath,
}: {
  value: string;
  labels: Record<string, string>;
  basePath: string;
}) {
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
          const query = params.toString();
          window.location.assign(query ? `${basePath}?${query}` : basePath);
        }}
      >
        {Object.entries(labels).map(([optionValue, label]) => (
          <option value={optionValue} key={optionValue}>
            {label}
          </option>
        ))}
      </select>
      <span className="icon icon-arrow-down" aria-hidden="true" />
    </div>
  );
}

export function ProductSortSelect({
  value,
  labels,
  basePath = "/products",
}: {
  value: string;
  labels: Record<string, string>;
  basePath?: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="sarjan-sort-select">
          <select aria-label="Sort products" value={value} disabled>
            {Object.entries(labels).map(([optionValue, label]) => (
              <option value={optionValue} key={optionValue}>
                {label}
              </option>
            ))}
          </select>
          <span className="icon icon-arrow-down" aria-hidden="true" />
        </div>
      }
    >
      <ProductSortSelectInner
        value={value}
        labels={labels}
        basePath={basePath}
      />
    </Suspense>
  );
}
