"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import { readCart, sameCartLine, syncCartWithApi, type StoredCartItem, writeCart } from "@/lib/cart-client";
import { productSetPrice } from "@/lib/product-pricing";
import { PriceGate } from "./PriceGate";

type CartLine = StoredCartItem & {
  product: Product;
  setPrice: number;
  lineTotal: number;
};

export function CartPageClient() {
  const [cart, setCart] = useState<StoredCartItem[]>([]);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const cartKey = useMemo(() => JSON.stringify(cart), [cart]);

  useEffect(() => {
    const sync = () => {
      const next = readCart();
      setCart((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    };

    syncCartWithApi().then(sync).catch(sync);
    window.addEventListener("sarjan-cart-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sarjan-cart-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!cart.length) {
      setLines([]);
      setLoading(false);
      return;
    }

    const ids = Array.from(new Set(cart.map((item) => item.slug))).join(",");
    setLoading(true);
    fetch(`/api/catalog/products?ids=${encodeURIComponent(ids)}&limit=60`)
      .then((res) => res.json())
      .then((data) => {
        const bySlug = new Map<Product["slug"], Product>((data.items ?? []).map((product: Product) => [product.slug, product]));
        setLines(cart
          .map((item) => {
            const product = bySlug.get(item.slug);
            if (!product) return null;
            const setPrice = productSetPrice(product, item.color, item.sizes);
            return { ...item, product, setPrice, lineTotal: setPrice * item.quantity };
          })
          .filter(Boolean) as CartLine[]);
      })
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
  }, [cartKey]);

  const subtotal = useMemo(() => lines.reduce((sum, item) => sum + item.lineTotal, 0), [lines]);

  const updateQuantity = (item: CartLine, quantity: number) => {
    const nextQuantity = Math.max(1, quantity);
    writeCart(readCart().map((line) => (
      sameCartLine(line, item)
        ? { ...line, quantity: nextQuantity }
        : line
    )));
  };

  const removeItem = (item: CartLine) => {
    writeCart(readCart().filter((line) => !sameCartLine(line, item)));
  };

  return (
    <>
      <div className="page-title" style={{ backgroundImage: "url(/template/storefront/images/section/page-title.jpg)" }}>
        <div className="container">
          <h3 className="heading text-center">Shopping Cart</h3>
          <ul className="breadcrumbs d-flex align-items-center justify-content-center">
            <li><Link className="link" href="/">Homepage</Link></li>
            <li><i className="icon-arrRight" /></li>
            <li>Shopping Cart</li>
          </ul>
        </div>
      </div>
      <section className="flat-spacing">
        <div className="container">
          {loading ? (
            <div className="text-center py-5">Loading cart...</div>
          ) : lines.length ? (
            <div className="row">
              <div className="col-xl-8">
                <form>
                  <table className="tf-table-page-cart">
                    <thead><tr><th>Products</th><th>Price</th><th>Quantity</th><th>Total Price</th><th /></tr></thead>
                    <tbody>
                      {lines.map((item) => (
                        <tr className="tf-cart-item file-delete" key={`${item.slug}-${item.sizes.join("-")}-${item.color}`}>
                          <td className="tf-cart-item_product">
                            <Link href={`/products/${item.product.slug}`} className="img-box"><img src={item.product.images[0]} alt={item.product.name} /></Link>
                            <div className="cart-info">
                              <Link href={`/products/${item.product.slug}`} className="cart-title link">{item.product.name}</Link>
                              <div className="variant-box">
                                <div className="tf-select"><select value={item.color} onChange={() => undefined}>{item.product.colors.map((color) => <option key={color}>{color}</option>)}</select></div>
                                <div className="tf-select"><select value="Full set" onChange={() => undefined}><option>Full set</option></select></div>
                              </div>
                              <div className="text-caption-1 text-secondary mt_8">Set: {item.sizes.join(" / ")}</div>
                              <div className="text-caption-1 text-secondary">1 set = {item.sizes.length} pcs</div>
                            </div>
                          </td>
                          <td data-cart-title="Price" className="tf-cart-item_price text-center"><div className="cart-price text-button price-on-sale"><PriceGate amount={item.setPrice} compact /></div></td>
                          <td data-cart-title="Quantity" className="tf-cart-item_quantity">
                            <div className="wg-quantity mx-md-auto sarjan-cart-quantity">
                              <button type="button" className="btn-quantity btn-decrease" onClick={() => updateQuantity(item, item.quantity - 1)} aria-label="Decrease set quantity">-</button>
                              <input type="text" className="quantity-product" name="number" value={item.quantity} onChange={(event) => updateQuantity(item, Number(event.target.value) || 1)} />
                              <button type="button" className="btn-quantity btn-increase" onClick={() => updateQuantity(item, item.quantity + 1)} aria-label="Increase set quantity">+</button>
                            </div>
                          </td>
                          <td data-cart-title="Total" className="tf-cart-item_total text-center">
                            <div className="cart-total text-button total-price"><PriceGate amount={item.lineTotal} compact /></div>
                            <div className="text-caption-1 text-secondary">{item.quantity} set x <PriceGate amount={item.setPrice} compact /></div>
                          </td>
                          <td data-cart-title="Remove" className="remove-cart"><button type="button" className="sarjan-remove-cart" onClick={() => removeItem(item)} aria-label={`Remove ${item.product.name}`}>×</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="ip-discount-code">
                    <input type="text" placeholder="Add voucher discount" />
                    <button className="tf-btn" type="button"><span className="text">Apply Code</span></button>
                  </div>
                  <div className="group-discount">
                    {["SARJANMOQ", "B2BCREDIT", "TEXTILE10"].map((code, index) => (
                      <div className={index === 1 ? "box-discount active" : "box-discount"} key={code}>
                        <div className="discount-top">
                          <div className="discount-off"><div className="text-caption-1">B2B</div><span className="sale-off text-btn-uppercase">MOQ</span></div>
                          <div className="discount-from"><p className="text-caption-1">For approved<br />wholesale orders</p></div>
                        </div>
                        <div className="discount-bot"><span className="text-btn-uppercase">{code}</span><button className="tf-btn" type="button"><span className="text">Apply Code</span></button></div>
                      </div>
                    ))}
                  </div>
                </form>
              </div>
              <div className="col-xl-4">
                <div className="fl-sidebar-cart">
                  <div className="box-order bg-surface">
                    <h5 className="title">Order Summary</h5>
                    <div className="subtotal text-button d-flex justify-content-between align-items-center"><span>Subtotal</span><PriceGate amount={subtotal} className="total" compact /></div>
                    <div className="discount text-button d-flex justify-content-between align-items-center"><span>Discounts</span><PriceGate amount={0} className="total" compact /></div>
                    <h5 className="total-order d-flex justify-content-between align-items-center"><span>Total</span><PriceGate amount={subtotal} className="total" compact /></h5>
                    <div className="box-progress-checkout">
                      <fieldset className="check-agree">
                        <input type="checkbox" id="check-agree" className="tf-check-rounded" defaultChecked />
                        <label htmlFor="check-agree">I agree with the <a href="/term-of-use">terms and conditions</a></label>
                      </fieldset>
                      <div className="d-grid gap-2 mb_12">
                        <Link href="/login" className="tf-btn btn-fill radius-4"><span className="text">Login</span></Link>
                        <Link href="/register" className="tf-btn btn-reset radius-4"><span className="text">Sign Up</span></Link>
                      </div>
                      <a href="/checkout" className="tf-btn btn-reset">Process To Checkout</a>
                      <p className="text-button text-center">Or continue shopping</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-5">
              <h5>Your cart is empty</h5>
              <p className="text-secondary mt_8">Add products to create an order request.</p>
              <div className="d-flex gap10 flex-wrap justify-content-center mt_24">
                <Link href="/login" className="tf-btn btn-reset radius-4"><span className="text">Login</span></Link>
                <Link href="/register" className="tf-btn btn-fill radius-4"><span className="text">Sign Up</span></Link>
                <Link href="/products" className="tf-btn btn-fill radius-4"><span className="text">Browse Products</span></Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
