"use client";

import Link from "next/link";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import {
  readWishlist,
  syncWishlistButtonStates,
  writeWishlist,
} from "@/lib/wishlist-client";
import { ModaveProductCard } from "./ModaveProductCard";
import { paginationRangeLabel } from "@/lib/pagination-utils";
import { StorefrontPagination } from "./StorefrontPagination";

const WISHLIST_PER_PAGE = 24;

export function WishlistPageClient({ page = 1 }: { page?: number }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sync = () => setSlugs(readWishlist());
    sync();
    window.addEventListener("sarjan-wishlist-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sarjan-wishlist-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!slugs.length) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(
      `/api/catalog/products?ids=${encodeURIComponent(slugs.join(","))}&limit=${slugs.length}`,
    )
      .then((res) => res.json())
      .then((data) => {
        const bySlug = new Map<Product["slug"], Product>(
          (data.items ?? []).map((product: Product) => [product.slug, product]),
        );
        const validSlugs = slugs.filter((slug) => bySlug.has(slug));
        if (validSlugs.length !== slugs.length) {
          writeWishlist(validSlugs);
        }
        setProducts(
          validSlugs
            .map((slug) => bySlug.get(slug))
            .filter(Boolean) as Product[],
        );
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slugs]);

  useEffect(() => {
    window.requestAnimationFrame(() =>
      syncWishlistButtonStates(products.length),
    );
  }, [products]);

  const totalPages = Math.max(
    1,
    Math.ceil(products.length / WISHLIST_PER_PAGE),
  );
  const currentPage = Number.isFinite(page)
    ? Math.min(Math.max(Math.floor(page), 1), totalPages)
    : 1;
  const visibleProducts = useMemo(
    () =>
      products.slice(
        (currentPage - 1) * WISHLIST_PER_PAGE,
        currentPage * WISHLIST_PER_PAGE,
      ),
    [products, currentPage],
  );

  const clearWishlist = () => writeWishlist([]);

  if (loading) {
    return <div className="text-center py-5">Loading wishlist...</div>;
  }

  if (!products.length) {
    return (
      <div className="text-center py-5">
        <h5>Your wishlist is empty</h5>
        <p className="text-secondary mt_8">Add products with heart icon.</p>
        <Link
          href="/products"
          className={withBtnIcon("tf-btn btn-fill radius-4 mt_16")}
        >
          <TfButtonIcon icon="icon-arrRight">Browse Products</TfButtonIcon>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb_32">
        <h5>{products.length} wishlisted products</h5>
        <button
          type="button"
          className={withBtnIcon("tf-btn btn-white has-border radius-4")}
          onClick={clearWishlist}
        >
          <TfButtonIcon icon="icon-close">Clear wishlist</TfButtonIcon>
        </button>
      </div>
      <div className="tf-grid-layout tf-col-2 lg-col-4">
        {visibleProducts.map((product, index) => (
          <ModaveProductCard
            product={product}
            delay={`${index / 10}s`}
            key={product.id}
          />
        ))}
      </div>
      <StorefrontPagination
        basePath="/wishlist"
        page={currentPage}
        totalPages={totalPages}
        summary={paginationRangeLabel(
          currentPage,
          WISHLIST_PER_PAGE,
          products.length,
          "products",
        )}
      />
    </>
  );
}
