"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Product } from "@/data/mock";
import { SIZE_GROUPS } from "@/lib/cart-client";

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  fabric: string;
  price: string;
  moq: string;
  stock: string;
  reserved: string;
  sold: string;
  colors: string;
  sizes: string;
  description: string;
  care: string;
  variantStock: string;
  pricingRules: string;
  images: string[];
  imageAlt: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  isFeatured: boolean;
};

type VariantOverride = {
  sku?: string;
  price?: string;
  stock?: string;
};

const masterFabrics = ["Cotton cambric", "Cotton flex", "Rayon cotton blend", "Cotton slub", "Cotton rayon", "Fine cotton", "Linen cotton", "Viscose", "Modal cotton"];
const commonCareInstructions = ["Gentle wash separately", "Dry in shade", "Do not bleach", "Iron inside out", "Use mild detergent", "Wash dark colors separately", "Hand wash recommended"];
const commonColors = ["Black", "Indigo", "Ivory", "Mustard", "Maroon", "Blue", "Peach", "Teal", "Red", "Brown", "Beige", "White", "Green"];
const commonSizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "Free Size"];

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  category: "Printed Shirts",
  fabric: "",
  price: "",
  moq: "12",
  stock: "0",
  reserved: "0",
  sold: "0",
  colors: "",
  sizes: "",
  description: "",
  care: "",
  variantStock: "",
  pricingRules: "",
  images: [],
  imageAlt: "",
  metaTitle: "",
  metaDescription: "",
  keywords: "",
  isFeatured: false,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function productFromForm(form: ProductForm, index = 0, variantOverrides: Record<string, VariantOverride> = {}): Product {
  const name = form.name.trim();
  const sku = form.sku.trim();
  const slug = slugify(name || sku || `product-${Date.now()}`);
  const fallbackId = `PRD-${Date.now().toString().slice(-6)}-${String(index + 1).padStart(2, "0")}`;

  return {
    id: fallbackId,
    slug,
    name,
    sku,
    category: form.category.trim() || "Uncategorized",
    fabric: form.fabric.trim() || "Cotton",
    price: Number(form.price) || 0,
    moq: Number(form.moq) || 1,
    stock: Number(form.stock) || 0,
    reserved: Number(form.reserved) || 0,
    sold: Number(form.sold) || 0,
    colors: splitList(form.colors),
    sizes: splitList(form.sizes),
    images: form.images.length ? form.images : ["/sarjan-assets/sarjan-logo-icon.png"],
    imageAlt: form.imageAlt.trim() || `${name} ${form.category.trim()} by Sarjan Textiles`,
    description: form.description.trim(),
    care: form.care.trim(),
    metaTitle: form.metaTitle.trim() || name,
    metaDescription: form.metaDescription.trim() || form.description.trim().slice(0, 155),
    keywords: form.keywords.trim(),
    variants: splitList(form.colors).flatMap((color) => splitList(form.sizes).map((size) => {
      const key = `${color}__${size}`;
      const override = variantOverrides[key] ?? {};
      return {
      sku: (override.sku || `${sku}-${color.slice(0, 3).toUpperCase()}-${size}`).replace(/\s+/g, ""),
      color,
      size,
      price: Number(override.price) || Number(form.price) || 0,
      stock: Number(override.stock) || Number(form.variantStock) || Math.floor((Number(form.stock) || 0) / Math.max(1, splitList(form.colors).length * splitList(form.sizes).length)),
    };
    })),
    pricingRules: form.pricingRules
      .split("\n")
      .map((line) => line.split(",").map((item) => item.trim()))
      .filter(([minQty, price]) => minQty && price)
      .map(([minQty, price]) => ({ minQty: Number(minQty), price: Number(price) }))
      .filter((rule) => Number.isFinite(rule.minQty) && Number.isFinite(rule.price)),
    isFeatured: form.isFeatured,
  };
}

