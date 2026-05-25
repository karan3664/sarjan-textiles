"use client";

import { useEffect } from "react";

const CTA_SELECTOR = [
  "#wrapper .sarjan-btn",
  "#wrapper a.sarjan-btn",
  "#wrapper button.sarjan-btn",
  "#wrapper .tf-btn",
  "#wrapper a.tf-btn",
  "#wrapper button.tf-btn",
  "#wrapper .btn-style-2",
  "#wrapper a.btn-style-2",
  "#wrapper button.btn-style-2",
  "#wrapper .btn-style-3",
  "#wrapper a.btn-style-3",
  "#wrapper button.btn-style-3",
  "#wrapper .btn-main-product",
  "#wrapper a.btn-main-product",
  "#wrapper .sarjan-add-set-btn",
  "#wrapper .sarjan-all-colors-btn",
  "#wrapper a.sarjan-add-set-btn",
  "#wrapper a.sarjan-all-colors-btn",
  ".modal .sarjan-add-set-btn",
  ".modal .sarjan-all-colors-btn",
  ".modal .sarjan-btn",
  ".modal .tf-btn",
  ".modal a.tf-btn",
  ".offcanvas .sarjan-btn",
  ".offcanvas .tf-btn",
].join(",");

const SKIP_SELECTOR =
  ".btn-line, .btn-close, .btn-quantity, .btn-decrease, .btn-increase, .tf-btn-remove, .tf-btn-filter, .subscribe-button, .sarjan-emoji-trigger, .sarjan-order-bot-launcher, .sarjan-order-bot-close, .sarjan-order-bot-send, .sarjan-order-bot-chip, [disabled], [aria-disabled='true']";

function findCta(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const el = target.closest(CTA_SELECTOR);
  if (!el || !(el instanceof HTMLElement)) return null;
  if (el.matches(SKIP_SELECTOR) || el.closest(SKIP_SELECTOR)) return null;
  if (el.closest(".sarjan-order-bot")) return null;
  return el;
}

/**
 * Adds .is-hovered for CSS when Modave :hover loses (specificity / touch / overlay).
 * Never sets inline styles — avoids the old blank-button bug on mouseout.
 */
export function SarjanButtonHoverFix() {
  useEffect(() => {
    const onEnter = (event: Event) => {
      const el = findCta(event.target);
      if (el) el.classList.add("is-hovered");
    };
    const onLeave = (event: Event) => {
      const el = findCta(event.target);
      if (!el) return;
      const related = (event as MouseEvent).relatedTarget;
      if (related instanceof Node && el.contains(related)) return;
      el.classList.remove("is-hovered");
    };
    document.addEventListener("pointerover", onEnter, true);
    document.addEventListener("pointerout", onLeave, true);
    document.addEventListener("mouseover", onEnter);
    document.addEventListener("mouseout", onLeave);
    return () => {
      document.removeEventListener("pointerover", onEnter, true);
      document.removeEventListener("pointerout", onLeave, true);
      document.removeEventListener("mouseover", onEnter);
      document.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return null;
}
