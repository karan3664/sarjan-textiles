"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AdminCustomSectionsEditor } from "@/components/admin/AdminCustomSectionsEditor";
import { AdminHtmlEditor } from "@/components/admin/AdminHtmlEditor";
import type { Product } from "@/data/mock";
import type { CmsBlog } from "@/lib/cms-store";
import type { CmsCustomSection } from "@/types/cms-custom";

type BlogForm = {
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  date: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
};

type BlogBlock = {
  id: string;
  type: "text" | "image";
  value: string;
};

type CmsBlogWithSections = CmsBlog & {
  sections?: CmsCustomSection[];
};

type CmsBlogWithSeo = CmsBlogWithSections & {
  imageAlt?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
};

const emptyForm: BlogForm = {
  title: "",
  slug: "",
  excerpt: "",
  image: "",
  imageAlt: "",
  date: new Date().toISOString().slice(0, 10),
  content: "",
  metaTitle: "",
  metaDescription: "",
  keywords: "",
};

const blockPrefix = "__SARJAN_BLOG_BLOCKS__";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formFromBlog(blog?: CmsBlog): BlogForm {
  if (!blog) return emptyForm;
  return {
    title: blog.title,
    slug: blog.slug,
    excerpt: blog.excerpt,
    image: blog.image,
    imageAlt: (blog as CmsBlogWithSeo).imageAlt ?? "",
    date: blog.date,
    content: blog.content,
    metaTitle: (blog as CmsBlogWithSeo).metaTitle ?? "",
    metaDescription: (blog as CmsBlogWithSeo).metaDescription ?? "",
    keywords: (blog as CmsBlogWithSeo).keywords ?? "",
  };
}

function createBlock(type: BlogBlock["type"], value = ""): BlogBlock {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    value,
  };
}

function blocksFromContent(content: string): BlogBlock[] {
  if (content.startsWith(blockPrefix)) {
    try {
      const blocks = JSON.parse(
        content.slice(blockPrefix.length),
      ) as BlogBlock[];
      if (Array.isArray(blocks) && blocks.length)
        return blocks.map((block) => ({
          ...block,
          id: block.id || createBlock(block.type).id,
        }));
    } catch {
      return [createBlock("text", content)];
    }
  }
  return [createBlock("text", content)];
}

function contentFromBlocks(blocks: BlogBlock[]) {
  return `${blockPrefix}${JSON.stringify(blocks.filter((block) => block.value.trim()))}`;
}

function blogFromForm(
  form: BlogForm,
  blocks: BlogBlock[],
  sections: CmsCustomSection[],
): CmsBlogWithSeo {
  return {
    title: form.title.trim(),
    slug: form.slug.trim() || slugify(form.title),
    excerpt: form.excerpt.trim(),
    image: form.image || "/sarjan-assets/banner-textiles-studio.webp",
    imageAlt: form.imageAlt.trim() || `${form.title.trim()} blog image`,
    date: form.date,
    content: contentFromBlocks(blocks),
    metaTitle: form.metaTitle.trim() || form.title.trim(),
    metaDescription:
      form.metaDescription.trim() || form.excerpt.trim().slice(0, 155),
    keywords: form.keywords.trim(),
    sections,
  };
}

