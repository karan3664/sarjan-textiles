"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/data/mock";
import {
  emptyBulkProductPatch,
  patchHasEnabledFields,
  summarizeBulkPatch,
  type BulkProductPatch,
  type BulkNameMode,
  type BulkPriceMode,
  type BulkStockMode,
  type BulkTextMode,
  type BulkListMode,
} from "@/lib/bulk-product-patch";

type Props = {
  open: boolean;
  selectedProducts: Product[];
  categories: string[];
  fabrics: string[];
  onClose: () => void;
  onApplied: (products: Product[]) => void;
};

function FieldRow({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className={`sarjan-bulk-edit-field${enabled ? " is-enabled" : ""}`}>
      <label className="tf-cart-checkbox sarjan-bulk-edit-toggle">
        <div className="tf-checkbox-wrapp">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggle(event.target.checked)}
          />
          <div>
            <i className="icon-check" />
          </div>
        </div>
        <span className="sarjan-bulk-edit-field__label">{label}</span>
      </label>
      <div className="sarjan-bulk-edit-field__control">{children}</div>
    </div>
  );
}

export function AdminProductBulkEditPanel({
  open,
  selectedProducts,
  categories,
  fabrics,
  onClose,
  onApplied,
}: Props) {
  const [patch, setPatch] = useState<BulkProductPatch>(emptyBulkProductPatch());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPatch(emptyBulkProductPatch());
    setError(null);
  }, [open, selectedProducts]);

  const summary = useMemo(() => summarizeBulkPatch(patch), [patch]);
  const canSave = patchHasEnabledFields(patch) && selectedProducts.length > 0;

  const updatePatch = <K extends keyof BulkProductPatch>(
    key: K,
    value: BulkProductPatch[K],
  ) => {
    setPatch((current) => ({ ...current, [key]: value }));
  };

  const applyBulkUpdate = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cms/products/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slugs: selectedProducts.map((product) => product.slug),
          patch,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Bulk update failed");
      }
      onApplied(data.products ?? []);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="sarjan-bulk-edit-overlay" role="presentation">
      <button
        type="button"
        className="sarjan-bulk-edit-backdrop"
        aria-label="Close bulk editor"
        onClick={onClose}
      />
      <aside
        className="sarjan-bulk-edit-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sarjan-bulk-edit-title"
      >
        <div className="sarjan-bulk-edit-header">
          <div>
            <div className="text-caption-1 text-secondary">Bulk edit</div>
            <h4 id="sarjan-bulk-edit-title">
              Update {selectedProducts.length} product
              {selectedProducts.length === 1 ? "" : "s"}
            </h4>
          </div>
          <button
            type="button"
            className="sarjan-bulk-edit-close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="icon-close" />
          </button>
        </div>

        <div className="sarjan-bulk-edit-selected">
          <div className="sarjan-bulk-edit-selected__head">
            <span className="text-caption-1 text-secondary">
              Selected products
            </span>
            <span className="sarjan-bulk-edit-selected__count">
              {selectedProducts.length}
            </span>
          </div>
          <ul className="sarjan-bulk-edit-selected-list">
            {selectedProducts.map((product) => (
              <li className="sarjan-bulk-edit-selected-item" key={product.slug}>
                <span className="sarjan-bulk-edit-selected-item__id">
                  {product.id}
                </span>
                <span className="sarjan-bulk-edit-selected-item__name">
                  {product.name}
                </span>
                <span className="sarjan-bulk-edit-selected-item__sku">
                  {product.sku}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sarjan-bulk-edit-body">
          <section className="sarjan-bulk-edit-section">
            <h5>Catalog & visibility</h5>
            <FieldRow
              label="Product name"
              enabled={Boolean(patch.name?.enabled)}
              onToggle={(enabled) =>
                updatePatch("name", {
                  enabled,
                  value: patch.name?.value ?? "",
                  mode: patch.name?.mode ?? "replace",
                  find: patch.name?.find ?? "",
                })
              }
            >
              <div className="sarjan-bulk-edit-stack">
                <div className="tf-select">
                  <select
                    value={patch.name?.mode ?? "replace"}
                    disabled={!patch.name?.enabled}
                    onChange={(event) =>
                      updatePatch("name", {
                        enabled: true,
                        value: patch.name?.value ?? "",
                        mode: event.target.value as BulkNameMode,
                        find: patch.name?.find ?? "",
                      })
                    }
                  >
                    <option value="replace">Find & replace in name</option>
                    <option value="prepend">Add prefix</option>
                    <option value="append">Add suffix</option>
                    <option value="set">Set same name (all selected)</option>
                  </select>
                </div>
                {patch.name?.mode === "replace" ? (
                  <div className="sarjan-bulk-edit-inline">
                    <input
                      type="text"
                      placeholder="Find text"
                      disabled={!patch.name?.enabled}
                      value={patch.name?.find ?? ""}
                      onChange={(event) =>
                        updatePatch("name", {
                          enabled: true,
                          value: patch.name?.value ?? "",
                          mode: patch.name?.mode ?? "replace",
                          find: event.target.value,
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="Replace with"
                      disabled={!patch.name?.enabled}
                      value={patch.name?.value ?? ""}
                      onChange={(event) =>
                        updatePatch("name", {
                          enabled: true,
                          value: event.target.value,
                          mode: patch.name?.mode ?? "replace",
                          find: patch.name?.find ?? "",
                        })
                      }
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder={
                      patch.name?.mode === "prepend"
                        ? "Text to add before each name"
                        : patch.name?.mode === "append"
                          ? "Text to add after each name"
                          : "New product name for all selected"
                    }
                    disabled={!patch.name?.enabled}
                    value={patch.name?.value ?? ""}
                    onChange={(event) =>
                      updatePatch("name", {
                        enabled: true,
                        value: event.target.value,
                        mode: patch.name?.mode ?? "replace",
                        find: patch.name?.find ?? "",
                      })
                    }
                  />
                )}
              </div>
            </FieldRow>
            <FieldRow
              label="Category"
              enabled={Boolean(patch.category?.enabled)}
              onToggle={(enabled) =>
                updatePatch("category", {
                  enabled,
                  value: patch.category?.value ?? categories[0] ?? "",
                })
              }
            >
              <div className="tf-select">
                <select
                  value={patch.category?.value ?? ""}
                  disabled={!patch.category?.enabled}
                  onChange={(event) =>
                    updatePatch("category", {
                      enabled: true,
                      value: event.target.value,
                    })
                  }
                >
                  {categories.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </FieldRow>

            <FieldRow
              label="Fabric"
              enabled={Boolean(patch.fabric?.enabled)}
              onToggle={(enabled) =>
                updatePatch("fabric", {
                  enabled,
                  value: patch.fabric?.value ?? fabrics[0] ?? "",
                })
              }
            >
              <div className="tf-select">
                <select
                  value={patch.fabric?.value ?? ""}
                  disabled={!patch.fabric?.enabled}
                  onChange={(event) =>
                    updatePatch("fabric", {
                      enabled: true,
                      value: event.target.value,
                    })
                  }
                >
                  {fabrics.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </FieldRow>

            <FieldRow
              label="Storefront visibility"
              enabled={Boolean(patch.catalogActive?.enabled)}
              onToggle={(enabled) =>
                updatePatch("catalogActive", {
                  enabled,
                  value: patch.catalogActive?.value ?? true,
                })
              }
            >
              <div className="tf-select">
                <select
                  value={patch.catalogActive?.value ? "published" : "hidden"}
                  disabled={!patch.catalogActive?.enabled}
                  onChange={(event) =>
                    updatePatch("catalogActive", {
                      enabled: true,
                      value: event.target.value === "published",
                    })
                  }
                >
                  <option value="published">Published</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </FieldRow>

            <FieldRow
              label="Featured product"
              enabled={Boolean(patch.isFeatured?.enabled)}
              onToggle={(enabled) =>
                updatePatch("isFeatured", {
                  enabled,
                  value: patch.isFeatured?.value ?? false,
                })
              }
            >
              <div className="tf-select">
                <select
                  value={patch.isFeatured?.value ? "yes" : "no"}
                  disabled={!patch.isFeatured?.enabled}
                  onChange={(event) =>
                    updatePatch("isFeatured", {
                      enabled: true,
                      value: event.target.value === "yes",
                    })
                  }
                >
                  <option value="yes">Featured</option>
                  <option value="no">Not featured</option>
                </select>
              </div>
            </FieldRow>

            <FieldRow
              label="New arrival badge"
              enabled={Boolean(patch.isNewArrival?.enabled)}
              onToggle={(enabled) =>
                updatePatch("isNewArrival", {
                  enabled,
                  value: patch.isNewArrival?.value ?? false,
                })
              }
            >
              <div className="tf-select">
                <select
                  value={patch.isNewArrival?.value ? "yes" : "no"}
                  disabled={!patch.isNewArrival?.enabled}
                  onChange={(event) =>
                    updatePatch("isNewArrival", {
                      enabled: true,
                      value: event.target.value === "yes",
                    })
                  }
                >
                  <option value="yes">Show badge</option>
                  <option value="no">Remove badge</option>
                </select>
              </div>
            </FieldRow>

            <FieldRow
              label="Best seller badge"
              enabled={Boolean(patch.isBestSeller?.enabled)}
              onToggle={(enabled) =>
                updatePatch("isBestSeller", {
                  enabled,
                  value: patch.isBestSeller?.value ?? false,
                })
              }
            >
              <div className="tf-select">
                <select
                  value={patch.isBestSeller?.value ? "yes" : "no"}
                  disabled={!patch.isBestSeller?.enabled}
                  onChange={(event) =>
                    updatePatch("isBestSeller", {
                      enabled: true,
                      value: event.target.value === "yes",
                    })
                  }
                >
                  <option value="yes">Show badge</option>
                  <option value="no">Remove badge</option>
                </select>
              </div>
            </FieldRow>
          </section>

          <section className="sarjan-bulk-edit-section">
            <h5>Pricing & deals</h5>
            <FieldRow
              label="Wholesale price"
              enabled={Boolean(patch.price?.enabled)}
              onToggle={(enabled) =>
                updatePatch("price", {
                  enabled,
                  value: patch.price?.value ?? 0,
                  mode: patch.price?.mode ?? "set",
                })
              }
            >
              <div className="sarjan-bulk-edit-inline">
                <div className="tf-select">
                  <select
                    value={patch.price?.mode ?? "set"}
                    disabled={!patch.price?.enabled}
                    onChange={(event) =>
                      updatePatch("price", {
                        enabled: true,
                        value: patch.price?.value ?? 0,
                        mode: event.target.value as BulkPriceMode,
                      })
                    }
                  >
                    <option value="set">Set to</option>
                    <option value="increase_percent">Increase %</option>
                    <option value="decrease_percent">Decrease %</option>
                    <option value="increase_fixed">Increase ₹</option>
                    <option value="decrease_fixed">Decrease ₹</option>
                  </select>
                </div>
                <input
                  type="number"
                  min={0}
                  disabled={!patch.price?.enabled}
                  value={patch.price?.value ?? 0}
                  onChange={(event) =>
                    updatePatch("price", {
                      enabled: true,
                      value: Number(event.target.value),
                      mode: patch.price?.mode ?? "set",
                    })
                  }
                />
              </div>
            </FieldRow>

            <FieldRow
              label="MOQ"
              enabled={Boolean(patch.moq?.enabled)}
              onToggle={(enabled) =>
                updatePatch("moq", {
                  enabled,
                  value: patch.moq?.value ?? 12,
                })
              }
            >
              <input
                type="number"
                min={1}
                disabled={!patch.moq?.enabled}
                value={patch.moq?.value ?? 12}
                onChange={(event) =>
                  updatePatch("moq", {
                    enabled: true,
                    value: Number(event.target.value),
                  })
                }
              />
            </FieldRow>

            <FieldRow
              label="Deal status"
              enabled={Boolean(patch.dealEnabled?.enabled)}
              onToggle={(enabled) =>
                updatePatch("dealEnabled", {
                  enabled,
                  value: patch.dealEnabled?.value ?? false,
                })
              }
            >
              <div className="tf-select">
                <select
                  value={patch.dealEnabled?.value ? "on" : "off"}
                  disabled={!patch.dealEnabled?.enabled}
                  onChange={(event) =>
                    updatePatch("dealEnabled", {
                      enabled: true,
                      value: event.target.value === "on",
                    })
                  }
                >
                  <option value="on">Deal enabled</option>
                  <option value="off">Deal disabled</option>
                </select>
              </div>
            </FieldRow>

            <FieldRow
              label="Deal price"
              enabled={Boolean(patch.dealPrice?.enabled)}
              onToggle={(enabled) =>
                updatePatch("dealPrice", {
                  enabled,
                  value: patch.dealPrice?.value ?? 0,
                })
              }
            >
              <input
                type="number"
                min={0}
                disabled={!patch.dealPrice?.enabled}
                value={patch.dealPrice?.value ?? 0}
                onChange={(event) =>
                  updatePatch("dealPrice", {
                    enabled: true,
                    value: Number(event.target.value),
                  })
                }
              />
            </FieldRow>

            <FieldRow
              label="Deal ends at"
              enabled={Boolean(patch.dealEndsAt?.enabled)}
              onToggle={(enabled) =>
                updatePatch("dealEndsAt", {
                  enabled,
                  value: patch.dealEndsAt?.value ?? "",
                })
              }
            >
              <input
                type="datetime-local"
                disabled={!patch.dealEndsAt?.enabled}
                value={patch.dealEndsAt?.value ?? ""}
                onChange={(event) =>
                  updatePatch("dealEndsAt", {
                    enabled: true,
                    value: event.target.value,
                  })
                }
              />
            </FieldRow>
          </section>

          <section className="sarjan-bulk-edit-section">
            <h5>Inventory</h5>
            {(
              [
                ["stock", "Total stock"],
                ["stockRegularSets", "Regular size sets"],
                ["stockPlusSets", "Plus size sets"],
              ] as const
            ).map(([key, label]) => (
              <FieldRow
                key={key}
                label={label}
                enabled={Boolean(patch[key]?.enabled)}
                onToggle={(enabled) =>
                  updatePatch(key, {
                    enabled,
                    value: patch[key]?.value ?? 0,
                    mode: patch[key]?.mode ?? "add",
                  })
                }
              >
                <div className="sarjan-bulk-edit-inline">
                  <div className="tf-select">
                    <select
                      value={patch[key]?.mode ?? "add"}
                      disabled={!patch[key]?.enabled}
                      onChange={(event) =>
                        updatePatch(key, {
                          enabled: true,
                          value: patch[key]?.value ?? 0,
                          mode: event.target.value as BulkStockMode,
                        })
                      }
                    >
                      <option value="set">Set to</option>
                      <option value="add">Add</option>
                      <option value="subtract">Subtract</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    min={0}
                    disabled={!patch[key]?.enabled}
                    value={patch[key]?.value ?? 0}
                    onChange={(event) =>
                      updatePatch(key, {
                        enabled: true,
                        value: Number(event.target.value),
                        mode: patch[key]?.mode ?? "add",
                      })
                    }
                  />
                </div>
              </FieldRow>
            ))}
          </section>

          <section className="sarjan-bulk-edit-section">
            <h5>Variants & tiers</h5>
            {(
              [
                ["colors", "Colors"],
                ["sizes", "Sizes"],
              ] as const
            ).map(([key, label]) => (
              <FieldRow
                key={key}
                label={label}
                enabled={Boolean(patch[key]?.enabled)}
                onToggle={(enabled) =>
                  updatePatch(key, {
                    enabled,
                    value: patch[key]?.value ?? "",
                    mode: patch[key]?.mode ?? "add",
                  })
                }
              >
                <div className="sarjan-bulk-edit-inline">
                  <div className="tf-select">
                    <select
                      value={patch[key]?.mode ?? "add"}
                      disabled={!patch[key]?.enabled}
                      onChange={(event) =>
                        updatePatch(key, {
                          enabled: true,
                          value: patch[key]?.value ?? "",
                          mode: event.target.value as BulkListMode,
                        })
                      }
                    >
                      <option value="set">Replace with</option>
                      <option value="add">Add</option>
                      <option value="remove">Remove</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Comma separated"
                    disabled={!patch[key]?.enabled}
                    value={patch[key]?.value ?? ""}
                    onChange={(event) =>
                      updatePatch(key, {
                        enabled: true,
                        value: event.target.value,
                        mode: patch[key]?.mode ?? "add",
                      })
                    }
                  />
                </div>
              </FieldRow>
            ))}

            <FieldRow
              label="Dealer tiers"
              enabled={Boolean(patch.dealerTiers?.enabled)}
              onToggle={(enabled) =>
                updatePatch("dealerTiers", {
                  enabled,
                  value: patch.dealerTiers?.value ?? [],
                })
              }
            >
              <div className="sarjan-bulk-edit-tier-grid">
                {(["standard", "premium", "dealer"] as const).map((tier) => {
                  const active = patch.dealerTiers?.value.includes(tier);
                  return (
                    <label
                      key={tier}
                      className={`sarjan-bulk-edit-tier${active ? " is-active" : ""}`}
                    >
                      <input
                        type="checkbox"
                        disabled={!patch.dealerTiers?.enabled}
                        checked={active}
                        onChange={() => {
                          const current = patch.dealerTiers?.value ?? [];
                          const next = active
                            ? current.filter((item) => item !== tier)
                            : [...current, tier];
                          updatePatch("dealerTiers", {
                            enabled: true,
                            value: next,
                          });
                        }}
                      />
                      <span>{tier}</span>
                    </label>
                  );
                })}
              </div>
            </FieldRow>
          </section>

          <section className="sarjan-bulk-edit-section">
            <h5>Content & SEO</h5>
            {(
              [
                ["description", "Description"],
                ["care", "Care instructions"],
                ["metaTitle", "Meta title"],
                ["metaDescription", "Meta description"],
                ["keywords", "Keywords"],
              ] as const
            ).map(([key, label]) => (
              <FieldRow
                key={key}
                label={label}
                enabled={Boolean(patch[key]?.enabled)}
                onToggle={(enabled) =>
                  updatePatch(key, {
                    enabled,
                    value: patch[key]?.value ?? "",
                    mode: patch[key]?.mode ?? "set",
                  })
                }
              >
                <div className="sarjan-bulk-edit-stack">
                  <div className="tf-select">
                    <select
                      value={patch[key]?.mode ?? "set"}
                      disabled={!patch[key]?.enabled}
                      onChange={(event) =>
                        updatePatch(key, {
                          enabled: true,
                          value: patch[key]?.value ?? "",
                          mode: event.target.value as BulkTextMode,
                        })
                      }
                    >
                      <option value="set">Replace</option>
                      <option value="append">Append</option>
                      {key === "description" ? (
                        <option value="prepend">Prepend</option>
                      ) : null}
                    </select>
                  </div>
                  {key === "description" || key === "metaDescription" ? (
                    <textarea
                      rows={3}
                      disabled={!patch[key]?.enabled}
                      value={patch[key]?.value ?? ""}
                      onChange={(event) =>
                        updatePatch(key, {
                          enabled: true,
                          value: event.target.value,
                          mode: patch[key]?.mode ?? "set",
                        })
                      }
                    />
                  ) : (
                    <input
                      type="text"
                      disabled={!patch[key]?.enabled}
                      value={patch[key]?.value ?? ""}
                      onChange={(event) =>
                        updatePatch(key, {
                          enabled: true,
                          value: event.target.value,
                          mode: patch[key]?.mode ?? "set",
                        })
                      }
                    />
                  )}
                </div>
              </FieldRow>
            ))}
          </section>
        </div>

        <div className="sarjan-bulk-edit-footer">
          {summary.length ? (
            <div className="sarjan-bulk-edit-summary">
              <div className="text-caption-1 text-secondary">
                Changes preview
              </div>
              <ul>
                {summary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="body-text text-secondary">
              Tick the fields you want to update. Unticked fields stay
              unchanged.
            </div>
          )}
          {error ? <div className="text-tiny text-danger">{error}</div> : null}
          <div className="sarjan-bulk-edit-footer__actions">
            <button
              type="button"
              className="tf-button style-2 text-btn-uppercase"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="tf-button text-btn-uppercase"
              disabled={!canSave || saving}
              onClick={() => void applyBulkUpdate()}
            >
              {saving
                ? "Updating..."
                : `Update ${selectedProducts.length} product${selectedProducts.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
