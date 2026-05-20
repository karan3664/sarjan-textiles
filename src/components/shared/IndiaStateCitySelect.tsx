"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  INDIAN_STATES,
  findStateForCity,
  listCitiesForState,
} from "@/lib/india-locations";

type Layout = "cols" | "grid-2" | "stack" | "admin";

type IndiaStateCitySelectProps = {
  state: string;
  city: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  layout?: Layout;
  selectClassName?: string;
  stateRequired?: boolean;
  cityRequired?: boolean;
  disabled?: boolean;
  stateLabel?: string;
  cityLabel?: string;
};

type Option = { value: string; label: string };

function LocationCombobox({
  label,
  value,
  options,
  placeholder,
  onChange,
  required,
  disabled,
  searchable = true,
  triggerClassName = "text-title",
}: {
  label?: string;
  value: string;
  options: Option[];
  placeholder: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  triggerClassName?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedLabel =
    options.find((item) => item.value === value)?.label ?? "";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((item) => item.label.toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const showSearch = searchable && options.length > 6;

  return (
    <div
      ref={rootRef}
      className={`sarjan-location-select${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}`}
    >
      {label ? <div className="body-title mb-10">{label}</div> : null}
      <button
        type="button"
        className={`sarjan-location-select__trigger ${triggerClassName}`.trim()}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
      >
        <span
          className={
            selectedLabel
              ? "sarjan-location-select__value"
              : "sarjan-location-select__placeholder"
          }
        >
          {selectedLabel || placeholder}
        </span>
        <span className="sarjan-location-select__chevron" aria-hidden />
      </button>
      {required ? (
        <input
          tabIndex={-1}
          className="sarjan-location-select__native-required"
          value={value}
          required
          onChange={() => undefined}
          aria-hidden
        />
      ) : null}
      {open ? (
        <div
          className="sarjan-location-select__panel"
          id={listId}
          role="listbox"
        >
          {showSearch ? (
            <div className="sarjan-location-select__search-wrap">
              <input
                ref={searchRef}
                type="search"
                className="sarjan-location-select__search"
                placeholder="Search..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveIndex((index) =>
                      Math.min(index + 1, Math.max(filtered.length - 1, 0)),
                    );
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((index) => Math.max(index - 1, 0));
                  }
                  if (event.key === "Enter" && filtered[activeIndex]) {
                    event.preventDefault();
                    pick(filtered[activeIndex].value);
                  }
                }}
              />
            </div>
          ) : null}
          <ul className="sarjan-location-select__list">
            {filtered.length ? (
              filtered.map((option, index) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    className={`sarjan-location-select__option${option.value === value ? " is-selected" : ""}${index === activeIndex ? " is-active" : ""}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => pick(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            ) : (
              <li className="sarjan-location-select__empty">No matches</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function IndiaStateCitySelect({
  state,
  city,
  onStateChange,
  onCityChange,
  layout = "cols",
  selectClassName = "text-title",
  stateRequired,
  cityRequired,
  disabled,
  stateLabel,
  cityLabel,
}: IndiaStateCitySelectProps) {
  const cities = useMemo(() => listCitiesForState(state), [state]);

  useEffect(() => {
    if (!city.trim() || !state.trim()) return;
    if (
      !cities.some((item) => item.toLowerCase() === city.trim().toLowerCase())
    ) {
      onCityChange("");
    }
  }, [state, city, cities, onCityChange]);

  const stateOptions = INDIAN_STATES.map((name) => ({
    value: name,
    label: name,
  }));
  const cityOptions = cities.map((name) => ({ value: name, label: name }));

  const handleStateChange = (nextState: string) => {
    onStateChange(nextState);
    if (city && nextState) {
      const stillValid = listCitiesForState(nextState).some(
        (item) => item.toLowerCase() === city.trim().toLowerCase(),
      );
      if (!stillValid) onCityChange("");
    }
  };

  const stateField = (
    <LocationCombobox
      label={layout === "admin" ? (stateLabel ?? "State") : undefined}
      value={state}
      options={stateOptions}
      placeholder="Select state"
      onChange={handleStateChange}
      required={stateRequired}
      disabled={disabled}
      searchable
      triggerClassName={selectClassName}
    />
  );

  const cityField = (
    <LocationCombobox
      label={layout === "admin" ? (cityLabel ?? "City") : undefined}
      value={city}
      options={cityOptions}
      placeholder={state ? "Select city" : "Select state first"}
      onChange={onCityChange}
      required={cityRequired}
      disabled={disabled || !state}
      searchable
      triggerClassName={selectClassName}
    />
  );

  if (layout === "admin") {
    return (
      <div className="sarjan-location-select-row sarjan-location-select-row--admin">
        <fieldset className="sarjan-location-select-field">
          {stateField}
        </fieldset>
        <fieldset className="sarjan-location-select-field">
          {cityField}
        </fieldset>
      </div>
    );
  }

  if (layout === "grid-2") {
    return (
      <div className="grid-2 sarjan-location-select-row">
        <div className="sarjan-location-select-wrap">{stateField}</div>
        <div className="sarjan-location-select-wrap">{cityField}</div>
      </div>
    );
  }

  if (layout === "stack") {
    return (
      <div className="sarjan-location-select-row sarjan-location-select-row--stack">
        <div className="sarjan-location-select-wrap">{stateField}</div>
        <div className="sarjan-location-select-wrap">{cityField}</div>
      </div>
    );
  }

  return (
    <div className="cols sarjan-location-select-row sarjan-location-select-row--address">
      <fieldset className="sarjan-location-select-field">
        <div className="sarjan-location-select-wrap">{stateField}</div>
      </fieldset>
      <fieldset className="sarjan-location-select-field">
        <div className="sarjan-location-select-wrap">{cityField}</div>
      </fieldset>
    </div>
  );
}

/** Infer state when only city is known (profile / order backfill). */
export function inferIndianStateFromCity(city: string) {
  return findStateForCity(city);
}
