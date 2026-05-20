"use client";

import Link from "next/link";
import { Fragment } from "react";
import {
  buildStorefrontPageHref,
  type StorefrontPaginationQuery,
} from "@/lib/pagination-utils";

export type { StorefrontPaginationQuery };
export {
  buildStorefrontPageHref,
  paginationRangeLabel,
} from "@/lib/pagination-utils";

type StorefrontPaginationProps = {
  basePath: string;
  page: number;
  totalPages: number;
  query?: StorefrontPaginationQuery;
  /** e.g. "Showing 1–24 of 50 products" */
  summary?: string;
  className?: string;
};

export function StorefrontPagination({
  basePath,
  page,
  totalPages,
  query = {},
  summary,
  className = "",
}: StorefrontPaginationProps) {
  if (totalPages <= 1) return null;

  const hrefFor = (item: number) =>
    buildStorefrontPageHref(basePath, item, query);
  const pages = Array.from(
    new Set([
      1,
      Math.max(1, page - 1),
      page,
      Math.min(totalPages, page + 1),
      totalPages,
    ]),
  )
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b);

  return (
    <div
      className={`sarjan-pagination-wrap${className ? ` ${className}` : ""}`}
    >
      {summary ? (
        <p className="sarjan-pagination-summary text-secondary text-center mb_16">
          {summary}
        </p>
      ) : null}
      <ul className="wg-pagination justify-content-center sarjan-pagination">
        {page > 1 ? (
          <li>
            <Link
              href={hrefFor(page - 1)}
              className="pagination-item text-button"
              aria-label="Previous page"
            >
              <i className="icon-arrLeft" />
            </Link>
          </li>
        ) : null}
        {pages.map((item, index) => (
          <Fragment key={item}>
            {index > 0 && item - pages[index - 1] > 1 ? (
              <li>
                <div className="pagination-item text-button">...</div>
              </li>
            ) : null}
            <li className={item === page ? "active" : ""}>
              {item === page ? (
                <div className="pagination-item text-button">{item}</div>
              ) : (
                <Link
                  href={hrefFor(item)}
                  className="pagination-item text-button"
                >
                  {item}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
        {page < totalPages ? (
          <li>
            <Link
              href={hrefFor(page + 1)}
              className="pagination-item text-button"
              aria-label="Next page"
            >
              <i className="icon-arrRight" />
            </Link>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
