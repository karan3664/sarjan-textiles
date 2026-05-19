"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import { readWishlist, writeWishlist } from "@/lib/wishlist-client";
import { ModaveProductCard } from "./ModaveProductCard";

function WishlistPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <ul className="wg-pagination justify-content-center">
      {Array.from({ length: totalPages }).map((_, index) => {
        const nextPage = index + 1;
        return (
          <li className={nextPage === page ? "active" : ""} key={nextPage}>
            <a
              href={`/wishlist?page=${nextPage}`}
              className="pagination-item text-button"
            >
              {nextPage}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function WishlistPageClient({ page = 1 }: { page?: number }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const perPage = 24;

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
        setProducts(
          slugs.map((slug) => bySlug.get(slug)).filter(Boolean) as Product[],
        );
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slugs]);

  const totalPages = Math.max(1, Math.ceil(products.length / perPage));
  const currentPage = Number.isFinite(page)
    ? Math.min(Math.max(Math.floor(page), 1), totalPages)
    : 1;
  const visibleProducts = useMemo(
    () => products.slice((currentPage - 1) * perPage, currentPage * perPage),
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
        <Link href="/products" className="tf-btn btn-fill radius-4 mt_16">
          <span className="text">Browse Products</span>
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
          className="tf-btn btn-white has-border radius-4"
          onClick={clearWishlist}
        >
          <span className="text">Clear wishlist</span>
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
      <WishlistPagination page={currentPage} totalPages={totalPages} />
    </>
  );
}
