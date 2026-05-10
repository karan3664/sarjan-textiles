"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import type { CmsProductFilterGroup, CmsProductFilterOption, CmsProductFilterType } from "@/lib/cms-store";

type SaveState = "idle" | "saving" | "saved" | "error";

const filterTypes: Array<{ type: CmsProductFilterType; label: string; param: string }> = [
  { type: "category", label: "Categories", param: "category" },
  { type: "fabric", label: "Fabric Type", param: "fabric" },
  { type: "color", label: "Colors", param: "color" },
  { type: "size", label: "Sizes", param: "size" },
  { type: "stock", label: "Availability", param: "stock" },
  { type: "price", label: "Price", param: "price" },
];

function slugValue(value: string) {
  return value.toLowerCase().trim().replace(/['’]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function uniqueOptions(values: string[]): CmsProductFilterOption[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))
    .map((label) => ({ id: slugValue(label), label, value: slugValue(label), enabled: true }));
}

function valuesForType(type: CmsProductFilterType, products: Product[]) {
  if (type === "category") return uniqueOptions(products.map((product) => product.category));
  if (type === "fabric") return uniqueOptions(products.map((product) => product.fabric));
  if (type === "color") return uniqueOptions(products.flatMap((product) => product.colors));
  if (type === "size") return uniqueOptions(products.flatMap((product) => product.sizes));
  if (type === "stock") {
    return [
      { id: "in-stock", label: "In Stock", value: "in-stock", enabled: true },
      { id: "low-stock", label: "Low Stock", value: "low-stock", enabled: true },
      { id: "out-of-stock", label: "Out of Stock", value: "out-of-stock", enabled: true },
    ];
  }
  return [];
}

function blankFilter(type: CmsProductFilterType, products: Product[]): CmsProductFilterGroup {
  const meta = filterTypes.find((item) => item.type === type) ?? filterTypes[0];
  const id = `${type}-${Date.now().toString(36)}`;
  const maxPrice = Math.ceil(Math.max(...products.map((product) => product.price), 1000) / 100) * 100;
  return {
    id,
    type,
    title: meta.label,
    param: type === "custom" ? id : meta.param,
    enabled: true,
    options: type === "price" ? [] : valuesForType(type, products),
    min: type === "price" ? 0 : undefined,
    max: type === "price" ? maxPrice : undefined,
  };
}

function mergeSyncedOptions(current: CmsProductFilterOption[], synced: CmsProductFilterOption[]) {
  const currentMap = new Map(current.map((option) => [option.value, option]));
  return synced.map((option) => currentMap.get(option.value) ?? option);
}

export function AdminProductFiltersClient({ initialFilters, products }: { initialFilters: CmsProductFilterGroup[]; products: Product[] }) {
  const [filters, setFilters] = useState<CmsProductFilterGroup[]>(initialFilters);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [newType, setNewType] = useState<CmsProductFilterType>("category");

  const stats = useMemo(() => ({
    total: filters.length,
    visible: filters.filter((filter) => filter.enabled).length,
    values: filters.reduce((sum, filter) => sum + filter.options.filter((option) => option.enabled).length, 0),
  }), [filters]);

  const updateFilter = (index: number, patch: Partial<CmsProductFilterGroup>) => {
    setFilters((current) => current.map((filter, itemIndex) => (itemIndex === index ? { ...filter, ...patch } : filter)));
  };

  const updateOption = (filterIndex: number, optionIndex: number, patch: Partial<CmsProductFilterOption>) => {
    setFilters((current) => current.map((filter, itemIndex) => {
      if (itemIndex !== filterIndex) return filter;
      return {
        ...filter,
        options: filter.options.map((option, valueIndex) => {
          if (valueIndex !== optionIndex) return option;
          const label = patch.label ?? option.label;
          return { ...option, ...patch, value: patch.label ? slugValue(label) : patch.value ?? option.value };
        }),
      };
    }));
  };

  const addOption = (filterIndex: number) => {
    setFilters((current) => current.map((filter, itemIndex) => {
      if (itemIndex !== filterIndex) return filter;
      const label = "New value";
      return {
        ...filter,
        options: [...filter.options, { id: `${slugValue(label)}-${Date.now().toString(36)}`, label, value: slugValue(label), enabled: true }],
      };
    }));
  };

  const removeOption = (filterIndex: number, optionIndex: number) => {
    setFilters((current) => current.map((filter, itemIndex) => (
      itemIndex === filterIndex ? { ...filter, options: filter.options.filter((_, valueIndex) => valueIndex !== optionIndex) } : filter
    )));
  };

  const syncFilter = (index: number) => {
    setFilters((current) => current.map((filter, itemIndex) => {
      if (itemIndex !== index || filter.type === "custom" || filter.type === "price") return filter;
      return { ...filter, options: mergeSyncedOptions(filter.options, valuesForType(filter.type, products)) };
    }));
  };

  const moveFilter = (index: number, direction: -1 | 1) => {
    setFilters((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productFilters: filters }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Filter save failed");
      setFilters(data.productFilters ?? filters);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2200);
    } catch (error) {
      console.error(error);
      setSaveState("error");
    }
  };

  return (
    <div className="sarjan-admin-page">
      <div className="sarjan-home-summary-grid">
        {[
          ["Filter Groups", stats.total],
          ["Visible Groups", stats.visible],
          ["Visible Values", stats.values],
        ].map(([label, value]) => (
          <div className="wg-box sarjan-home-summary-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card sarjan-filter-editor-card">
        <div className="sarjan-filter-toolbar">
          <div>
            <h5>Product Filters</h5>
            <div className="body-text text-secondary">Frontend products page reads these filters from CMS/backend.</div>
          </div>
          <div className="sarjan-filter-toolbar-actions">
            <select value={newType} onChange={(event) => setNewType(event.target.value as CmsProductFilterType)}>
              {filterTypes.map((item) => <option value={item.type} key={item.type}>{item.label}</option>)}
            </select>
            <button type="button" className="tf-button style-1" onClick={() => setFilters((current) => [...current, blankFilter(newType, products)])}>Add Filter</button>
            <button type="button" className="tf-button" onClick={save} disabled={saveState === "saving"}>{saveState === "saving" ? "Saving..." : "Save Filters"}</button>
          </div>
        </div>
        {saveState === "saved" ? <div className="sarjan-save-success mb-20">Saved. Frontend filters updated.</div> : null}
        {saveState === "error" ? <div className="sarjan-save-error mb-20">Save failed.</div> : null}

        <div className="sarjan-filter-builder">
          {filters.map((filter, index) => (
            <div className="sarjan-filter-builder-card" key={filter.id}>
              <div className="sarjan-filter-builder-head">
                <label className="tf-cart-checkbox sarjan-filter-switch">
                  <input type="checkbox" className="tf-check" checked={filter.enabled} onChange={(event) => updateFilter(index, { enabled: event.target.checked })} />
                  <span>{filter.enabled ? "Visible" : "Hidden"}</span>
                </label>
                <div className="sarjan-filter-card-title">
                  <strong>{filter.title}</strong>
                  <span>{filter.type === "price" ? "Price range" : `${filter.options.length} values`}</span>
                </div>
                <div className="flex gap8">
                  <button type="button" className="tf-button style-1" onClick={() => moveFilter(index, -1)}>Up</button>
                  <button type="button" className="tf-button style-1" onClick={() => moveFilter(index, 1)}>Down</button>
                  <button type="button" className="tf-button style-1" onClick={() => setFilters((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Delete</button>
                </div>
              </div>
              <div className="cols gap22">
                <fieldset>
                  <div className="body-title mb-10">Filter title</div>
                  <input value={filter.title} onChange={(event) => updateFilter(index, { title: event.target.value })} />
                </fieldset>
                <fieldset>
                  <div className="body-title mb-10">Type</div>
                  <select
                    value={filter.type}
                    onChange={(event) => {
                      const type = event.target.value as CmsProductFilterType;
                      const next = blankFilter(type, products);
                      updateFilter(index, { type, title: next.title, param: next.param, options: next.options, min: next.min, max: next.max });
                    }}
                  >
                    {filterTypes.map((item) => <option value={item.type} key={item.type}>{item.label}</option>)}
                  </select>
                </fieldset>
              </div>
              {filter.type === "price" ? (
                <div className="cols gap22">
                  <fieldset>
                    <div className="body-title mb-10">Minimum price</div>
                    <input type="number" value={filter.min ?? 0} onChange={(event) => updateFilter(index, { min: Number(event.target.value) })} />
                  </fieldset>
                  <fieldset>
                    <div className="body-title mb-10">Maximum price</div>
                    <input type="number" value={filter.max ?? 0} onChange={(event) => updateFilter(index, { max: Number(event.target.value) })} />
                  </fieldset>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap justify-between gap14 items-center mt-20 mb-14">
                    <div className="body-title">Values</div>
                    <div className="flex gap8">
                      {filter.type !== "custom" ? <button type="button" className="tf-button style-1" onClick={() => syncFilter(index)}>Sync From Products</button> : null}
                      <button type="button" className="tf-button style-1" onClick={() => addOption(index)}>Add Value</button>
                    </div>
                  </div>
                  <div className="sarjan-filter-value-grid">
                    {filter.options.map((option, optionIndex) => (
                      <div className="sarjan-filter-value-row" key={option.id}>
                        <input value={option.label} onChange={(event) => updateOption(index, optionIndex, { label: event.target.value })} />
                        <code>{option.value}</code>
                        <label className="tf-cart-checkbox sarjan-filter-switch">
                          <input type="checkbox" className="tf-check" checked={option.enabled} onChange={(event) => updateOption(index, optionIndex, { enabled: event.target.checked })} />
                          <span>Show</span>
                        </label>
                        <button type="button" className="tf-button style-1" onClick={() => removeOption(index, optionIndex)}>Remove</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
