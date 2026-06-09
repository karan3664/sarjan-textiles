"use client";

import { useEffect, useId, useRef, useState } from "react";

export type EditorToolbarMenuOption = {
  value: string;
  label: string;
  style?: React.CSSProperties;
};

type Props = {
  menuId: string;
  ariaLabel: string;
  placeholder: string;
  value: string;
  options: EditorToolbarMenuOption[];
  onChange: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/** Custom list menu for TipTap toolbar — native <select> breaks inside the editor. */
export function AdminEditorToolbarMenu({
  menuId,
  ariaLabel,
  placeholder,
  value,
  options,
  onChange,
  onOpenChange,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = () => setOpen(false);
    const onDocumentMouseDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);
  const display = selected?.label || placeholder;

  return (
    <div
      ref={rootRef}
      className={`sarjan-editor-toolbar-menu${open ? " is-open" : ""}${className ? ` ${className}` : ""}`}
      data-toolbar-menu={menuId}
    >
      <button
        type="button"
        className="sarjan-editor-toolbar-menu-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onMouseDown={(event) => {
          // Keep TipTap text selection; native select + preventDefault breaks the picker.
          event.preventDefault();
          setOpen((current) => !current);
        }}
      >
        <span
          className="sarjan-editor-toolbar-menu-value"
          style={selected?.style}
        >
          {display}
        </span>
        <span className="sarjan-editor-toolbar-menu-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul
          id={listId}
          className="sarjan-editor-toolbar-menu-list"
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option) => (
            <li key={option.value || option.label} role="none">
              <button
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`sarjan-editor-toolbar-menu-option${value === option.value ? " is-active" : ""}`}
                style={option.style}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
