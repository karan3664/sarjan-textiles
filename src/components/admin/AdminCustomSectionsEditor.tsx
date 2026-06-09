"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { Product } from "@/data/mock";
import type {
  CmsCustomBlock,
  CmsCustomBlockType,
  CmsCustomCardItem,
  CmsCustomSection,
} from "@/types/cms-custom";
import { AdminCmsImageDisplayFields } from "@/components/admin/AdminCmsImageDisplayFields";
import { CustomCmsImageBlock } from "@/components/shared/CustomCmsImageBlock";
import { CMS_IMAGE_DEFAULTS } from "@/lib/cms-image-display";

type UploadState = Record<string, "uploading" | string | undefined>;

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function blankBlock(type: CmsCustomBlockType): CmsCustomBlock {
  const id = uid(type);
  if (type === "text")
    return { id, type, heading: "New heading", body: "Add section text here." };
  if (type === "image")
    return {
      id,
      type,
      image: "/sarjan-assets/banner-textiles-studio.webp",
      alt: "Sarjan Textiles",
      imageSize: CMS_IMAGE_DEFAULTS.imageSize,
      imageWidthPercent: CMS_IMAGE_DEFAULTS.imageWidthPercent,
      imageAlign: CMS_IMAGE_DEFAULTS.imageAlign,
      imageFit: CMS_IMAGE_DEFAULTS.imageFit,
      imageAspect: CMS_IMAGE_DEFAULTS.imageAspect,
    };
  if (type === "button")
    return { id, type, label: "Explore Now", href: "/products" };
  if (type === "cards")
    return {
      id,
      type: "cards",
      items: [
        {
          id: uid("card"),
          title: "Card title",
          body: "Short description for this tile.",
          image: "/sarjan-assets/banner-textiles-studio.webp",
          href: "/products",
        },
      ],
    };
  return { id, type, productSlug: "" };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset>
      <div className="body-title mb-10">{label}</div>
      {children}
    </fieldset>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function AdminCustomSectionsEditor({
  title = "Custom Sections",
  description = "Add your own section name and content blocks. Frontend renders these in saved order.",
  sections,
  onChange,
  products,
}: {
  title?: string;
  description?: string;
  sections: CmsCustomSection[];
  onChange: (sections: CmsCustomSection[]) => void;
  products: Product[];
}) {
  const [uploadState, setUploadState] = useState<UploadState>({});

  const updateSection = (index: number, patch: Partial<CmsCustomSection>) => {
    onChange(
      sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...patch } : section,
      ),
    );
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const next = [...sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const reorderSections = (from: number, to: number) => {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= sections.length ||
      to >= sections.length
    )
      return;
    const next = [...sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const duplicateSection = (index: number) => {
    const source = sections[index];
    const copy: CmsCustomSection = {
      ...source,
      id: uid("custom"),
      title: `${source.title || "Custom Section"} Copy`,
      blocks: (source.blocks ?? []).map((block) => ({
        ...block,
        id: uid(block.type),
      })),
    };
    onChange([
      ...sections.slice(0, index + 1),
      copy,
      ...sections.slice(index + 1),
    ]);
  };

  const removeSection = (index: number) => {
    onChange(sections.filter((_, sectionIndex) => sectionIndex !== index));
  };

  const addSection = () => {
    onChange([
      ...sections,
      {
        id: uid("custom"),
        title: "New Custom Section",
        subtitle: "",
        enabled: true,
        layout: "grid",
        blocks: [blankBlock("text")],
      },
    ]);
  };

  const updateBlock = (
    sectionIndex: number,
    blockIndex: number,
    patch: Partial<CmsCustomBlock>,
  ) => {
    const section = sections[sectionIndex];
    const blocks = (section.blocks ?? []).map((block, index) =>
      index === blockIndex ? { ...block, ...patch } : block,
    );
    updateSection(sectionIndex, { blocks });
  };

  const addBlock = (sectionIndex: number, type: CmsCustomBlockType) => {
    const section = sections[sectionIndex];
    updateSection(sectionIndex, {
      blocks: [...(section.blocks ?? []), blankBlock(type)],
    });
  };

  const removeBlock = (sectionIndex: number, blockIndex: number) => {
    const section = sections[sectionIndex];
    updateSection(sectionIndex, {
      blocks: (section.blocks ?? []).filter((_, index) => index !== blockIndex),
    });
  };

  const reorderBlocks = (sectionIndex: number, from: number, to: number) => {
    const section = sections[sectionIndex];
    const blocks = [...(section.blocks ?? [])];
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= blocks.length ||
      to >= blocks.length
    )
      return;
    const [item] = blocks.splice(from, 1);
    blocks.splice(to, 0, item);
    updateSection(sectionIndex, { blocks });
  };

  const uploadBlockImage = async (
    sectionIndex: number,
    blockIndex: number,
    file: File,
  ) => {
    const key = `custom-${sectionIndex}-${blockIndex}`;
    setUploadState((current) => ({ ...current, [key]: "uploading" }));
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { url: string };
      updateBlock(sectionIndex, blockIndex, { image: data.url });
      setUploadState((current) => ({ ...current, [key]: undefined }));
    } catch {
      setUploadState((current) => ({ ...current, [key]: "Upload failed" }));
    }
  };

  const updateCardItem = (
    sectionIndex: number,
    blockIndex: number,
    itemIndex: number,
    patch: Partial<CmsCustomCardItem>,
  ) => {
    const section = sections[sectionIndex];
    const block = (section.blocks ?? [])[blockIndex];
    if (!block || block.type !== "cards") return;
    const items = [...(block.items ?? [])];
    const row = items[itemIndex];
    if (!row) return;
    items[itemIndex] = { ...row, ...patch };
    updateBlock(sectionIndex, blockIndex, { items });
  };

  const addCardItem = (sectionIndex: number, blockIndex: number) => {
    const section = sections[sectionIndex];
    const block = (section.blocks ?? [])[blockIndex];
    if (!block || block.type !== "cards") return;
    const items = [
      ...(block.items ?? []),
      {
        id: uid("card"),
        title: "New card",
        body: "",
        href: "/products",
        image: "",
      },
    ];
    updateBlock(sectionIndex, blockIndex, { items });
  };

  const removeCardItem = (
    sectionIndex: number,
    blockIndex: number,
    itemIndex: number,
  ) => {
    const section = sections[sectionIndex];
    const block = (section.blocks ?? [])[blockIndex];
    if (!block || block.type !== "cards") return;
    const items = (block.items ?? []).filter((_, i) => i !== itemIndex);
    updateBlock(sectionIndex, blockIndex, { items });
  };

  const uploadCardImage = async (
    sectionIndex: number,
    blockIndex: number,
    itemIndex: number,
    file: File,
  ) => {
    const key = `card-${sectionIndex}-${blockIndex}-${itemIndex}`;
    setUploadState((current) => ({ ...current, [key]: "uploading" }));
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { url: string };
      updateCardItem(sectionIndex, blockIndex, itemIndex, { image: data.url });
      setUploadState((current) => ({ ...current, [key]: undefined }));
    } catch {
      setUploadState((current) => ({ ...current, [key]: "Upload failed" }));
    }
  };

  return (
    <div className="wg-box mb-30 sarjan-home-editor-card">
      <div className="flex flex-wrap justify-between gap14 items-center mb-24">
        <div>
          <h5>{title}</h5>
          <div className="body-text text-secondary">{description}</div>
        </div>
        <button
          type="button"
          className="tf-button style-1"
          onClick={addSection}
        >
          Add New Section
        </button>
      </div>

      <div className="d-grid gap-3">
        {sections.map((section, index) => (
          <div
            className="sarjan-section-builder-card"
            key={section.id}
            draggable
            onDragStart={(event) =>
              event.dataTransfer.setData("text/section-index", String(index))
            }
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) =>
              reorderSections(
                Number(event.dataTransfer.getData("text/section-index")),
                index,
              )
            }
          >
            <div className="sarjan-section-builder-row">
              <div className="d-flex align-items-center gap10">
                <span className="box-status text-button type-delivery sarjan-drag-handle">
                  Drag {index + 1}
                </span>
                <div>
                  <h6>{section.title || "Custom Section"}</h6>
                  <div className="text-caption-1 text-secondary">
                    {section.enabled === false ? "Hidden" : "Visible"}
                  </div>
                </div>
              </div>
              <div className="sarjan-section-builder-actions">
                <button
                  type="button"
                  className="tf-button"
                  onClick={() => moveSection(index, -1)}
                  disabled={index === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="tf-button"
                  onClick={() => moveSection(index, 1)}
                  disabled={index === sections.length - 1}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="tf-button"
                  onClick={() =>
                    updateSection(index, { enabled: section.enabled === false })
                  }
                >
                  {section.enabled === false ? "Show" : "Hide"}
                </button>
                <button
                  type="button"
                  className="tf-button"
                  onClick={() => duplicateSection(index)}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="tf-button"
                  onClick={() => removeSection(index)}
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="sarjan-custom-section-editor">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
                <Field label="Section name">
                  <TextInput
                    value={section.title ?? ""}
                    onChange={(value) => updateSection(index, { title: value })}
                    placeholder="Example: Summer Collection"
                  />
                </Field>
                <Field label="Layout">
                  <select
                    value={section.layout ?? "grid"}
                    onChange={(event) =>
                      updateSection(index, {
                        layout: event.target
                          .value as CmsCustomSection["layout"],
                      })
                    }
                  >
                    <option value="grid">Grid</option>
                    <option value="banner">Banner</option>
                    <option value="split">Split</option>
                  </select>
                </Field>
              </div>
              <Field label="Section subtitle">
                <textarea
                  value={section.subtitle ?? ""}
                  onChange={(event) =>
                    updateSection(index, { subtitle: event.target.value })
                  }
                  placeholder="Optional subtitle shown under section name"
                />
              </Field>

              <div className="sarjan-custom-block-actions">
                <span className="body-title">Add content:</span>
                {(
                  [
                    "text",
                    "image",
                    "button",
                    "product",
                    "cards",
                  ] as CmsCustomBlockType[]
                ).map((type) => (
                  <button
                    type="button"
                    className="tf-button"
                    onClick={() => addBlock(index, type)}
                    key={type}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="sarjan-custom-block-grid">
                {(section.blocks ?? []).map((block, blockIndex) => {
                  const uploadKey = `custom-${index}-${blockIndex}`;
                  return (
                    <div
                      className="sarjan-custom-block-card"
                      key={block.id}
                      draggable
                      onDragStart={(event) =>
                        event.dataTransfer.setData(
                          "text/block-index",
                          String(blockIndex),
                        )
                      }
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) =>
                        reorderBlocks(
                          index,
                          Number(
                            event.dataTransfer.getData("text/block-index"),
                          ),
                          blockIndex,
                        )
                      }
                    >
                      <div className="flex justify-between gap10 items-center mb-16">
                        <span className="box-status text-button type-delivery sarjan-drag-handle">
                          Drag {block.type}
                        </span>
                        <div className="d-flex gap8 flex-wrap">
                          <button
                            type="button"
                            className="tf-button"
                            onClick={() =>
                              reorderBlocks(index, blockIndex, blockIndex - 1)
                            }
                            disabled={blockIndex === 0}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            className="tf-button"
                            onClick={() =>
                              reorderBlocks(index, blockIndex, blockIndex + 1)
                            }
                            disabled={
                              blockIndex === (section.blocks ?? []).length - 1
                            }
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            className="tf-button"
                            onClick={() => removeBlock(index, blockIndex)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {block.type === "text" ? (
                        <div className="d-grid gap-3">
                          <Field label="Heading">
                            <TextInput
                              value={block.heading ?? ""}
                              onChange={(value) =>
                                updateBlock(index, blockIndex, {
                                  heading: value,
                                })
                              }
                            />
                          </Field>
                          <Field label="Text">
                            <textarea
                              value={block.body ?? ""}
                              onChange={(event) =>
                                updateBlock(index, blockIndex, {
                                  body: event.target.value,
                                })
                              }
                            />
                          </Field>
                        </div>
                      ) : null}

                      {block.type === "image" ? (
                        <div className="d-grid gap-3">
                          <CustomCmsImageBlock
                            className="sarjan-custom-image-admin-preview"
                            src={
                              block.image ||
                              "/sarjan-assets/banner-textiles-studio.webp"
                            }
                            alt={block.alt ?? ""}
                            display={block}
                          />
                          <label className="sarjan-category-upload">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file)
                                  uploadBlockImage(index, blockIndex, file);
                                event.currentTarget.value = "";
                              }}
                            />
                            <span>
                              {uploadState[uploadKey] === "uploading"
                                ? "Uploading..."
                                : "Upload Image / Banner"}
                            </span>
                            <small>JPG, PNG, WEBP</small>
                          </label>
                          {uploadState[uploadKey] &&
                          uploadState[uploadKey] !== "uploading" ? (
                            <div className="text-tiny text-danger">
                              {uploadState[uploadKey]}
                            </div>
                          ) : null}
                          <Field label="Alt text">
                            <TextInput
                              value={block.alt ?? ""}
                              onChange={(value) =>
                                updateBlock(index, blockIndex, { alt: value })
                              }
                            />
                          </Field>
                          <AdminCmsImageDisplayFields
                            value={block}
                            onChange={(patch) =>
                              updateBlock(index, blockIndex, patch)
                            }
                          />
                        </div>
                      ) : null}

                      {block.type === "button" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field label="Button label">
                            <TextInput
                              value={block.label ?? ""}
                              onChange={(value) =>
                                updateBlock(index, blockIndex, { label: value })
                              }
                            />
                          </Field>
                          <Field label="Button link">
                            <TextInput
                              value={block.href ?? ""}
                              onChange={(value) =>
                                updateBlock(index, blockIndex, { href: value })
                              }
                            />
                          </Field>
                        </div>
                      ) : null}

                      {block.type === "product" ? (
                        <Field label="Product">
                          <select
                            value={block.productSlug ?? ""}
                            onChange={(event) =>
                              updateBlock(index, blockIndex, {
                                productSlug: event.target.value,
                              })
                            }
                          >
                            <option value="">Select Product</option>
                            {products.slice(0, 500).map((product) => (
                              <option value={product.slug} key={product.slug}>
                                {product.name} / {product.sku}
                              </option>
                            ))}
                          </select>
                        </Field>
                      ) : null}

                      {block.type === "cards" ? (
                        <div className="d-grid gap-3">
                          <div className="body-text text-secondary">
                            Card grid: each row is a tile with optional image,
                            title, text, and link (e.g. subcategory or
                            campaign).
                          </div>
                          {(block.items ?? []).map((item, itemIndex) => {
                            const cardKey = `card-${index}-${blockIndex}-${itemIndex}`;
                            return (
                              <div
                                key={item.id}
                                className="border border-secondary rounded p-16 d-grid gap-3"
                              >
                                <div className="d-flex justify-between gap10 flex-wrap">
                                  <span className="text-button">
                                    Card {itemIndex + 1}
                                  </span>
                                  <button
                                    type="button"
                                    className="tf-button"
                                    onClick={() =>
                                      removeCardItem(
                                        index,
                                        blockIndex,
                                        itemIndex,
                                      )
                                    }
                                  >
                                    Remove card
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <Field label="Title">
                                    <TextInput
                                      value={item.title}
                                      onChange={(value) =>
                                        updateCardItem(
                                          index,
                                          blockIndex,
                                          itemIndex,
                                          { title: value },
                                        )
                                      }
                                    />
                                  </Field>
                                  <Field label="Link (href)">
                                    <TextInput
                                      value={item.href}
                                      onChange={(value) =>
                                        updateCardItem(
                                          index,
                                          blockIndex,
                                          itemIndex,
                                          { href: value },
                                        )
                                      }
                                    />
                                  </Field>
                                </div>
                                <Field label="Description">
                                  <textarea
                                    value={item.body ?? ""}
                                    onChange={(event) =>
                                      updateCardItem(
                                        index,
                                        blockIndex,
                                        itemIndex,
                                        { body: event.target.value },
                                      )
                                    }
                                  />
                                </Field>
                                <label className="sarjan-category-upload">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      if (file)
                                        uploadCardImage(
                                          index,
                                          blockIndex,
                                          itemIndex,
                                          file,
                                        );
                                      event.currentTarget.value = "";
                                    }}
                                  />
                                  <span>
                                    {uploadState[cardKey] === "uploading"
                                      ? "Uploading..."
                                      : "Upload tile image"}
                                  </span>
                                </label>
                                {uploadState[cardKey] &&
                                uploadState[cardKey] !== "uploading" ? (
                                  <div className="text-tiny text-danger">
                                    {uploadState[cardKey]}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            className="tf-button style-1"
                            onClick={() => addCardItem(index, blockIndex)}
                          >
                            Add card to grid
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
