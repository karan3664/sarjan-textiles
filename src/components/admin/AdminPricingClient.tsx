"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import type { AdminCustomer } from "@/lib/admin-customers";
import type { ClientPricingRule, ProductCategoryMaster } from "@/lib/cms-store";

export function AdminPricingClient({
  initialRules,
  clients,
  products,
  initialCategoryMaster,
}: {
  initialRules: ClientPricingRule[];
  clients: AdminCustomer[];
  products: Product[];
  initialCategoryMaster: ProductCategoryMaster[];
}) {
  const approvedClients = clients.filter(
    (client) => client.status === "approved",
  );
  const [rules, setRules] = useState(initialRules);
  const [categoryMaster, setCategoryMaster] = useState(initialCategoryMaster);
  const [editing, setEditing] = useState<ClientPricingRule | null>(null);
  const [pricingScope, setPricingScope] = useState<"product" | "category">(
    "category",
  );
  const [categoryDraft, setCategoryDraft] = useState({
    level1: "",
    level2: "",
    level3: "",
  });
  const [message, setMessage] = useState("");

  function normalizeCategoryPath(path: unknown): string[] {
    if (!Array.isArray(path)) return [];
    return path.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  const categoryOptions = useMemo(() => {
    const masterPaths = categoryMaster
      .filter((category) => category.active !== false)
      .map((category) => category.path);
    const productPaths = products.map((product) =>
      product.categoryPath?.length ? product.categoryPath : [product.category],
    );
    const byName = new Map<string, string[]>();
    [...masterPaths, ...productPaths].forEach((path) => {
      const cleanPath = normalizeCategoryPath(path);
      if (cleanPath.length) byName.set(cleanPath.join(" > "), cleanPath);
    });
    return Array.from(byName.entries())
      .map(([name, path]) => ({ name, path }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryMaster, products]);
  const pricingHistory = useMemo(
    () =>
      rules
        .flatMap((rule) =>
          (rule.history ?? []).map((item) => ({ ...item, rule })),
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [rules],
  );

  const ruleStatus = (rule: ClientPricingRule) => {
    const now = new Date();
    if (!rule.active) return { label: "Hidden", className: "type-pending" };
    if (rule.validFrom && new Date(rule.validFrom) > now)
      return { label: "Scheduled", className: "type-delivery" };
    if (rule.validTo && new Date(rule.validTo) < now)
      return { label: "Expired", className: "type-inactive" };
    return { label: "Active", className: "type-completed" };
  };

  const saveRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Saving...");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch("/api/admin/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        id: editing?.id,
        scope: pricingScope,
        active: payload.active === "on",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Pricing save failed");
      return;
    }
    setRules(data.pricing);
    setEditing(null);
    setPricingScope("category");
    event.currentTarget.reset();
    setMessage("Saved");
  };

  const addCategoryMaster = async () => {
    const path = [
      categoryDraft.level1,
      categoryDraft.level2,
      categoryDraft.level3,
    ]
      .map((item) => item.trim())
      .filter(Boolean);
    if (!path.length) {
      setMessage("Category level 1 required");
      return;
    }
    const name = path.join(" > ");
    const next = [
      {
        id: name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
        name,
        path,
        active: true,
        updatedAt: new Date().toISOString(),
      },
      ...categoryMaster.filter((category) => category.name !== name),
    ];
    setMessage("Saving category master...");
    const res = await fetch("/api/admin/pricing/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Category save failed");
      return;
    }
    setCategoryMaster(data.categories);
    setCategoryDraft({ level1: "", level2: "", level3: "" });
    setMessage("Category master saved");
  };

  const deleteRule = async (id: string) => {
    const res = await fetch(`/api/admin/pricing?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (res.ok) setRules(data.pricing);
  };

  return (
    <>
      <div className="wg-box mb-30">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Client-wise Pricing Engine</h5>
            <div className="body-text text-secondary">
              Approved clients can receive custom product price, discount, date
              validity, and pricing history.
            </div>
          </div>
          <div className="box-status text-button type-delivery">
            {rules.length} Rules
          </div>
        </div>
        <form
          className="form-new-product form-style-1"
          onSubmit={saveRule}
          key={editing?.id ?? "new-pricing-rule"}
        >
          <fieldset>
            <div className="body-title">Client</div>
            <select
              name="clientId"
              defaultValue={editing?.clientId ?? approvedClients[0]?.id ?? ""}
              required
            >
              {approvedClients.map((client) => (
                <option value={client.id} key={client.id}>
                  {client.companyName}
                </option>
              ))}
            </select>
          </fieldset>
          <fieldset>
            <div className="body-title">Product Category</div>
            <select
              name="categoryPath"
              defaultValue={(
                editing?.categoryPath ??
                categoryOptions[0]?.path ??
                []
              ).join(",")}
              required
            >
              {categoryOptions.map((category) => (
                <option value={category.path.join(",")} key={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </fieldset>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <fieldset>
              <div className="body-title">Custom Price</div>
              <input
                name="customPrice"
                type="number"
                min="0"
                defaultValue={editing?.customPrice ?? ""}
                placeholder="Example: 90"
              />
            </fieldset>
            <fieldset>
              <div className="body-title">Discount %</div>
              <input
                name="discountPercentage"
                type="number"
                min="0"
                max="100"
                defaultValue={editing?.discountPercentage ?? ""}
                placeholder="Example: 10"
              />
            </fieldset>
            <fieldset>
              <div className="body-title">Valid From</div>
              <input
                name="validFrom"
                type="date"
                defaultValue={editing?.validFrom ?? ""}
              />
            </fieldset>
            <fieldset>
              <div className="body-title">Valid To</div>
              <input
                name="validTo"
                type="date"
                defaultValue={editing?.validTo ?? ""}
              />
            </fieldset>
          </div>
          <fieldset>
            <div className="body-title">Note</div>
            <input
              name="note"
              defaultValue={editing?.note ?? ""}
              placeholder="Buyer negotiation, seasonal offer, bulk rate..."
            />
          </fieldset>
          <label className="d-flex align-items-center gap10">
            <input
              name="active"
              type="checkbox"
              defaultChecked={editing?.active ?? true}
            />
            <span className="body-text">Active pricing rule</span>
          </label>
          <div className="flex gap10 items-center">
            <button className="tf-button style-1" type="submit">
              {editing ? "Update Pricing" : "Add Pricing Rule"}
            </button>
            {editing ? (
              <button
                className="tf-button"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setPricingScope("category");
                }}
              >
                Cancel
              </button>
            ) : null}
            {message ? (
              <span className="body-text text-secondary">{message}</span>
            ) : null}
          </div>
        </form>
      </div>

      <div className="wg-box mb-30">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Multi Level Category Master</h5>
            <div className="body-text text-secondary">
              Client pricing category dropdown and product category paths come
              from this master.
            </div>
          </div>
          <div className="box-status text-button type-delivery">
            {categoryMaster.length} Categories
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          <fieldset>
            <div className="body-title">Level 1</div>
            <input
              value={categoryDraft.level1}
              onChange={(event) =>
                setCategoryDraft((current) => ({
                  ...current,
                  level1: event.target.value,
                }))
              }
              placeholder="Men"
            />
          </fieldset>
          <fieldset>
            <div className="body-title">Level 2</div>
            <input
              value={categoryDraft.level2}
              onChange={(event) =>
                setCategoryDraft((current) => ({
                  ...current,
                  level2: event.target.value,
                }))
              }
              placeholder="Shirts"
            />
          </fieldset>
          <fieldset>
            <div className="body-title">Level 3</div>
            <input
              value={categoryDraft.level3}
              onChange={(event) =>
                setCategoryDraft((current) => ({
                  ...current,
                  level3: event.target.value,
                }))
              }
              placeholder="Printed Shirts"
            />
          </fieldset>
        </div>
        <button
          type="button"
          className="tf-button style-1"
          onClick={addCategoryMaster}
        >
          Add Category Path
        </button>
        <div className="sarjan-product-bulk-table mt-20">
          <table>
            <thead>
              <tr>
                <th>Level 1</th>
                <th>Level 2</th>
                <th>Level 3</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {categoryMaster.slice(0, 50).map((category) => (
                <tr key={category.id}>
                  <td>{category.path[0] ?? "-"}</td>
                  <td>{category.path[1] ?? "-"}</td>
                  <td>{category.path[2] ?? "-"}</td>
                  <td>{category.active ? "Active" : "Hidden"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="wg-box">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Pricing Rules</h5>
            <div className="body-text text-secondary">
              Frontend APIs return effective price for approved logged-in
              client. Public visitors still see public price.
            </div>
          </div>
        </div>
        <div className="wg-table table-all-user">
          <ul className="table-title flex gap20">
            <li>
              <div className="body-title">Client</div>
            </li>
            <li>
              <div className="body-title">Product</div>
            </li>
            <li>
              <div className="body-title">Price / Discount</div>
            </li>
            <li>
              <div className="body-title">Validity</div>
            </li>
            <li>
              <div className="body-title">Status</div>
            </li>
            <li>
              <div className="body-title">Action</div>
            </li>
          </ul>
          <ul className="flex flex-column">
            {rules.map((rule) => {
              const client = clients.find((item) => item.id === rule.clientId);
              const product = products.find(
                (item) => item.slug === rule.productSlug,
              );
              const target =
                rule.scope === "category"
                  ? rule.categoryPath?.join(" > ")
                  : (product?.name ?? rule.productSlug);
              return (
                <li className="product-item gap14" key={rule.id}>
                  <div className="flex items-center justify-between gap20 flex-grow">
                    <div>{client?.companyName ?? rule.clientId}</div>
                    <div>{target}</div>
                    <div>
                      {rule.customPrice
                        ? `₹${rule.customPrice}`
                        : `${rule.discountPercentage ?? 0}% discount`}
                    </div>
                    <div>
                      {rule.validFrom || "Now"} - {rule.validTo || "Open"}
                    </div>
                    <div>
                      <span
                        className={`box-status text-button ${ruleStatus(rule).className}`}
                      >
                        {ruleStatus(rule).label}
                      </span>
                    </div>
                    <div className="list-icon-function">
                      <button
                        type="button"
                        className="item edit"
                        onClick={() => {
                          setEditing(rule);
                          setPricingScope("category");
                        }}
                      >
                        <i className="icon-edit-3" />
                      </button>
                      <button
                        type="button"
                        className="item trash"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <i className="icon-trash-2" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="wg-box mt-30">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Temporary Pricing History</h5>
            <div className="body-text text-secondary">
              Every client price update stores date validity, note, actor, and
              previous pricing timeline.
            </div>
          </div>
          <div className="box-status text-button type-delivery">
            {pricingHistory.length} Logs
          </div>
        </div>
        <div className="wg-table sarjan-pricing-history-table">
          <table>
            <thead>
              <tr>
                <th className="text-title">Updated</th>
                <th className="text-title">Client</th>
                <th className="text-title">Product</th>
                <th className="text-title">Price</th>
                <th className="text-title">Validity</th>
                <th className="text-title">Actor / Note</th>
              </tr>
            </thead>
            <tbody>
              {pricingHistory.slice(0, 100).map((item, index) => {
                const client = clients.find(
                  (entry) => entry.id === item.rule.clientId,
                );
                const product = products.find(
                  (entry) => entry.slug === item.rule.productSlug,
                );
                const target =
                  item.rule.scope === "category"
                    ? item.rule.categoryPath?.join(" > ")
                    : (product?.name ?? item.rule.productSlug);
                return (
                  <tr
                    className="tf-table-item item-row"
                    key={`${item.rule.id}-${item.updatedAt}-${index}`}
                  >
                    <td>
                      {new Intl.DateTimeFormat("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(item.updatedAt))}
                    </td>
                    <td>{client?.companyName ?? item.rule.clientId}</td>
                    <td>{target}</td>
                    <td>
                      {item.customPrice
                        ? `₹${item.customPrice}`
                        : `${item.discountPercentage ?? 0}% discount`}
                    </td>
                    <td>
                      {item.validFrom || "Now"} - {item.validTo || "Open"}
                    </td>
                    <td>
                      <div>{item.actor || "Admin"}</div>
                      <div className="text-caption-1 text-secondary">
                        {item.note || "-"}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!pricingHistory.length ? (
                <tr>
                  <td colSpan={6}>
                    <div className="sarjan-empty-state">
                      No pricing history yet.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
