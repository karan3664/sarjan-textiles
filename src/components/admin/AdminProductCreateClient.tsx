"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Product } from "@/data/mock";
import { SIZE_GROUPS, SIZE_GROUP_LABELS } from "@/lib/cart-client";
import { setStockForSizeInGroup } from "@/lib/bulk-product-stock";
import { totalPieceStockFromSetCounts } from "@/lib/set-stock";
import type { ProductCategoryMaster } from "@/lib/cms-store";
import { buildProductImageAlt } from "@/lib/product-image-alt";
import { buildSeoProductSlug, isWeakProductSlug } from "@/lib/product-seo-slug";
import { slugifyCmsSegment } from "@/lib/slug";
import {
  dealEndsAtFromInput,
  dealEndsAtInputValue,
  formatDealCountdown,
} from "@/lib/product-deal";

type ProductForm = {
  name: string;
  sku: string;
  category: string;
  categoryPath: string;
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
  stockRegularSets: string;
  stockPlusSets: string;
  variantStock: string;
  pricingRules: string;
  images: string[];
  spin360Images: string[];
  fabricSwatchImage: string;
  imageAlt: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  isFeatured: boolean;
  catalogActive: boolean;
  dealerTiers: string;
  dealEnabled: boolean;
  dealEndsAt: string;
  dealPrice: string;
};

type VariantOverride = {
  sku?: string;
  price?: string;
  stock?: string;
};

const masterFabrics = [
  "Cotton cambric",
  "Cotton flex",
  "Rayon cotton blend",
  "Cotton slub",
  "Cotton rayon",
  "Fine cotton",
  "Linen cotton",
  "Viscose",
  "Modal cotton",
];
const commonCareInstructions = [
  "Gentle wash separately",
  "Dry in shade",
  "Do not bleach",
  "Iron inside out",
  "Use mild detergent",
  "Wash dark colors separately",
  "Hand wash recommended",
];
const commonColors = [
  "Black",
  "Indigo",
  "Ivory",
  "Mustard",
  "Maroon",
  "Blue",
  "Peach",
  "Teal",
  "Red",
  "Brown",
  "Beige",
  "White",
  "Green",
];
const commonSizes = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];

const emptyForm: ProductForm = {
  name: "",
  sku: "",
  category: "Printed Shirts",
  categoryPath: "Printed Shirts",
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
  stockRegularSets: "",
  stockPlusSets: "",
  variantStock: "",
  pricingRules: "",
  images: [],
  spin360Images: [],
  fabricSwatchImage: "",
  imageAlt: "",
  metaTitle: "",
  metaDescription: "",
  keywords: "",
  isFeatured: false,
  catalogActive: true,
  dealerTiers: "",
  dealEnabled: false,
  dealEndsAt: "",
  dealPrice: "",
};

