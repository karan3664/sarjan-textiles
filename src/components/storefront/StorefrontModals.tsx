import Link from "next/link";
import { getCartItems, mockApi } from "@/lib/mock-api";
import { PriceGate } from "./PriceGate";
import { StorefrontProductImage } from "./StorefrontProductImage";

export function StorefrontModals() {
  const cartItems = getCartItems();
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item?.lineTotal ?? 0),
    0,
  );

  return (
    <>
      <div
        className="modal fade modal-search"
        id="searchModal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0">Search catalog</h5>
              <button
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              />
            </div>
            <input
              className="sarjan-form-control mb-4"
              placeholder="Search products, fabric, SKU"
            />
            <div className="row g-3">
              {mockApi.products.slice(0, 3).map((product) => (
                <div key={product.id} className="col-4">
                  <Link
                    href={`/products/${product.slug}`}
                    className="text-decoration-none text-dark"
                  >
                    <StorefrontProductImage
                      src={product.images[0]}
                      alt={product.name}
                      className="w-100 rounded mb-2"
                    />
                    <small className="fw-bold">{product.name}</small>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="modal fullRight fade"
        id="cartModal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-scrollable modal-lg ms-auto me-0 my-0 h-100">
          <div className="modal-content h-100 rounded-0">
            <div className="modal-header">
              <h5 className="modal-title">Order cart</h5>
              <button
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              />
            </div>
            <div className="modal-body">
              <div className="d-grid gap-3">
                {cartItems.map((item) =>
                  item ? (
                    <div
                      key={`${item.productSlug}-${item.size}`}
                      className="d-flex gap-3 border-bottom pb-3"
                    >
                      <StorefrontProductImage
                        src={item.product.images[0]}
                        alt={item.product.name}
                        variant="thumb"
                        className="object-fit-cover rounded"
                      />
                      <div className="flex-grow-1">
                        <div className="fw-bold">{item.product.name}</div>
                        <div className="sarjan-muted small">
                          {item.color} / {item.size} / Qty {item.quantity}
                        </div>
                        <div className="sarjan-price mt-2">
                          <PriceGate amount={item.lineTotal} compact />
                        </div>
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            </div>
            <div className="modal-footer d-grid gap-2">
              <div className="d-flex justify-content-between w-100 fw-bold">
                <span>Subtotal</span>
                <PriceGate amount={subtotal} compact />
              </div>
              <Link className="sarjan-btn w-100" href="/cart">
                View Cart
              </Link>
              <Link className="sarjan-btn secondary w-100" href="/checkout">
                Place Order Request
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
