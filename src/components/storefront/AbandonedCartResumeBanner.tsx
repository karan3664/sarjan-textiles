"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartItemCount, readCart, syncCartWithApi } from "@/lib/cart-client";
import { readStoredClientId } from "@/lib/client-auth-browser";

const DISMISS_KEY = "sarjan-cart-resume-dismissed";

export function AbandonedCartResumeBanner() {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      const clientId = readStoredClientId();
      if (!clientId) {
        if (!cancelled) setVisible(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const resume = params.get("resume") === "cart";
      const cart = resume ? await syncCartWithApi() : readCart();
      const itemCount = cartItemCount(cart);
      if (!itemCount) {
        if (!cancelled) setVisible(false);
        return;
      }

      const fingerprint = `${clientId}:${JSON.stringify(cart)}`;
      const dismissed = window.sessionStorage.getItem(DISMISS_KEY);
      const show = resume || dismissed !== fingerprint;
      if (!cancelled) {
        setCount(itemCount);
        setVisible(show);
      }
    };

    void evaluate();
    window.addEventListener("sarjan-cart-updated", evaluate);
    window.addEventListener("sarjan-auth-updated", evaluate);
    return () => {
      cancelled = true;
      window.removeEventListener("sarjan-cart-updated", evaluate);
      window.removeEventListener("sarjan-auth-updated", evaluate);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    const clientId = readStoredClientId();
    const cart = readCart();
    const fingerprint = `${clientId}:${JSON.stringify(cart)}`;
    window.sessionStorage.setItem(DISMISS_KEY, fingerprint);
    setVisible(false);
  };

  return (
    <div className="sarjan-cart-resume-banner" role="status">
      <div className="container">
        <div className="sarjan-cart-resume-banner__inner">
          <p className="mb_0">
            <strong>{count}</strong> wholesale set{count === 1 ? "" : "s"} saved
            in your cart.
          </p>
          <div className="sarjan-cart-resume-banner__actions">
            <Link href="/checkout" className="tf-btn btn-fill radius-4">
              <span className="text">Resume checkout</span>
            </Link>
            <Link href="/shopping-cart" className="tf-btn btn-line radius-4">
              <span className="text">View cart</span>
            </Link>
            <button
              type="button"
              className="sarjan-cart-resume-banner__dismiss"
              onClick={dismiss}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