function previewProductSlug(form: ProductForm) {
  const name = form.name.trim();
  const sku = form.sku.trim();
  const category = form.category.trim() || "Uncategorized";
  const colors = splitList(form.colors);
  const fabric = form.fabric.trim() || "Cotton";
  const draft = slugifyCmsSegment(name || sku || "product");
  if (!draft) return "";
  return isWeakProductSlug(draft)
    ? buildSeoProductSlug({ category, fabric, colors, name: name || sku })
    : draft;
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function productFromForm(
  form: ProductForm,
  index = 0,
  variantOverrides: Record<string, VariantOverride> = {},
): Product {
  const name = form.name.trim();
  const sku = form.sku.trim();
  const fallbackId = `PRD-${Date.now().toString().slice(-6)}-${String(index + 1).padStart(2, "0")}`;
  const categoryPath = splitList(form.categoryPath).length
    ? splitList(form.categoryPath)
    : [form.category.trim() || "Uncategorized"];
  const category =
    form.category.trim() || categoryPath.at(-1) || "Uncategorized";
  const colors = splitList(form.colors);
  const fabric = form.fabric.trim() || "Cotton";
  const draftSlug = slugifyCmsSegment(name || sku || `product-${Date.now()}`);
  const slug = isWeakProductSlug(draftSlug)
    ? buildSeoProductSlug({ category, fabric, colors, name })
    : draftSlug;
  const sizes = splitList(form.sizes);
  const stockRegularSets = Number(form.stockRegularSets) || 0;
  const stockPlusSets = Number(form.stockPlusSets) || 0;
  const variants = splitList(form.colors).flatMap((color) =>
    sizes.map((size) => {
      const key = `${color}__${size}`;
      const override = variantOverrides[key] ?? {};
      const overrideSets = Number(override.stock) || 0;
      const setStock =
        overrideSets ||
        setStockForSizeInGroup(size, sizes, stockRegularSets, stockPlusSets) ||
        Number(form.variantStock) ||
        0;
      return {
        sku: (
          override.sku || `${sku}-${color.slice(0, 3).toUpperCase()}-${size}`
        ).replace(/\s+/g, ""),
        color,
        size,
        price: Number(override.price) || Number(form.price) || 0,
        stock: setStock,
      };
    }),
  );
  const stock =
    stockRegularSets > 0 || stockPlusSets > 0
      ? totalPieceStockFromSetCounts({
          colors,
          sizes,
          stockRegularSets,
          stockPlusSets,
        })
      : Number(form.stock) ||
        variants.reduce(
          (sum, variant) => sum + (Number(variant.stock) || 0),
          0,
        );

  return {
    id: fallbackId,
    slug,
    name,
    sku,
    category,
    categoryPath,
    categoryLevel1: categoryPath[0],
    categoryLevel2: categoryPath[1],
    categoryLevel3: categoryPath[2],
    fabric,
    price: Number(form.price) || 0,
    moq: Number(form.moq) || 1,
    stock,
    reserved: Number(form.reserved) || 0,
    sold: Number(form.sold) || 0,
    colors,
    sizes,
    stockRegularSets: stockRegularSets > 0 ? stockRegularSets : undefined,
    stockPlusSets: stockPlusSets > 0 ? stockPlusSets : undefined,
    images: form.images.length
      ? form.images
      : ["/sarjan-assets/sarjan-logo.svg"],
    spin360Images:
      form.spin360Images.length >= 8 ? form.spin360Images : undefined,
    fabricSwatchImage: form.fabricSwatchImage.trim() || undefined,
    imageAlt:
      form.imageAlt.trim() ||
      buildProductImageAlt({
        name,
        category,
        fabric,
        colors,
        imageAlt: "",
      }),
    description: form.description.trim(),
    care: form.care.trim(),
    metaTitle: form.metaTitle.trim() || name,
    metaDescription:
      form.metaDescription.trim() || form.description.trim().slice(0, 155),
    keywords: form.keywords.trim(),
    variants,
    pricingRules: form.pricingRules
      .split("\n")
      .map((line) => line.split(",").map((item) => item.trim()))
      .filter(([minQty, price]) => minQty && price)
      .map(([minQty, price]) => ({
        minQty: Number(minQty),
        price: Number(price),
      }))
      .filter(
        (rule) => Number.isFinite(rule.minQty) && Number.isFinite(rule.price),
      ),
    isFeatured: form.isFeatured,
    catalogActive: form.catalogActive,
    dealerTiers: form.dealerTiers.trim()
      ? form.dealerTiers
          .split(",")
          .map((tier) => tier.trim().toLowerCase())
          .filter((tier): tier is "standard" | "premium" | "dealer" =>
            ["standard", "premium", "dealer"].includes(tier),
          )
      : undefined,
    dealEnabled: form.dealEnabled,
    dealEndsAt: form.dealEnabled
      ? dealEndsAtFromInput(form.dealEndsAt)
      : undefined,
    dealPrice:
      form.dealEnabled && form.dealPrice.trim()
        ? Number(form.dealPrice)
        : undefined,
  };
}

function formFromProduct(product?: Product): ProductForm {
  if (!product) return emptyForm;

  return {
    name: product.name,
    sku: product.sku,
    category: product.category,
    categoryPath: (product.categoryPath ?? [product.category]).join(", "),
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
    stockRegularSets: String(product.stockRegularSets ?? ""),
    stockPlusSets: String(product.stockPlusSets ?? ""),
    variantStock: String(product.variants?.[0]?.stock ?? ""),
    pricingRules:
      product.pricingRules
        ?.map((rule) => `${rule.minQty}, ${rule.price}`)
        .join("\n") ?? "",
    images: product.images,
    spin360Images: product.spin360Images ?? [],
    fabricSwatchImage: product.fabricSwatchImage ?? "",
    imageAlt: product.imageAlt ?? "",
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    keywords: product.keywords ?? "",
    isFeatured: Boolean(product.isFeatured),
    catalogActive: product.catalogActive !== false && product.active !== false,
    dealerTiers: (product.dealerTiers ?? []).join(", "),
    dealEnabled: Boolean(product.dealEnabled),
    dealEndsAt: dealEndsAtInputValue(product.dealEndsAt),
    dealPrice:
      typeof product.dealPrice === "number" && product.dealPrice > 0
        ? String(product.dealPrice)
        : "",
  };
}

function mergeProductIdentity(product: Product, editProduct?: Product) {
  if (!editProduct) return product;
  return {
    ...product,
    id: editProduct.id,
    slug: editProduct.slug,
    legacySlugs: editProduct.legacySlugs,
  };
}

function validProduct(product: Product) {
  return Boolean(product.name && product.sku && product.slug);
}

export function AdminProductCreateClient({
  initialProducts,
  editProduct,
  categoryMaster = [],
}: {
  initialProducts: Product[];
  editProduct?: Product;
  categoryMaster?: ProductCategoryMaster[];
}) {
  const isEdit = Boolean(editProduct);
  const [form, setForm] = useState<ProductForm>(() =>
    formFromProduct(editProduct),
  );
  const [variantOverrides, setVariantOverrides] = useState<
    Record<string, VariantOverride>
  >(() =>
    Object.fromEntries(
      (editProduct?.variants ?? []).map((variant) => [
        `${variant.color}__${variant.size}`,
        {
          sku: variant.sku,
          price: String(variant.price),
          stock: String(variant.stock),
        },
      ]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [pendingBulkProducts, setPendingBulkProducts] = useState<Product[]>([]);
  const [invalidBulkRows, setInvalidBulkRows] = useState(0);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = useMemo(() => {
    const masterPaths = categoryMaster
      .filter((category) => category.active !== false)
      .map((category) => category.path.filter(Boolean));
    const productPaths = initialProducts.map((product) =>
      product.categoryPath?.length ? product.categoryPath : [product.category],
    );
    const labels = [...masterPaths, ...productPaths]
      .map((path) => path.join(", "))
      .filter(Boolean);
    return Array.from(new Set(labels)).sort();
  }, [categoryMaster, initialProducts]);
  const fabricOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...masterFabrics,
          ...initialProducts.map((product) => product.fabric).filter(Boolean),
        ]),
      ).sort(),
    [initialProducts],
  );
  const selectedCare = splitList(form.care);
  const selectedColors = splitList(form.colors);
  const selectedSizes = splitList(form.sizes);
  const dealPreview = useMemo(() => {
    if (!form.dealEnabled || !form.dealEndsAt) return null;
    const iso = dealEndsAtFromInput(form.dealEndsAt);
    if (!iso) return null;
    return formatDealCountdown(iso);
  }, [form.dealEnabled, form.dealEndsAt]);
  const variantPreview = useMemo(
    () =>
      selectedColors.flatMap((color) =>
        selectedSizes.map((size) => {
          const key = `${color}__${size}`;
          const override = variantOverrides[key] ?? {};
          return {
            key,
            color,
            size,
            sku: (
              override.sku ||
              `${form.sku || "SKU"}-${color.slice(0, 3).toUpperCase()}-${size}`
            ).replace(/\s+/g, ""),
            stock:
              Number(override.stock) ||
              Number(form.variantStock) ||
              Math.floor(
                (Number(form.stock) || 0) /
                  Math.max(1, selectedColors.length * selectedSizes.length),
              ),
            price: Number(override.price) || Number(form.price) || 0,
          };
        }),
      ),
    [
      form.price,
      form.sku,
      form.stock,
      form.variantStock,
      selectedColors,
      selectedSizes,
      variantOverrides,
    ],
  );

  const update = (
    key: keyof ProductForm,
    value: ProductForm[keyof ProductForm],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateCategoryPath = (value: string) => {
    const path = splitList(value);
    setForm((current) => ({
      ...current,
      categoryPath: value,
      category: path.at(-1) ?? current.category,
    }));
  };

  const updateVariantOverride = (key: string, patch: VariantOverride) => {
    setVariantOverrides((current) => ({
      ...current,
      [key]: { ...(current[key] ?? {}), ...patch },
    }));
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
      const next = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      return { ...current, [key]: next.join(", ") };
    });
  };

  const toggleSizeGroup = (sizes: readonly string[]) => {
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
      const uploaded = await uploadFiles(files);
      setForm((current) => ({ ...current, images: uploaded }));
      setMessage(`${uploaded.length} image uploaded.`);
    } catch {
      setMessage("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      if (!res.ok) throw new Error("Image upload failed");
      const data = (await res.json()) as { url: string };
      uploaded.push(data.url);
    }
    return uploaded;
  };

  const uploadSpin360Images = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setMessage("");
    try {
      const uploaded = await uploadFiles(files);
      setForm((current) => ({
        ...current,
        spin360Images: [...current.spin360Images, ...uploaded].slice(0, 36),
      }));
      setMessage(`${uploaded.length} spin frame(s) uploaded.`);
    } catch {
      setMessage("360° frame upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const uploadFabricSwatch = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const [url] = await uploadFiles([file]);
      setForm((current) => ({ ...current, fabricSwatchImage: url }));
      setMessage("Fabric swatch uploaded.");
    } catch {
      setMessage("Fabric swatch upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const product = mergeProductIdentity(
      productFromForm(form, 0, variantOverrides),
      editProduct,
    );
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
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMessage(isEdit ? "Product updated." : "Product saved and published.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : isEdit
            ? "Product update failed."
            : "Product save failed.",
      );
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
      const res = await fetch("/api/admin/cms/products/bulk-preview", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as {
        products?: Product[];
        invalidRows?: number;
        error?: string;
      };
      if (!res.ok || !data.products?.length)
        throw new Error(data.error ?? "No valid products");

      setPendingBulkProducts(data.products);
      setInvalidBulkRows(data.invalidRows ?? 0);
      setMessage(
        `${data.products.length} products ready for review. ${data.invalidRows ? `${data.invalidRows} invalid rows skipped.` : "No invalid rows."}`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setPendingBulkProducts([]);
      setInvalidBulkRows(0);
      setMessage(
        error instanceof Error
          ? error.message
          : "Bulk upload failed. Use the sample Excel format.",
      );
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
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        count?: number;
      };
      if (!res.ok) {
        throw new Error(
          data.error ||
            (res.status === 524
              ? "Import timed out — try fewer rows or retry."
              : `Bulk import failed (${res.status})`),
        );
      }
      const count = data.count ?? pendingBulkProducts.length;
      setMessage(`${count} products imported. Now visible in Products List.`);
      setPendingBulkProducts([]);
      setInvalidBulkRows(0);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Bulk import failed.",
      );
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <form
      className="form-products-create form-type-2 sarjan-product-create"
      onSubmit={saveProduct}
    >
      <div className="flex flex-wrap justify-between gap14 items-center mb-30">
        <div>
          <div className="body-text text-secondary">
            {isEdit
              ? "Update product data. Frontend reads this from CMS/backend data."
              : "Create single product or bulk import products from Excel."}
          </div>
        </div>
        <div className="d-flex gap10 flex-wrap">
          {editProduct ? (
            <Link
              href={`/products/${editProduct.slug}`}
              className="tf-button"
              target="_blank"
            >
              Preview Frontend
            </Link>
          ) : null}
          <Link href="/admin/products-list" className="tf-button">
            Products List
          </Link>
          <button
            type="submit"
            className="tf-button text-btn-uppercase"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : isEdit
                ? "Update Product"
                : "Save & Publish"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="sarjan-admin-message mb-20">{message}</div>
      ) : null}

      <div className="wg-box p-40 sarjan-product-create-box">
        <div className="form-wrap">
          <div className="left">
            <div>
              <h6 className="mb-20">Products Image</h6>
              <div className="upload-image sarjan-product-main-upload">
                <div className="upload-img">
                  {form.images[0] ? (
                    <img
                      src={form.images[0]}
                      alt={form.name || "Product preview"}
                    />
                  ) : (
                    <div className="sarjan-product-upload-placeholder">
                      <i className="icon-image" />
                      <span>No image selected</span>
                    </div>
                  )}
                </div>
                <label className="uploadfile">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => uploadImages(event.target.files)}
                  />
                  <div className="upload-btn text-button font-instrument fw-6">
                    {uploading ? "Uploading..." : "Choose Files"}
                  </div>
                  <div className="text-caption-1 font-instrument text-secondary">
                    Upload JPG, PNG, WEBP. Multiple allowed.
                  </div>
                </label>
              </div>
            </div>

            {form.images.length ? (
              <button
                type="button"
                className="tf-button w-100"
                onClick={() => update("images", [])}
              >
                Remove Images
              </button>
            ) : null}

            <div>
              <h6 className="mb-20">Products Image</h6>
              <div className="upload-image style-1 sarjan-product-thumb-upload">
                <div className="upload-img">
                  {form.images.map((image) => (
                    <button
                      type="button"
                      className="item"
                      key={image}
                      onClick={() =>
                        update("images", [
                          image,
                          ...form.images.filter((item) => item !== image),
                        ])
                      }
                    >
                      <img src={image} alt="Product thumbnail" />
                    </button>
                  ))}
                  {Array.from({
                    length: Math.max(0, 4 - form.images.length),
                  }).map((_, index) => (
                    <div
                      className="item sarjan-product-empty-thumb"
                      key={index}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="sarjan-product-immersive-upload mt-24">
              <h6 className="mb-12">360° Spin Frames</h6>
              <p className="text-caption-1 text-secondary mb-16">
                Upload 8–36 photos in rotation order (frame 1 → last). Use a
                turntable or shoot every 10° around the product. Same background
                and lighting for all frames.
              </p>
              <label className="uploadfile mb-16">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => uploadSpin360Images(event.target.files)}
                />
                <div className="upload-btn text-button font-instrument fw-6">
                  {uploading ? "Uploading..." : "Upload Spin Frames"}
                </div>
              </label>
              {form.spin360Images.length ? (
                <>
                  <div className="sarjan-spin360-frame-grid mb-12">
                    {form.spin360Images.map((image, index) => (
                      <div
                        className="sarjan-spin360-frame"
                        key={`${image}-${index}`}
                      >
                        <span className="sarjan-spin360-frame-num">
                          {index + 1}
                        </span>
                        <img src={image} alt={`Spin frame ${index + 1}`} />
                        <button
                          type="button"
                          className="sarjan-spin360-frame-remove"
                          aria-label={`Remove frame ${index + 1}`}
                          onClick={() =>
                            update(
                              "spin360Images",
                              form.spin360Images.filter((_, i) => i !== index),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-caption-1 mb-12">
                    {form.spin360Images.length} frame
                    {form.spin360Images.length === 1 ? "" : "s"}
                    {form.spin360Images.length < 8
                      ? " — add at least 8 for 360° view"
                      : " — ready for 360° view"}
                  </p>
                  <button
                    type="button"
                    className="tf-button w-100"
                    onClick={() => update("spin360Images", [])}
                  >
                    Remove All Spin Frames
                  </button>
                </>
              ) : null}
            </div>

            <div className="sarjan-product-immersive-upload mt-24">
              <h6 className="mb-12">Fabric Swatch (AR / Zoom)</h6>
              <p className="text-caption-1 text-secondary mb-16">
                One high-resolution close-up of the fabric weave / print
                texture. Buyers use this for zoom and live camera preview on
                phone & web.
              </p>
              <div className="upload-image sarjan-product-main-upload">
                <div className="upload-img">
                  {form.fabricSwatchImage ? (
                    <img
                      src={form.fabricSwatchImage}
                      alt="Fabric swatch preview"
                    />
                  ) : (
                    <div className="sarjan-product-upload-placeholder">
                      <i className="icon-image" />
                      <span>No swatch uploaded</span>
                    </div>
                  )}
                </div>
                <label className="uploadfile">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => uploadFabricSwatch(event.target.files)}
                  />
                  <div className="upload-btn text-button font-instrument fw-6">
                    {uploading ? "Uploading..." : "Upload Fabric Swatch"}
                  </div>
                </label>
              </div>
              {form.fabricSwatchImage ? (
                <button
                  type="button"
                  className="tf-button w-100 mt-12"
                  onClick={() => update("fabricSwatchImage", "")}
                >
                  Remove Fabric Swatch
                </button>
              ) : null}
            </div>

            {!isEdit ? (
              <div className="sarjan-product-bulk-card">
                <div>
                  <h6 className="mb-4">Bulk Product Upload</h6>
                  <p className="text-secondary">
                    Download sample Excel, fill data, upload same file.{" "}
                    <code>stock_regular</code> / <code>stock_plus</code> ={" "}
                    <strong>full sets per color</strong> (10 = 10 complete sets,
                    not 10 pieces). Use <code>sizes_regular</code> +{" "}
                    <code>sizes_plus</code> for size groups up to 5XL.
                  </p>
                </div>
                <div className="sarjan-product-bulk-actions">
                  <a
                    className="tf-button"
                    href="/samples/sarjan-product-bulk-upload-sample.xlsx"
                    download
                  >
                    Download Sample Excel
                  </a>
                  <label className="tf-button style-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(event) =>
                        uploadBulkProducts(event.target.files)
                      }
                    />
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
                    <p className="text-secondary">
                      {pendingBulkProducts.length} valid products ready.{" "}
                      {invalidBulkRows} invalid rows skipped.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="tf-button text-btn-uppercase"
                    onClick={importReviewedProducts}
                    disabled={bulkUploading}
                  >
                    {bulkUploading
                      ? "Importing..."
                      : "Import Reviewed Products"}
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
                <p className="text-secondary">
                  Comprehensive textile product data for frontend catalog.
                </p>
              </div>
              <fieldset>
                <div className="text-title mb-8">
                  Status<span className="text-primary">*</span>
                </div>
                <div className="tf-item-select">
                  <div className="gap33 d-flex align-items-center">
                    <label className="gap12 d-flex align-items-center">
                      <input
                        type="radio"
                        name="status"
                        className="tf-check-rounded"
                        defaultChecked
                      />
                      <p>Published</p>
                    </label>
                    <label className="gap12 d-flex align-items-center">
                      <input
                        type="radio"
                        name="status"
                        className="tf-check-rounded"
                      />
                      <p>Draft</p>
                    </label>
                  </div>
                </div>
              </fieldset>
              <fieldset>
                <div className="text-button font-instrument fw-6 mb-8">
                  Name<span className="text-primary">*</span>
                </div>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  required
                />
              </fieldset>
              <fieldset>
                <div className="text-button font-instrument fw-6 mb-8">
                  SKU<span className="text-primary">*</span>
                </div>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(event) => update("sku", event.target.value)}
                  required
                />
              </fieldset>
              <fieldset>
                <div className="text-title mb-8">
                  Description<span className="text-primary">*</span>
                </div>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                  required
                />
              </fieldset>
              <div className="sarjan-seo-panel">
                <h6>Product SEO</h6>
                <p className="text-secondary">
                  Page-wise metadata and image alt text for Google/social
                  previews.
                </p>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">
                    URL Slug<span className="text-primary">*</span>
                  </div>
                  <input
                    type="text"
                    value={previewProductSlug(form)}
                    readOnly
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">
                    Image Alt Text
                  </div>
                  <input
                    type="text"
                    value={form.imageAlt}
                    onChange={(event) => update("imageAlt", event.target.value)}
                    placeholder="Ajrak black printed shirt for wholesale buyers"
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">
                    Meta Title
                  </div>
                  <input
                    type="text"
                    value={form.metaTitle}
                    onChange={(event) =>
                      update("metaTitle", event.target.value)
                    }
                    maxLength={70}
                    placeholder="Product page title"
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">
                    Meta Description
                  </div>
                  <textarea
                    rows={3}
                    value={form.metaDescription}
                    onChange={(event) =>
                      update("metaDescription", event.target.value)
                    }
                    maxLength={170}
                    placeholder="Search result description"
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">
                    Keywords
                  </div>
                  <input
                    type="text"
                    value={form.keywords}
                    onChange={(event) => update("keywords", event.target.value)}
                    placeholder="printed shirt, ajrak, cotton cambric"
                  />
                </fieldset>
              </div>
              <fieldset>
                <div className="text-button mb-8">
                  Categories<span className="text-primary">*</span>
                </div>
                <div className="tf-select">
                  <select
                    className="w-100"
                    value={form.categoryPath}
                    onChange={(event) => updateCategoryPath(event.target.value)}
                  >
                    {categories.map((categoryPath) => (
                      <option value={categoryPath} key={categoryPath}>
                        {splitList(categoryPath).join(" > ")}
                      </option>
                    ))}
                    <option value="New Collection">New Collection</option>
                  </select>
                </div>
              </fieldset>
              <fieldset>
                <div className="text-button mb-8">
                  Multi Level Category Path
                </div>
                <div className="tf-select">
                  <select
                    className="w-100"
                    value={form.categoryPath}
                    onChange={(event) => updateCategoryPath(event.target.value)}
                  >
                    {categories.map((categoryPath) => (
                      <option value={categoryPath} key={categoryPath}>
                        {splitList(categoryPath).join(" > ")}
                      </option>
                    ))}
                    <option value={form.category}>{form.category}</option>
                  </select>
                </div>
                <div className="text-caption-1 text-secondary mt-8">
                  Master paths come from Client Pricing category master.
                </div>
              </fieldset>
              <fieldset>
                <div className="text-button font-instrument fw-6 mb-8">
                  Fabric Type<span className="text-primary">*</span>
                </div>
                <div className="tf-select">
                  <select
                    className="w-100"
                    value={form.fabric}
                    onChange={(event) => update("fabric", event.target.value)}
                    required
                  >
                    <option value="">Select fabric type</option>
                    {fabricOptions.map((fabric) => (
                      <option key={fabric}>{fabric}</option>
                    ))}
                  </select>
                </div>
              </fieldset>
              <fieldset>
                <div className="text-button mb-8">Care Instructions</div>
                <div className="sarjan-product-check-grid">
                  {commonCareInstructions.map((care) => (
                    <label className="sarjan-product-check" key={care}>
                      <input
                        type="checkbox"
                        checked={selectedCare.includes(care)}
                        onChange={() => toggleListValue("care", care)}
                      />
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
                <p className="text-secondary">
                  Comma separated values for frontend filters and variants.
                </p>
              </div>
              <fieldset>
                <div className="text-title mb-8">
                  Colors<span className="text-primary">*</span>
                </div>
                <div className="sarjan-product-check-grid">
                  {commonColors.map((color) => (
                    <label className="sarjan-product-check" key={color}>
                      <input
                        type="checkbox"
                        checked={selectedColors.includes(color)}
                        onChange={() => toggleListValue("colors", color)}
                      />
                      <span>{color}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <div className="text-button mb-8">
                  Size<span className="text-primary">*</span>
                </div>
                <div className="sarjan-size-group-actions">
                  <button
                    type="button"
                    className="tf-button style-1"
                    onClick={() => toggleSizeGroup(SIZE_GROUPS.regular)}
                  >
                    {SIZE_GROUP_LABELS.regular}
                  </button>
                  <button
                    type="button"
                    className="tf-button style-1"
                    onClick={() => toggleSizeGroup(SIZE_GROUPS.plus)}
                  >
                    3XL to 5XL
                  </button>
                </div>
                <div className="sarjan-product-check-grid sarjan-product-size-grid">
                  {commonSizes.map((size) => (
                    <label className="sarjan-product-check" key={size}>
                      <input
                        type="checkbox"
                        checked={selectedSizes.includes(size)}
                        onChange={() => toggleListValue("sizes", size)}
                      />
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
                  <div className="text-button font-instrument mb-8">
                    Price<span className="text-primary">*</span>
                  </div>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(event) => update("price", event.target.value)}
                    required
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">
                    Regular sets (S–XXL)
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={form.stockRegularSets}
                    onChange={(event) =>
                      update("stockRegularSets", event.target.value)
                    }
                    placeholder="e.g. 10 = 10 full sets per color"
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">
                    Plus sets (3XL–5XL)
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={form.stockPlusSets}
                    onChange={(event) =>
                      update("stockPlusSets", event.target.value)
                    }
                    placeholder="e.g. 5 = 5 full sets per color"
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">
                    Default sets (fallback)
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={form.variantStock}
                    onChange={(event) =>
                      update("variantStock", event.target.value)
                    }
                    placeholder="When group fields are blank"
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">
                    MOQ<span className="text-primary">*</span>
                  </div>
                  <input
                    type="number"
                    value={form.moq}
                    onChange={(event) => update("moq", event.target.value)}
                    required
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">
                    Quantity<span className="text-primary">*</span>
                  </div>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(event) => update("stock", event.target.value)}
                    required
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">
                    Reserved
                  </div>
                  <input
                    type="number"
                    value={form.reserved}
                    onChange={(event) => update("reserved", event.target.value)}
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">Sold</div>
                  <input
                    type="number"
                    value={form.sold}
                    onChange={(event) => update("sold", event.target.value)}
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument mb-8">
                    Featured
                  </div>
                  <label className="sarjan-product-switch">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(event) =>
                        update("isFeatured", event.target.checked)
                      }
                    />
                    <span>Show in featured sections</span>
                  </label>
                </fieldset>
              </div>

              <fieldset>
                <div className="text-button font-instrument mb-8">
                  Catalog availability
                </div>
                <label className="sarjan-product-switch mb-12">
                  <input
                    type="checkbox"
                    checked={form.catalogActive}
                    onChange={(event) =>
                      update("catalogActive", event.target.checked)
                    }
                  />
                  <span>
                    Active in catalog (customers can browse and order)
                  </span>
                </label>
                <fieldset>
                  <div className="text-button font-instrument mb-8">
                    Dealer tiers (optional)
                  </div>
                  <input
                    type="text"
                    value={form.dealerTiers}
                    onChange={(event) =>
                      update("dealerTiers", event.target.value)
                    }
                    placeholder="standard, premium, dealer"
                  />
                  <p className="body-text text-secondary mb-0 mt-8">
                    Leave blank for all tiers. Comma-separated list restricts
                    who can purchase this SKU.
                  </p>
                </fieldset>
              </fieldset>

              <fieldset className="sarjan-deal-panel">
                <div className="text-button font-instrument mb-8">
                  Timed deal (countdown + price drop)
                </div>
                <label className="sarjan-product-switch mb-12">
                  <input
                    type="checkbox"
                    checked={form.dealEnabled}
                    onChange={(event) =>
                      update("dealEnabled", event.target.checked)
                    }
                  />
                  <span>Enable deal timer on this product</span>
                </label>
                {form.dealEnabled ? (
                  <div className="sarjan-product-field-grid">
                    <fieldset>
                      <div className="text-button font-instrument mb-8">
                        Deal ends at
                      </div>
                      <input
                        type="datetime-local"
                        value={form.dealEndsAt}
                        onChange={(event) =>
                          update("dealEndsAt", event.target.value)
                        }
                        required={form.dealEnabled}
                      />
                      {dealPreview ? (
                        <div className="body-text text-secondary mt-8">
                          Live preview: {dealPreview}
                        </div>
                      ) : null}
                    </fieldset>
                    <fieldset>
                      <div className="text-button font-instrument mb-8">
                        Deal price (per piece)
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={form.dealPrice}
                        onChange={(event) =>
                          update("dealPrice", event.target.value)
                        }
                        placeholder="Lower than regular price"
                        required={form.dealEnabled}
                      />
                      {form.price && form.dealPrice ? (
                        <div className="body-text text-secondary mt-8">
                          Regular ₹{form.price} → Deal ₹{form.dealPrice}
                        </div>
                      ) : null}
                    </fieldset>
                  </div>
                ) : null}
                <p className="body-text text-secondary mb-0 mt-8">
                  App & website show a countdown until the timer ends, then
                  revert to the regular price automatically.
                </p>
              </fieldset>

              {selectedSizes.length ? (
                <fieldset>
                  <div className="text-button font-instrument mb-8">
                    Size-wise Price
                  </div>
                  <div className="sarjan-size-price-grid">
                    {selectedSizes.map((size) => (
                      <label className="sarjan-size-price-item" key={size}>
                        <span>{size}</span>
                        <input
                          type="number"
                          value={sizePriceValue(size)}
                          onChange={(event) =>
                            updateSizePrice(size, event.target.value)
                          }
                          placeholder="Price"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="text-caption-1 text-secondary mt-8">
                    Set different price for each size. These values auto-fill
                    the color-size matrix below.
                  </div>
                </fieldset>
              ) : null}
              <fieldset>
                <div className="text-button font-instrument mb-8">
                  Pricing Rules
                </div>
                <textarea
                  rows={4}
                  value={form.pricingRules}
                  onChange={(event) =>
                    update("pricingRules", event.target.value)
                  }
                  placeholder={"Min Qty, Price\n50, 620\n100, 590"}
                />
                <div className="text-caption-1 text-secondary mt-8">
                  One rule per line. Frontend/backend can use this for client
                  pricing slabs.
                </div>
              </fieldset>
              {variantPreview.length ? (
                <div className="sarjan-product-bulk-review">
                  <div className="flex justify-between gap12 items-center mb-16">
                    <div>
                      <h6 className="mb-4">Variant Matrix Preview</h6>
                      <p className="text-secondary">
                        {variantPreview.length} color-size variants can be
                        edited individually for SKU, price, and stock.
                      </p>
                    </div>
                    <span className="box-status text-button type-delivery sarjan-product-variant-count-badge">
                      {`${selectedColors.length} colors / ${selectedSizes.length} sizes`}
                    </span>
                  </div>
                  <div className="sarjan-product-bulk-table sarjan-variant-matrix-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Color</th>
                          <th>Size</th>
                          <th>SKU</th>
                          <th>Price</th>
                          <th>Sets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variantPreview.map((variant) => (
                          <tr key={`${variant.color}-${variant.size}`}>
                            <td>{variant.color}</td>
                            <td>{variant.size}</td>
                            <td className="sarjan-variant-matrix-sku">
                              <input
                                type="text"
                                className="sarjan-variant-matrix-input"
                                value={variant.sku}
                                title={variant.sku}
                                spellCheck={false}
                                onChange={(event) =>
                                  updateVariantOverride(variant.key, {
                                    sku: event.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="sarjan-variant-matrix-input sarjan-variant-matrix-input--compact"
                                value={variant.price}
                                onChange={(event) =>
                                  updateVariantOverride(variant.key, {
                                    price: event.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="sarjan-variant-matrix-input sarjan-variant-matrix-input--compact"
                                value={variant.stock}
                                onChange={(event) =>
                                  updateVariantOverride(variant.key, {
                                    stock: event.target.value,
                                  })
                                }
                              />
                            </td>
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
