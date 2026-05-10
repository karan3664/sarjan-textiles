import type { Product } from "@/data/mock";
import { productSetPrice } from "@/lib/product-pricing";
import { PriceGate } from "./PriceGate";

export function ModaveProductCard({ product, delay = "0s", className = "" }: { product: Product; delay?: string; className?: string }) {
  const hover = product.images[1] ?? product.images[0];
  const sizeRun = product.sizes.length ? product.sizes : ["M", "L", "XL"];

  return (
    <div className={`card-product wow fadeInUp${className ? ` ${className}` : ""}`} data-wow-delay={delay}>
      <div className="card-product-wrapper">
        <a href={`/products/${product.slug}`} className="product-img">
          <img className="lazyload img-product" data-src={product.images[0]} src={product.images[0]} alt={product.name} />
          <img className="lazyload img-hover" data-src={hover} src={hover} alt={product.name} />
        </a>
        <div className="list-product-btn">
          <a href="#" className="box-icon wishlist btn-icon-action" data-wishlist-toggle data-product-slug={product.slug}>
            <span className="icon icon-heart" />
            <span className="tooltip">Wishlist</span>
          </a>
          <a href="#compare" data-bs-toggle="offcanvas" aria-controls="compare" className="box-icon compare btn-icon-action" data-compare-add data-product-slug={product.slug}>
            <span className="icon icon-gitDiff" />
            <span className="tooltip">Compare</span>
          </a>
          <a href="#quickView" data-bs-toggle="modal" className="box-icon quickview tf-btn-loading" data-quick-view data-product-slug={product.slug}>
            <span className="icon icon-eye" />
            <span className="tooltip">Quick View</span>
          </a>
        </div>
        <div className="list-btn-main">
          <a
            href="#shoppingCart"
            data-bs-toggle="modal"
            className="btn-main-product"
            data-cart-add
            data-product-slug={product.slug}
            data-product-size-run={sizeRun.join(",")}
            data-product-color={product.colors[0]}
          >
            Add To cart
          </a>
        </div>
      </div>
      <div className="card-product-info">
        <a href={`/products/${product.slug}`} className="title link">{product.name}</a>
        <PriceGate amount={productSetPrice(product, product.colors[0], sizeRun)} suffix=" / set" />
        <div className="text-secondary small">1 set · {sizeRun.length} sizes · {product.fabric}</div>
      </div>
    </div>
  );
}
