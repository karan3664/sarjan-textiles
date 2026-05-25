"use client";

import { useCallback, useState } from "react";

export type FaqItem = readonly [string, string];

export function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));

  const toggle = useCallback((index: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  return (
    <div className="accordion-product-wrap style-faqs sarjan-faqs-accordion">
      {items.map(([title, text], index) => {
        const isOpen = open.has(index);
        return (
          <div className="accordion-product-item" key={title}>
            <div
              className={`accordion-title${isOpen ? "" : " collapsed"}`}
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              aria-controls={`faq-${index}`}
              onClick={() => toggle(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggle(index);
                }
              }}
            >
              <h5 className="faqs-title">{title}</h5>
              <span className="btn-open-sub" aria-hidden />
            </div>
            <div
              id={`faq-${index}`}
              className="sarjan-faq-panel"
              hidden={!isOpen}
            >
              <div className="accordion-faqs-content text-secondary">
                {text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
