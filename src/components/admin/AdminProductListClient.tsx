"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import { isProductPlaceholderImage } from "@/lib/product-placeholder-image";
import { AdminProductBulkEditPanel } from "@/components/admin/AdminProductBulkEditPanel";

type StatusFilter = "all" | "published" | "low" | "out";
type SortOption = "default" | "name" | "price" | "stock";

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function productStatus(product: Product) {
  if (product.stock <= 0)
    return {
      label: "Out of Stock",
      className: "type-inactive",
      filter: "out" as const,
    };
  if (product.stock - product.reserved <= product.moq)
    return {
      label: "Low Stock",
      className: "type-pending",
      filter: "low" as const,
    };
  return {
    label: "Publish",
    className: "type-completed",
    filter: "published" as const,
  };
}

export function AdminProductListClient({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortOption>("default");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.category))).sort(),
    [products],
  );

  const fabrics = useMemo(
    () =>
      Array.from(
        new Set(products.map((product) => product.fabric).filter(Boolean)),
      ).sort(),
    [products],
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        [product.name, product.sku, product.category, product.fabric].some(
          (value) => value.toLowerCase().includes(normalizedQuery),
        );
      const matchesCategory =
        category === "all" || product.category === category;
      const matchesStatus =
        status === "all" || productStatus(product).filter === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price") return b.price - a.price;
      if (sort === "stock") return b.stock - a.stock;
      return a.id.localeCompare(b.id);
    });
  }, [category, products, query, sort, status]);

  useEffect(() => {
    setPage(1);
    setSelectedSlugs([]);
  }, [category, pageSize, query, sort, status]);

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = visibleProducts.length ? (currentPage - 1) * pageSize : 0;
  const endIndex = Math.min(startIndex + pageSize, visibleProducts.length);
  const paginatedProducts = visibleProducts.slice(startIndex, endIndex);
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter(
    (item) =>
      item === 1 || item === totalPages || Math.abs(item - currentPage) <= 1,
  );

  const selectedSlugSet = useMemo(
    () => new Set(selectedSlugs),
    [selectedSlugs],
  );

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedSlugSet.has(product.slug)),
    [products, selectedSlugSet],
  );

  const pageSlugs = useMemo(
    () => paginatedProducts.map((product) => product.slug),
    [paginatedProducts],
  );
  const allPageSelected =
    pageSlugs.length > 0 &&
    pageSlugs.every((slug) => selectedSlugSet.has(slug));
  const somePageSelected = pageSlugs.some((slug) => selectedSlugSet.has(slug));

  const togglePageSelection = () => {
    if (allPageSelected) {
      setSelectedSlugs((current) =>
        current.filter((slug) => !pageSlugs.includes(slug)),
      );
      return;
    }
    setSelectedSlugs((current) =>
      Array.from(new Set([...current, ...pageSlugs])),
    );
  };

  const toggleProductSelection = (slug: string) => {
    setSelectedSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  };

  const clearSelection = () => {
    setSelectedSlugs([]);
  };

  const mergeUpdatedProducts = (updated: Product[]) => {
    if (!updated.length) return;
    const bySlug = new Map(updated.map((product) => [product.slug, product]));
    setProducts((current) =>
      current.map((product) => bySlug.get(product.slug) ?? product),
    );
    clearSelection();
  };

  const bulkDeleteProducts = async () => {
    if (!selectedProducts.length) return;
    const ok = window.confirm(
      `Delete ${selectedProducts.length} selected product${selectedProducts.length === 1 ? "" : "s"}? This cannot be undone.`,
    );
    if (!ok) return;

    setBulkDeleting(true);
    try {
      const deleted: string[] = [];
      for (const product of selectedProducts) {
        const res = await fetch(
          `/api/admin/cms/products?slug=${encodeURIComponent(product.slug)}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error(`Failed to delete ${product.name}`);
        deleted.push(product.slug);
      }
      setProducts((current) =>
        current.filter((product) => !deleted.includes(product.slug)),
      );
      clearSelection();
    } finally {
      setBulkDeleting(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    const ok = window.confirm(`Delete ${product.name}?`);
    if (!ok) return;
    setDeletingSlug(product.slug);
    try {
      const res = await fetch(
        `/api/admin/cms/products?slug=${encodeURIComponent(product.slug)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Delete failed");
      setProducts((current) =>
        current.filter((item) => item.slug !== product.slug),
      );
    } finally {
      setDeletingSlug(null);
    }
  };

  return (
    <>
      <div className="sarjan-home-kpi-grid sarjan-products-kpi-grid">
        {[
          ["Total Products", products.length, "icon-package"],
          [
            "Published",
            products.filter(
              (product) => productStatus(product).filter === "published",
            ).length,
            "icon-sealCheck",
          ],
          [
            "Low Stock",
            products.filter(
              (product) => productStatus(product).filter === "low",
            ).length,
            "icon-basket",
          ],
          [
            "Out of Stock",
            products.filter(
              (product) => productStatus(product).filter === "out",
            ).length,
            "icon-close",
          ],
        ].map(([label, value, icon]) => (
          <div className="sarjan-home-kpi-card" key={label}>
            <div className="sarjan-home-kpi-icon">
              <i className={String(icon)} />
            </div>
            <div>
              <div className="body-text text-secondary">{label}</div>
              <h5>{value}</h5>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-between gap14 items-center mb-24">
        <div>
          <div className="body-text text-secondary">
            Product catalog loaded from CMS/backend data.
          </div>
        </div>
        <Link
          href="/admin/products-create"
          className="tf-button text-btn-uppercase"
        >
          Create New Product
        </Link>
      </div>

      <div className="wg-box sarjan-products-list-box">
        <div className="box-top">
          <form
            className="form-search-2"
            onSubmit={(event) => event.preventDefault()}
          >
            <fieldset className="name">
              <input
                type="text"
                placeholder="Search by keyword"
                className="show-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </fieldset>
            <div className="button-submit">
              <button type="submit">
                <i className="icon-search-1 link" />
              </button>
            </div>
          </form>
          <div className="d-flex gap12 flex-wrap">
            <div className="tf-select">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="tf-select">
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as StatusFilter)
                }
              >
                <option value="all">All Status</option>
                <option value="published">Publish</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
            <div className="tf-select">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
              >
                <option value="default">Sort by Default</option>
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="stock">Stock</option>
              </select>
            </div>
          </div>
        </div>

        {selectedProducts.length > 0 ? (
          <div className="sarjan-products-bulk-bar">
            <div className="sarjan-products-bulk-bar__meta">
              <strong>{selectedProducts.length}</strong> selected
            </div>
            <div className="sarjan-products-bulk-bar__actions">
              <button
                type="button"
                className="tf-button text-btn-uppercase"
                onClick={() => setBulkEditOpen(true)}
              >
                Bulk edit
              </button>
              <button
                type="button"
                className="tf-button style-2 text-btn-uppercase btns-trash"
                disabled={bulkDeleting}
                onClick={() => void bulkDeleteProducts()}
              >
                {bulkDeleting ? "Deleting..." : "Delete selected"}
              </button>
              <button
                type="button"
                className="sarjan-products-bulk-bar__link"
                onClick={clearSelection}
              >
                Clear
              </button>
            </div>
          </div>
        ) : null}

        <div className="wg-table list-item-function sarjan-products-table">
          <table>
            <thead>
              <tr>
                <th className="sarjan-products-select-col">
                  <label className="tf-cart-checkbox sarjan-products-select-all">
                    <div className="tf-checkbox-wrapp">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate =
                              somePageSelected && !allPageSelected;
                          }
                        }}
                        onChange={togglePageSelection}
                        aria-label="Select all products on this page"
                      />
                      <div>
                        <i className="icon-check" />
                      </div>
                    </div>
                  </label>
                </th>
                <th className="text-title">ID</th>
                <th className="text-title">Product</th>
                <th className="text-title">Category</th>
                <th className="text-title">Amount</th>
                <th className="text-title">Status</th>
                <th className="text-title">Quantity</th>
                <th className="text-title">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => {
                const statusInfo = productStatus(product);
                const isSelected = selectedSlugSet.has(product.slug);
                return (
                  <tr
                    className={`tf-table-item item-row${isSelected ? " sarjan-products-row-selected" : ""}`}
                    key={product.id}
                  >
                    <td className="sarjan-products-select-col">
                      <label className="tf-cart-checkbox">
                        <div className="tf-checkbox-wrapp">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              toggleProductSelection(product.slug)
                            }
                            aria-label={`Select ${product.name}`}
                          />
                          <div>
                            <i className="icon-check" />
                          </div>
                        </div>
                      </label>
                    </td>
                    <td>{product.id}</td>
                    <td>
                      <li className="product-item type-1">
                        <div
                          className={`image rounded-circle sarjan-product-table-image${
                            isProductPlaceholderImage(product.images[0])
                              ? " sarjan-product-table-image--placeholder"
                              : ""
                          }`}
                        >
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className={
                              isProductPlaceholderImage(product.images[0])
                                ? "sarjan-product-img-placeholder"
                                : undefined
                            }
                          />
                        </div>
                        <div className="content">
                          <div className="text-title name text-line-clamp-1">
                            {product.name}
                          </div>
                          <div className="text-caption-1 sub">
                            {product.sku} / MOQ {product.moq}
                          </div>
                        </div>
                      </li>
                    </td>
                    <td>
                      <div className="text-title name text-line-clamp-1">
                        {product.category}
                      </div>
                      <div className="text-caption-1 sub">{product.fabric}</div>
                    </td>
                    <td>{formatInr(product.price)}</td>
                    <td>
                      <div
                        className={`box-status w-100 text-button ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </div>
                    </td>
                    <td className="text-end">
                      <div>{product.stock}</div>
                      <div className="text-caption-1 text-secondary">
                        Reserved {product.reserved}
                      </div>
                    </td>
                    <td>
                      <div className="sarjan-product-row-actions">
                        <Link
                          href={`/products/${product.slug}`}
                          className="hover-tooltips tf-btn-small"
                          target="_blank"
                        >
                          <i className="icon icon-eye" />
                          <span className="tooltips text-caption-1">
                            Frontend Preview
                          </span>
                        </Link>
                        <Link
                          href={`/admin/products-create?slug=${encodeURIComponent(product.slug)}`}
                          className="hover-tooltips tf-btn-small"
                        >
                          <i className="icon icon-edit" />
                          <span className="tooltips text-caption-1">Edit</span>
                        </Link>
                        <button
                          type="button"
                          className="hover-tooltips tf-btn-small btns-trash"
                          disabled={deletingSlug === product.slug}
                          onClick={() => deleteProduct(product)}
                        >
                          <i className="icon icon-trash" />
                          <span className="tooltips text-caption-1">
                            Delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleProducts.length && (
                <tr>
                  <td colSpan={8}>
                    <div className="body-text text-secondary p-4">
                      No products found.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {visibleProducts.length > pageSize ? (
          <div className="sarjan-products-pagination">
            <div className="body-text text-secondary">
              Showing <span>{startIndex + 1}</span>-<span>{endIndex}</span> of{" "}
              <span>{visibleProducts.length}</span> products
            </div>
            <div className="sarjan-products-pagination-actions">
              <div className="tf-select sarjan-products-page-size">
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                >
                  <option value={8}>8 / page</option>
                  <option value={12}>12 / page</option>
                  <option value={20}>20 / page</option>
                </select>
              </div>
              <button
                type="button"
                className="sarjan-products-page-btn"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <i className="icon icon-chevron-left" />
              </button>
              <div className="sarjan-products-page-list">
                {pageNumbers.map((pageNumber, index) => {
                  const previous = pageNumbers[index - 1];
                  return (
                    <span
                      className="sarjan-products-page-group"
                      key={pageNumber}
                    >
                      {previous && pageNumber - previous > 1 ? (
                        <span className="sarjan-products-page-ellipsis">
                          ...
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className={`sarjan-products-page-btn ${pageNumber === currentPage ? "active" : ""}`}
                        onClick={() => setPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    </span>
                  );
                })}
              </div>
              <button
                type="button"
                className="sarjan-products-page-btn"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
              >
                <i className="icon icon-chevron-right" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <AdminProductBulkEditPanel
        open={bulkEditOpen}
        selectedProducts={selectedProducts}
        categories={categories}
        fabrics={fabrics}
        onClose={() => setBulkEditOpen(false)}
        onApplied={mergeUpdatedProducts}
      />
    </>
  );
}