function formFromProduct(product?: Product): ProductForm {
  if (!product) return emptyForm;

  return {
    name: product.name,
    sku: product.sku,
    category: product.category,
    fabric: product.fabric,
    price: String(product.price),
    moq: String(product.moq),
    stock: String(product.stock),
    reserved: String(product.reserved),
    sold: String(product.sold),
    colors: product.colors.join(", "),
    sizes: product.sizes.join(", "),
    description: product.description,
    care: product.care,
    variantStock: String(product.variants?.[0]?.stock ?? ""),
    pricingRules: product.pricingRules?.map((rule) => `${rule.minQty}, ${rule.price}`).join("\n") ?? "",
    images: product.images,
    imageAlt: product.imageAlt ?? "",
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    keywords: product.keywords ?? "",
    isFeatured: Boolean(product.isFeatured),
  };
}

function mergeProductIdentity(product: Product, editProduct?: Product) {
  if (!editProduct) return product;
  return {
    ...product,
    id: editProduct.id,
  };
}

function validProduct(product: Product) {
  return Boolean(product.name && product.sku && product.slug);
}

export function AdminProductCreateClient({ initialProducts, editProduct }: { initialProducts: Product[]; editProduct?: Product }) {
  const isEdit = Boolean(editProduct);
  const [form, setForm] = useState<ProductForm>(() => formFromProduct(editProduct));
  const [variantOverrides, setVariantOverrides] = useState<Record<string, VariantOverride>>(() => Object.fromEntries((editProduct?.variants ?? []).map((variant) => [`${variant.color}__${variant.size}`, { sku: variant.sku, price: String(variant.price), stock: String(variant.stock) }])));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [pendingBulkProducts, setPendingBulkProducts] = useState<Product[]>([]);
  const [invalidBulkRows, setInvalidBulkRows] = useState(0);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = useMemo(() => Array.from(new Set(initialProducts.map((product) => product.category))).sort(), [initialProducts]);
  const fabricOptions = useMemo(() => Array.from(new Set([...masterFabrics, ...initialProducts.map((product) => product.fabric).filter(Boolean)])).sort(), [initialProducts]);
  const selectedCare = splitList(form.care);
  const selectedColors = splitList(form.colors);
  const selectedSizes = splitList(form.sizes);
  const variantPreview = useMemo(() => selectedColors.flatMap((color) => selectedSizes.map((size) => {
    const key = `${color}__${size}`;
    const override = variantOverrides[key] ?? {};
    return {
      key,
      color,
      size,
      sku: (override.sku || `${form.sku || "SKU"}-${color.slice(0, 3).toUpperCase()}-${size}`).replace(/\s+/g, ""),
      stock: Number(override.stock) || Number(form.variantStock) || Math.floor((Number(form.stock) || 0) / Math.max(1, selectedColors.length * selectedSizes.length)),
      price: Number(override.price) || Number(form.price) || 0,
    };
  })), [form.price, form.sku, form.stock, form.variantStock, selectedColors, selectedSizes, variantOverrides]);

  const update = (key: keyof ProductForm, value: ProductForm[keyof ProductForm]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateVariantOverride = (key: string, patch: VariantOverride) => {
    setVariantOverrides((current) => ({ ...current, [key]: { ...(current[key] ?? {}), ...patch } }));
  };

  const sizePriceValue = (size: string) => {
    const matched = selectedColors
      .map((color) => variantOverrides[`${color}__${size}`]?.price)
      .find((price) => typeof price === "string" && price.trim());
    return matched ?? form.price;
  };

  const updateSizePrice = (size: string, price: string) => {
    setVariantOverrides((current) => {
      const next = { ...current };
      const colors = selectedColors.length ? selectedColors : ["Default"];
      colors.forEach((color) => {
        const key = `${color}__${size}`;
        next[key] = { ...(next[key] ?? {}), price };
      });
      return next;
    });
  };

  const toggleListValue = (key: "care" | "colors" | "sizes", value: string) => {
    setForm((current) => {
      const values = splitList(current[key]);
      const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      return { ...current, [key]: next.join(", ") };
    });
  };

  const toggleSizeGroup = (sizes: string[]) => {
    setForm((current) => {
      const values = splitList(current.sizes);
      const allSelected = sizes.every((size) => values.includes(size));
      const next = allSelected
        ? values.filter((size) => !sizes.includes(size))
        : Array.from(new Set([...values, ...sizes]));
      return { ...current, sizes: next.join(", ") };
    });
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setMessage("");
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/uploads", { method: "POST", body });
        if (!res.ok) throw new Error("Image upload failed");
        const data = (await res.json()) as { url: string };
        uploaded.push(data.url);
      }
      setForm((current) => ({ ...current, images: uploaded }));
      setMessage(`${uploaded.length} image uploaded.`);
    } catch {
      setMessage("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const product = mergeProductIdentity(productFromForm(form, 0, variantOverrides), editProduct);
    if (!validProduct(product)) {
      setMessage("Name and SKU required.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/cms/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage(isEdit ? "Product updated." : "Product saved and published.");
    } catch {
      setMessage(isEdit ? "Product update failed." : "Product save failed.");
    } finally {
      setSaving(false);
    }
  };

  const uploadBulkProducts = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBulkUploading(true);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/cms/products/bulk-preview", { method: "POST", body });
      const data = (await res.json()) as { products?: Product[]; invalidRows?: number; error?: string };
      if (!res.ok || !data.products?.length) throw new Error(data.error ?? "No valid products");

      setPendingBulkProducts(data.products);
      setInvalidBulkRows(data.invalidRows ?? 0);
      setMessage(`${data.products.length} products ready for review. ${data.invalidRows ? `${data.invalidRows} invalid rows skipped.` : "No invalid rows."}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setPendingBulkProducts([]);
      setInvalidBulkRows(0);
      setMessage(error instanceof Error ? error.message : "Bulk upload failed. Use the sample Excel format.");
    } finally {
      setBulkUploading(false);
    }
  };

  const importReviewedProducts = async () => {
    if (!pendingBulkProducts.length) return;
    setBulkUploading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/cms/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: pendingBulkProducts }),
      });
      if (!res.ok) throw new Error("Bulk upload failed");
      setMessage(`${pendingBulkProducts.length} products imported. Now visible in Products List.`);
      setPendingBulkProducts([]);
      setInvalidBulkRows(0);
    } catch {
      setMessage("Bulk import failed.");
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <form className="form-products-create form-type-2 sarjan-product-create" onSubmit={saveProduct}>
      <div className="flex flex-wrap justify-between gap14 items-center mb-30">
        <div>
          <div className="body-text text-secondary">{isEdit ? "Update product data. Frontend reads this from CMS/backend data." : "Create single product or bulk import products from Excel."}</div>
        </div>
        <div className="d-flex gap10 flex-wrap">
          {editProduct ? (
            <Link href={`/products/${editProduct.slug}`} className="tf-button" target="_blank">
              Preview Frontend
            </Link>
          ) : null}
          <Link href="/admin/products-list" className="tf-button">
            Products List
          </Link>
          <button type="submit" className="tf-button text-btn-uppercase" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Product" : "Save & Publish"}
          </button>
        </div>
      </div>

      {message ? <div className="sarjan-admin-message mb-20">{message}</div> : null}

      <div className="wg-box p-40 sarjan-product-create-box">
        <div className="form-wrap">
          <div className="left">
            <div>
              <h6 className="mb-20">Products Image</h6>
              <div className="upload-image sarjan-product-main-upload">
                <div className="upload-img">
                  {form.images[0] ? (
                    <img src={form.images[0]} alt={form.name || "Product preview"} />
                  ) : (
                    <div className="sarjan-product-upload-placeholder">
                      <i className="icon-image" />
                      <span>No image selected</span>
                    </div>
                  )}
                </div>
                <label className="uploadfile">
                  <input type="file" accept="image/*" multiple onChange={(event) => uploadImages(event.target.files)} />
                  <div className="upload-btn text-button font-instrument fw-6">{uploading ? "Uploading..." : "Choose Files"}</div>
                  <div className="text-caption-1 font-instrument text-secondary">Upload JPG, PNG, WEBP. Multiple allowed.</div>
                </label>
              </div>
            </div>

            {form.images.length ? (
              <button type="button" className="tf-button w-100" onClick={() => update("images", [])}>
                Remove Images
              </button>
            ) : null}

            <div>
              <h6 className="mb-20">Products Image</h6>
              <div className="upload-image style-1 sarjan-product-thumb-upload">
                <div className="upload-img">
                  {form.images.map((image) => (
                    <button type="button" className="item" key={image} onClick={() => update("images", [image, ...form.images.filter((item) => item !== image)])}>
                      <img src={image} alt="Product thumbnail" />
                    </button>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - form.images.length) }).map((_, index) => (
                    <div className="item sarjan-product-empty-thumb" key={index} />
                  ))}
                </div>
              </div>
            </div>

            {!isEdit ? (
              <div className="sarjan-product-bulk-card">
                <div>
                  <h6 className="mb-4">Bulk Product Upload</h6>
                  <p className="text-secondary">Download sample Excel, fill data, upload same file.</p>
                </div>
                <div className="sarjan-product-bulk-actions">
                  <a className="tf-button" href="/samples/sarjan-product-bulk-upload-sample.xlsx" download>
                    Download Sample Excel
                  </a>
                  <label className="tf-button style-1">
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={(event) => uploadBulkProducts(event.target.files)} />
                    {bulkUploading ? "Uploading..." : "Upload Excel"}
                  </label>
                </div>
              </div>
            ) : null}

            {!isEdit && pendingBulkProducts.length ? (
              <div className="sarjan-product-bulk-review">
                <div className="flex justify-between gap12 items-center mb-16">
                  <div>
                    <h6 className="mb-4">Review Bulk Products</h6>
                    <p className="text-secondary">{pendingBulkProducts.length} valid products ready. {invalidBulkRows} invalid rows skipped.</p>
                  </div>
                  <button type="button" className="tf-button text-btn-uppercase" onClick={importReviewedProducts} disabled={bulkUploading}>
                    {bulkUploading ? "Importing..." : "Import Reviewed Products"}
                  </button>
                </div>
                <div className="sarjan-product-bulk-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingBulkProducts.slice(0, 6).map((product) => (
                        <tr key={`${product.sku}-${product.slug}`}>
                          <td>{product.name}</td>
                          <td>{product.sku}</td>
                          <td>{product.category}</td>
                          <td>{product.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          <div className="right">
            <div className="d-flex flex-column gap20">
              <div>
                <h6 className="mb-4">Products Description</h6>
                <p className="text-secondary">Comprehensive textile product data for frontend catalog.</p>
              </div>
              <fieldset>
                <div className="text-title mb-8">Status<span className="text-primary">*</span></div>
                <div className="tf-item-select">
                  <div className="gap33 d-flex align-items-center">
                    <label className="gap12 d-flex align-items-center">
                      <input type="radio" name="status" className="tf-check-rounded" defaultChecked />
                      <p>Published</p>
                    </label>
                    <label className="gap12 d-flex align-items-center">
                      <input type="radio" name="status" className="tf-check-rounded" />
                      <p>Draft</p>
                    </label>
                  </div>
                </div>
              </fieldset>
              <fieldset>
                <div className="text-button font-instrument fw-6 mb-8">Name<span className="text-primary">*</span></div>
                <input type="text" value={form.name} onChange={(event) => update("name", event.target.value)} required />
              </fieldset>
              <fieldset>
                <div className="text-button font-instrument fw-6 mb-8">SKU<span className="text-primary">*</span></div>
                <input type="text" value={form.sku} onChange={(event) => update("sku", event.target.value)} required />
              </fieldset>
              <fieldset>
                <div className="text-title mb-8">Description<span className="text-primary">*</span></div>
                <textarea value={form.description} onChange={(event) => update("description", event.target.value)} required />
              </fieldset>
              <div className="sarjan-seo-panel">
                <h6>Product SEO</h6>
                <p className="text-secondary">Page-wise metadata and image alt text for Google/social previews.</p>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">URL Slug<span className="text-primary">*</span></div>
                  <input type="text" value={slugify(form.name || form.sku)} readOnly />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">Image Alt Text</div>
                  <input type="text" value={form.imageAlt} onChange={(event) => update("imageAlt", event.target.value)} placeholder="Ajrak black printed shirt for wholesale buyers" />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">Meta Title</div>
                  <input type="text" value={form.metaTitle} onChange={(event) => update("metaTitle", event.target.value)} maxLength={70} placeholder="Product page title" />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">Meta Description</div>
                  <textarea rows={3} value={form.metaDescription} onChange={(event) => update("metaDescription", event.target.value)} maxLength={170} placeholder="Search result description" />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">Keywords</div>
                  <input type="text" value={form.keywords} onChange={(event) => update("keywords", event.target.value)} placeholder="printed shirt, ajrak, cotton cambric" />
                </fieldset>
              </div>
              <fieldset>
                <div className="text-button mb-8">Categories<span className="text-primary">*</span></div>
                <div className="tf-select">
                  <select className="w-100" value={form.category} onChange={(event) => update("category", event.target.value)}>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                    <option>New Collection</option>
                  </select>
                </div>
              </fieldset>
              <fieldset>
                <div className="text-button font-instrument fw-6 mb-8">Fabric Type<span className="text-primary">*</span></div>
                <div className="tf-select">
                  <select className="w-100" value={form.fabric} onChange={(event) => update("fabric", event.target.value)} required>
                    <option value="">Select fabric type</option>
                    {fabricOptions.map((fabric) => <option key={fabric}>{fabric}</option>)}
                  </select>
                </div>
              </fieldset>
              <fieldset>
                <div className="text-button mb-8">Care Instructions</div>
                <div className="sarjan-product-check-grid">
                  {commonCareInstructions.map((care) => (
                    <label className="sarjan-product-check" key={care}>
                      <input type="checkbox" checked={selectedCare.includes(care)} onChange={() => toggleListValue("care", care)} />
                      <span>{care}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="line-top" />

            <div className="d-flex flex-column gap20">
              <div>
                <h6 className="mb-4">Products Variation</h6>
                <p className="text-secondary">Comma separated values for frontend filters and variants.</p>
              </div>
              <fieldset>
                <div className="text-title mb-8">Colors<span className="text-primary">*</span></div>
                <div className="sarjan-product-check-grid">
                  {commonColors.map((color) => (
                    <label className="sarjan-product-check" key={color}>
                      <input type="checkbox" checked={selectedColors.includes(color)} onChange={() => toggleListValue("colors", color)} />
                      <span>{color}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <div className="text-button mb-8">Size<span className="text-primary">*</span></div>
                <div className="sarjan-size-group-actions">
                  <button type="button" className="tf-button style-1" onClick={() => toggleSizeGroup(SIZE_GROUPS.regular)}>XS to XXL</button>
                  <button type="button" className="tf-button style-1" onClick={() => toggleSizeGroup(SIZE_GROUPS.plus)}>3XL to 5XL</button>
                </div>
                <div className="sarjan-product-check-grid sarjan-product-size-grid">
                  {commonSizes.map((size) => (
                    <label className="sarjan-product-check" key={size}>
                      <input type="checkbox" checked={selectedSizes.includes(size)} onChange={() => toggleListValue("sizes", size)} />
                      <span>{size}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="d-flex flex-column gap20">
              <h6 className="mb-4">Pricing & Stock</h6>
              <div className="sarjan-product-field-grid">
                <fieldset>
                  <div className="text-button font-instrument mb-8">Price<span className="text-primary">*</span></div>
                  <input type="number" value={form.price} onChange={(event) => update("price", event.target.value)} required />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">Variant Stock Per Color/Size</div>
                  <input type="number" value={form.variantStock} onChange={(event) => update("variantStock", event.target.value)} placeholder="Auto split if blank" />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">MOQ<span className="text-primary">*</span></div>
                  <input type="number" value={form.moq} onChange={(event) => update("moq", event.target.value)} required />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">Quantity<span className="text-primary">*</span></div>
                  <input type="number" value={form.stock} onChange={(event) => update("stock", event.target.value)} required />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">Reserved</div>
                  <input type="number" value={form.reserved} onChange={(event) => update("reserved", event.target.value)} />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">Sold</div>
                  <input type="number" value={form.sold} onChange={(event) => update("sold", event.target.value)} />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">Featured</div>
                  <label className="sarjan-product-switch">
                    <input type="checkbox" checked={form.isFeatured} onChange={(event) => update("isFeatured", event.target.checked)} />
                    <span>Show in featured sections</span>
                  </label>
                </fieldset>
              </div>
              {selectedSizes.length ? (
                <fieldset>
                  <div className="text-button font-instrument mb-8">Size-wise Price</div>
                  <div className="sarjan-size-price-grid">
                    {selectedSizes.map((size) => (
                      <label className="sarjan-size-price-item" key={size}>
                        <span>{size}</span>
                        <input type="number" value={sizePriceValue(size)} onChange={(event) => updateSizePrice(size, event.target.value)} placeholder="Price" />
                      </label>
                    ))}
                  </div>
                  <div className="text-caption-1 text-secondary mt-8">Set different price for each size. These values auto-fill the color-size matrix below.</div>
                </fieldset>
              ) : null}
              <fieldset>
                <div className="text-button font-instrument mb-8">Pricing Rules</div>
                <textarea
                  rows={4}
                  value={form.pricingRules}
                  onChange={(event) => update("pricingRules", event.target.value)}
                  placeholder={"Min Qty, Price\n50, 620\n100, 590"}
                />
                <div className="text-caption-1 text-secondary mt-8">One rule per line. Frontend/backend can use this for client pricing slabs.</div>
              </fieldset>
              {variantPreview.length ? (
                <div className="sarjan-product-bulk-review">
                  <div className="flex justify-between gap12 items-center mb-16">
                    <div>
                      <h6 className="mb-4">Variant Matrix Preview</h6>
                      <p className="text-secondary">{variantPreview.length} color-size variants can be edited individually for SKU, price, and stock.</p>
                    </div>
                    <span className="box-status text-button type-delivery">{selectedColors.length} colors / {selectedSizes.length} sizes</span>
                  </div>
                  <div className="sarjan-product-bulk-table">
                    <table>
                      <thead><tr><th>Color</th><th>Size</th><th>SKU</th><th>Price</th><th>Stock</th></tr></thead>
                      <tbody>
                        {variantPreview.map((variant) => (
                          <tr key={`${variant.color}-${variant.size}`}>
                            <td>{variant.color}</td>
                            <td>{variant.size}</td>
                            <td><input value={variant.sku} onChange={(event) => updateVariantOverride(variant.key, { sku: event.target.value })} /></td>
                            <td><input type="number" value={variant.price} onChange={(event) => updateVariantOverride(variant.key, { price: event.target.value })} /></td>
                            <td><input type="number" value={variant.stock} onChange={(event) => updateVariantOverride(variant.key, { stock: event.target.value })} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