export function AdminBlogCreateClient({
  initialBlogs,
  editBlog,
  products,
}: {
  initialBlogs: CmsBlog[];
  editBlog?: CmsBlog;
  products: Product[];
}) {
  const isEdit = Boolean(editBlog);
  const [form, setForm] = useState<BlogForm>(() => formFromBlog(editBlog));
  const [blocks, setBlocks] = useState<BlogBlock[]>(() =>
    blocksFromContent(editBlog?.content ?? ""),
  );
  const [sections, setSections] = useState<CmsCustomSection[]>(
    () => (editBlog as CmsBlogWithSections | undefined)?.sections ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const existingSlugs = useMemo(
    () =>
      new Set(
        initialBlogs
          .filter((blog) => blog.slug !== editBlog?.slug)
          .map((blog) => blog.slug),
      ),
    [editBlog?.slug, initialBlogs],
  );

  const update = (key: keyof BlogForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadImage = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      if (!res.ok) throw new Error("Image upload failed");
      const data = (await res.json()) as { url: string };
      update("image", data.url);
      setMessage("Blog image uploaded.");
    } catch {
      setMessage("Blog image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const uploadBlockImage = async (file: File | null, id: string) => {
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body });
      if (!res.ok) throw new Error("Image upload failed");
      const data = (await res.json()) as { url: string };
      setBlocks((current) =>
        current.map((block) =>
          block.id === id ? { ...block, value: data.url } : block,
        ),
      );
      setMessage("Content image uploaded.");
    } catch {
      setMessage("Content image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const updateBlock = (id: string, value: string) => {
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, value } : block)),
    );
  };

  const removeBlock = (id: string) => {
    setBlocks((current) =>
      current.length > 1 ? current.filter((block) => block.id !== id) : current,
    );
  };

  const saveBlog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const blog = blogFromForm(form, blocks, sections);
    if (!blog.title || !blog.slug) {
      setMessage("Title and slug required.");
      return;
    }
    if (existingSlugs.has(blog.slug)) {
      setMessage("Slug already exists.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/cms/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blog),
      });
      if (!res.ok) throw new Error("Save failed");
      setMessage(isEdit ? "Blog updated." : "Blog saved and published.");
    } catch {
      setMessage(isEdit ? "Blog update failed." : "Blog save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="form-products-create form-type-2 sarjan-product-create"
      onSubmit={saveBlog}
    >
      <div className="flex flex-wrap justify-between gap14 items-center mb-30">
        <div className="body-text text-secondary">
          {isEdit
            ? "Update blog content. Frontend reads this from CMS/backend data."
            : "Create blog content for frontend blog page."}
        </div>
        <div className="d-flex gap10 flex-wrap">
          {editBlog ? (
            <Link
              href={`/blog/${editBlog.slug}`}
              className="tf-button"
              target="_blank"
            >
              Preview Frontend
            </Link>
          ) : null}
          <Link href="/admin/blogs-list" className="tf-button">
            Blogs List
          </Link>
          <button
            type="submit"
            className="tf-button text-btn-uppercase"
            disabled={saving}
          >
            {saving ? "Saving..." : isEdit ? "Update Blog" : "Save & Publish"}
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
              <h6 className="mb-20">Blog Image</h6>
              <div className="upload-image sarjan-product-main-upload sarjan-blog-main-upload">
                <div className="upload-img">
                  {form.image ? (
                    <img src={form.image} alt={form.title || "Blog preview"} />
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
                    onChange={(event) =>
                      uploadImage(event.target.files?.[0] ?? null)
                    }
                  />
                  <div className="upload-btn text-button font-instrument fw-6">
                    {uploading ? "Uploading..." : "Choose File"}
                  </div>
                  <div className="text-caption-1 font-instrument text-secondary">
                    Upload JPG, PNG, WEBP.
                  </div>
                </label>
              </div>
            </div>
            {form.image ? (
              <button
                type="button"
                className="tf-button w-100"
                onClick={() => update("image", "")}
              >
                Remove Image
              </button>
            ) : null}
          </div>

          <div className="right">
            <div className="d-flex flex-column gap20">
              <div>
                <h6 className="mb-4">Blog Description</h6>
                <p className="text-secondary">
                  SEO-ready blog content for website.
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
                  Title<span className="text-primary">*</span>
                </div>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => {
                    const title = event.target.value;
                    setForm((current) => ({
                      ...current,
                      title,
                      slug:
                        current.slug && isEdit ? current.slug : slugify(title),
                    }));
                  }}
                  required
                />
              </fieldset>
              <fieldset>
                <div className="text-button font-instrument fw-6 mb-8">
                  URL Slug<span className="text-primary">*</span>
                </div>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(event) =>
                    update("slug", slugify(event.target.value))
                  }
                  required
                />
              </fieldset>
              <fieldset>
                <div className="text-button font-instrument fw-6 mb-8">
                  Date<span className="text-primary">*</span>
                </div>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => update("date", event.target.value)}
                  required
                />
              </fieldset>
              <fieldset>
                <div className="text-title mb-8">
                  Short Excerpt<span className="text-primary">*</span>
                </div>
                <AdminHtmlEditor
                  compact
                  rows={3}
                  value={form.excerpt}
                  onChange={(value) => update("excerpt", value)}
                  placeholder="Short summary for blog list and SEO"
                />
              </fieldset>
              <div className="sarjan-seo-panel">
                <h6>Blog SEO</h6>
                <p className="text-secondary">
                  Page title, search description, keywords, and image alt text.
                </p>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">
                    Main Image Alt Text
                  </div>
                  <input
                    value={form.imageAlt}
                    onChange={(event) => update("imageAlt", event.target.value)}
                    placeholder="B2B textile buying guide cover image"
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">
                    Meta Title
                  </div>
                  <input
                    value={form.metaTitle}
                    onChange={(event) =>
                      update("metaTitle", event.target.value)
                    }
                    maxLength={70}
                    placeholder="SEO title"
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
                    placeholder="SEO description"
                  />
                </fieldset>
                <fieldset>
                  <div className="text-button font-instrument fw-6 mb-8">
                    Keywords
                  </div>
                  <input
                    value={form.keywords}
                    onChange={(event) => update("keywords", event.target.value)}
                    placeholder="textile buying, wholesale, dispatch"
                  />
                </fieldset>
              </div>
              <fieldset>
                <div className="flex justify-between gap12 items-center mb-12">
                  <div>
                    <div className="text-title mb-4">
                      Content Blocks<span className="text-primary">*</span>
                    </div>
                    <p className="text-secondary">
                      Add text and images in article order.
                    </p>
                  </div>
                  <div className="d-flex gap8 flex-wrap">
                    <button
                      type="button"
                      className="tf-button"
                      onClick={() =>
                        setBlocks((current) => [
                          ...current,
                          createBlock("text"),
                        ])
                      }
                    >
                      Add Text
                    </button>
                    <button
                      type="button"
                      className="tf-button"
                      onClick={() =>
                        setBlocks((current) => [
                          ...current,
                          createBlock("image"),
                        ])
                      }
                    >
                      Add Image
                    </button>
                  </div>
                </div>
                <div className="sarjan-blog-block-editor">
                  {blocks.map((block, index) => (
                    <div className="sarjan-blog-block" key={block.id}>
                      <div className="sarjan-blog-block-head">
                        <span>
                          {index + 1}.{" "}
                          {block.type === "text" ? "Text" : "Image"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeBlock(block.id)}
                        >
                          Remove
                        </button>
                      </div>
                      {block.type === "text" ? (
                        <AdminHtmlEditor
                          value={block.value}
                          onChange={(value) => updateBlock(block.id, value)}
                          placeholder="Write article text — bold, lists, line breaks supported"
                          rows={8}
                        />
                      ) : (
                        <div className="sarjan-blog-block-image">
                          {block.value ? (
                            <img src={block.value} alt="Blog content" />
                          ) : (
                            <div className="sarjan-product-upload-placeholder">
                              <i className="icon-image" />
                              <span>No image selected</span>
                            </div>
                          )}
                          <label className="tf-button">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) =>
                                uploadBlockImage(
                                  event.target.files?.[0] ?? null,
                                  block.id,
                                )
                              }
                            />
                            {uploading ? "Uploading..." : "Upload Image"}
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      </div>

      <AdminCustomSectionsEditor
        title="Blog Custom Sections"
        description="Add optional blog sections: text, image/banner, button, or product card. They render after article content."
        sections={sections}
        onChange={setSections}
        products={products}
      />
    </form>
  );
}
