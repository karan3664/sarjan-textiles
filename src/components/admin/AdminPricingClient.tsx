"use client";

import { FormEvent, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import type { AdminCustomer } from "@/lib/admin-customers";
import type { ClientPricingRule } from "@/lib/cms-store";

export function AdminPricingClient({
  initialRules,
  clients,
  products,
}: {
  initialRules: ClientPricingRule[];
  clients: AdminCustomer[];
  products: Product[];
}) {
  const approvedClients = clients.filter((client) => client.status === "approved");
  const [rules, setRules] = useState(initialRules);
  const [editing, setEditing] = useState<ClientPricingRule | null>(null);
  const [message, setMessage] = useState("");
  const productOptions = useMemo(() => products.slice(0, 250), [products]);

  const saveRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Saving...");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch("/api/admin/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, id: editing?.id, active: payload.active === "on" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Pricing save failed");
      return;
    }
    setRules(data.pricing);
    setEditing(null);
    event.currentTarget.reset();
    setMessage("Saved");
  };

  const deleteRule = async (id: string) => {
    const res = await fetch(`/api/admin/pricing?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) setRules(data.pricing);
  };

  return (
    <>
      <div className="wg-box mb-30">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Client-wise Pricing Engine</h5>
            <div className="body-text text-secondary">Approved clients can receive custom product price, discount, date validity, and pricing history.</div>
          </div>
          <div className="box-status text-button type-delivery">{rules.length} Rules</div>
        </div>
        <form className="form-new-product form-style-1" onSubmit={saveRule}>
          <fieldset>
            <div className="body-title">Client</div>
            <select name="clientId" defaultValue={editing?.clientId ?? approvedClients[0]?.id ?? ""} required>
              {approvedClients.map((client) => <option value={client.id} key={client.id}>{client.companyName}</option>)}
            </select>
          </fieldset>
          <fieldset>
            <div className="body-title">Product</div>
            <select name="productSlug" defaultValue={editing?.productSlug ?? productOptions[0]?.slug ?? ""} required>
              {productOptions.map((product) => <option value={product.slug} key={product.slug}>{product.name} / {product.sku}</option>)}
            </select>
          </fieldset>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <fieldset>
              <div className="body-title">Custom Price</div>
              <input name="customPrice" type="number" min="0" defaultValue={editing?.customPrice ?? ""} placeholder="Example: 90" />
            </fieldset>
            <fieldset>
              <div className="body-title">Discount %</div>
              <input name="discountPercentage" type="number" min="0" max="100" defaultValue={editing?.discountPercentage ?? ""} placeholder="Example: 10" />
            </fieldset>
            <fieldset>
              <div className="body-title">Valid From</div>
              <input name="validFrom" type="date" defaultValue={editing?.validFrom ?? ""} />
            </fieldset>
            <fieldset>
              <div className="body-title">Valid To</div>
              <input name="validTo" type="date" defaultValue={editing?.validTo ?? ""} />
            </fieldset>
          </div>
          <fieldset>
            <div className="body-title">Note</div>
            <input name="note" defaultValue={editing?.note ?? ""} placeholder="Buyer negotiation, seasonal offer, bulk rate..." />
          </fieldset>
          <label className="d-flex align-items-center gap10">
            <input name="active" type="checkbox" defaultChecked={editing?.active ?? true} />
            <span className="body-text">Active pricing rule</span>
          </label>
          <div className="flex gap10 items-center">
            <button className="tf-button style-1" type="submit">{editing ? "Update Pricing" : "Add Pricing Rule"}</button>
            {editing ? <button className="tf-button" type="button" onClick={() => setEditing(null)}>Cancel</button> : null}
            {message ? <span className="body-text text-secondary">{message}</span> : null}
          </div>
        </form>
      </div>

      <div className="wg-box">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Pricing Rules</h5>
            <div className="body-text text-secondary">Frontend APIs return effective price for approved logged-in client. Public visitors still see public price.</div>
          </div>
        </div>
        <div className="wg-table table-all-user">
          <ul className="table-title flex gap20">
            <li><div className="body-title">Client</div></li>
            <li><div className="body-title">Product</div></li>
            <li><div className="body-title">Price / Discount</div></li>
            <li><div className="body-title">Validity</div></li>
            <li><div className="body-title">Status</div></li>
            <li><div className="body-title">Action</div></li>
          </ul>
          <ul className="flex flex-column">
            {rules.map((rule) => {
              const client = clients.find((item) => item.id === rule.clientId);
              const product = products.find((item) => item.slug === rule.productSlug);
              return (
                <li className="product-item gap14" key={rule.id}>
                  <div className="flex items-center justify-between gap20 flex-grow">
                    <div>{client?.companyName ?? rule.clientId}</div>
                    <div>{product?.name ?? rule.productSlug}</div>
                    <div>{rule.customPrice ? `₹${rule.customPrice}` : `${rule.discountPercentage ?? 0}% discount`}</div>
                    <div>{rule.validFrom || "Now"} - {rule.validTo || "Open"}</div>
                    <div><span className={`box-status text-button ${rule.active ? "type-delivery" : "type-pending"}`}>{rule.active ? "Active" : "Hidden"}</span></div>
                    <div className="list-icon-function">
                      <button type="button" className="item edit" onClick={() => setEditing(rule)}><i className="icon-edit-3" /></button>
                      <button type="button" className="item trash" onClick={() => deleteRule(rule.id)}><i className="icon-trash-2" /></button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
