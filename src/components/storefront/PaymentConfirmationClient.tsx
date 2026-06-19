"use client";

import { celebrateOrderPlaced } from "@/lib/order-celebration";
import {
  B2B_ORDER_SUCCESS_BODY,
  B2B_ORDER_SUCCESS_TITLE,
} from "@/lib/b2b-order-messages";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";

type PaymentConfirmationClientProps = {
  orderId?: string;
};

export function PaymentConfirmationClient({
  orderId,
}: PaymentConfirmationClientProps) {
  const celebrationStarted = useRef(false);

  useEffect(() => {
    if (celebrationStarted.current) return;
    celebrationStarted.current = true;
    let celebrationCleanup: (() => void) | undefined;
    let delayTimer: number | undefined;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        delayTimer = window.setTimeout(() => {
          celebrationCleanup = celebrateOrderPlaced();
        }, 80);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (delayTimer !== undefined) {
        window.clearTimeout(delayTimer);
      }
      celebrationCleanup?.();
    };
  }, []);

  return (
    <section className="flat-spacing sarjan-payment-confirmation">
      <div className="container">
        <div className="sarjan-payment-confirmation-card payment-confirm-wrap text-center">
          <div
            className="sarjan-payment-success-icon"
            role="img"
            aria-label="Order submitted successfully"
          >
            <i className="icon icon-check" aria-hidden />
          </div>
          <h3 className="sarjan-payment-confirmation-title">
            {B2B_ORDER_SUCCESS_TITLE}
          </h3>
          <div className="sarjan-payment-confirmation-lead text-secondary">
            {B2B_ORDER_SUCCESS_BODY.map((line) => (
              <p key={line} className="mb_6">
                {line}
              </p>
            ))}
          </div>
          {orderId ? (
            <p className="sarjan-payment-order-id">
              <span className="sarjan-payment-order-id__label">Order ID</span>
              <span className="sarjan-payment-order-id__value">{orderId}</span>
            </p>
          ) : null}
          <div className="sarjan-payment-confirmation-actions">
            <Link
              href="/my-account-orders"
              className={withBtnIcon("tf-btn btn-fill radius-4 w-100")}
            >
              <TfButtonIcon icon="icon-ShoppingBagOpen">
                View Orders
              </TfButtonIcon>
            </Link>
            <Link
              href="/products"
              className={withBtnIcon(
                "tf-btn btn-white has-border radius-4 w-100",
              )}
            >
              <TfButtonIcon icon="icon-arrRight">
                Continue Shopping
              </TfButtonIcon>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
