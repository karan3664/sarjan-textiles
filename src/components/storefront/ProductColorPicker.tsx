"use client";

import type { CSSProperties } from "react";
import { productColorHex } from "@/lib/product-color-swatch";

type ProductColorPickerProps = {
  colors: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Quick view / PDP use round template swatches; cards use list layout elsewhere. */
  variant?: "template" | "list";
  maxVisible?: number;
};

export function ProductColorPicker({
  colors,
  selectedIndex,
  onSelect,
  variant = "template",
  maxVisible = 8,
}: ProductColorPickerProps) {
  const visible = colors.slice(0, maxVisible);
  const active = colors[selectedIndex] ?? colors[0] ?? "Default";

  if (variant === "list") {
    return (
      <ul className="list-color-product mt_8">
        {visible.map((color, index) => (
          <li
            className={`list-color-item color-swatch${index === selectedIndex ? " active line" : ""}`}
            key={color}
            onClick={() => onSelect(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(index);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Color ${color}`}
            aria-pressed={index === selectedIndex}
          >
            <span className="d-none text-capitalize color-filter">{color}</span>
            <span
              className="swatch-value sarjan-color-swatch-fill"
              style={
                {
                  "--sarjan-swatch": productColorHex(color),
                } as CSSProperties
              }
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="variant-picker-item">
      <div className="variant-picker-label mb_12">
        Colors:
        <span className="text-title variant-picker-label-value value-currentColor">
          {active}
        </span>
      </div>
      <div className="variant-picker-values variant-color sarjan-variant-colors">
        {visible.map((color, index) => {
          const hex = productColorHex(color);
          const swatchStyle = {
            "--sarjan-swatch": hex,
          } as CSSProperties;
          return (
            <button
              type="button"
              className={`sarjan-color-swatch-btn hover-tooltip tooltip-bot radius-60 color-btn${index === selectedIndex ? " active line" : ""}`}
              data-value={color}
              data-color={color.toLowerCase()}
              key={`${color}-${index}`}
              style={swatchStyle}
              aria-label={`Select color ${color}`}
              aria-pressed={index === selectedIndex}
              onClick={() => onSelect(index)}
            >
              <span className="btn-checkbox sarjan-color-swatch-fill" />
              <span className="tooltip">{color}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
