import Link from "next/link";
import type { Product } from "@/data/mock";
import { PriceGate } from "./PriceGate";

export function ProductCard({ product }: { product: Product }) {
  const sizeRun = product.sizes.length ? product.sizes : ["M", "L", "XL"];

  return (
    <article className="sarjan-card h-100">
      <Link href={`/products/${product.slug}`} className="sarjan-card-img d-block">
        <img src={product.images[0]} alt={product.name} />
      </Link>
      <div className="p-3">
        <div className="d-flex justify-content-between gap-2 mb-2">
          <span className="sarjan-muted small">{product.category}</span>
          <PriceGate amount={product.price * sizeRun.length} suffix=" / set" className="sarjan-price" compact />
        </div>
        <h5 className="mb-2">
          <Link href={`/products/${product.slug}`} className="text-decoration-none text-dark">
            {product.name}
          </Link>
        </h5>
        <div className="d-flex flex-wrap gap-2 mb-3">
          <span className="sarjan-pill">MOQ {product.moq}</span>
          <span className="sarjan-pill">{product.fabric}</span>
        </div>
        <button className="sarjan-btn w-100" data-bs-toggle="modal" data-bs-target="#cartModal">
          Add to Cart
        </button>
      </div>
    </article>
  );
}
