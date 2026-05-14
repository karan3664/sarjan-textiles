"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/mock";
import type { CmsBlog, CmsSnapshot } from "@/lib/cms-store";

type SaveState = "idle" | "saving" | "saved" | "error";

const emptyProduct: Product = {
  id: "PRD-NEW",
  slug: "new-product",
  name: "New Product",
  sku: "SAR-NEW",
  category: "Printed Shirts",
  fabric: "Cotton",
  price: 0,
  moq: 24,
  stock: 0,
  reserved: 0,
  sold: 0,
  colors: ["Black"],
  sizes: ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"],
  images: ["/sarjan-assets/shirt-ajrak-black-studio.webp"],
  description: "",
  care: "",
  isFeatured: false,
};

const emptyBlog: CmsBlog = {
  slug: "new-blog",
  title: "New Blog",
  date: new Date().toISOString().slice(0, 10),
  image: "/sarjan-assets/banner-textiles-studio.webp",
  excerpt: "",
  content: "",
};

function csvToArray(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function arrayToCsv(value: string[]) {
  return value.join(", ");
}

export function AdminCmsClient() {
  const [cms, setCms] = useState<CmsSnapshot | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedBlogSlug, setSelectedBlogSlug] = useState("");
  const [productDraft, setProductDraft] = useState<Product>(emptyProduct);
  const [blogDraft, setBlogDraft] = useState<CmsBlog>(emptyBlog);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    fetch("/api/admin/cms")
      .then((res) => res.json())
      .then((data: CmsSnapshot) => {
        setCms(data);
        setSelectedSlug(data.products[0]?.slug ?? "");
        setSelectedBlogSlug(data.blogs[0]?.slug ?? "");
        setProductDraft(data.products[0] ?? emptyProduct);
        setBlogDraft(data.blogs[0] ?? emptyBlog);
      });
  }, []);

  const productOptions = useMemo(() => cms?.products.slice(0, 250) ?? [], [cms]);

  const setHome = (key: "title" | "description" | "image", value: string) => {
    setCms((current) => current ? { ...current, home: { ...current.home, hero: { ...current.home.hero, [key]: value } } } : current);
  };

  const setSettings = (key: keyof CmsSnapshot["siteSettings"], value: string | number) => {
    setCms((current) => current ? { ...current, siteSettings: { ...current.siteSettings, [key]: value } } : current);
  };

  const saveCms = async () => {
    if (!cms) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ home: cms.home, siteSettings: cms.siteSettings, pages: cms.pages }),
      });
      if (!res.ok) throw new Error("Save failed");
      setCms(await res.json());
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const selectProduct = (slug: string) => {
    const product = cms?.products.find((item) => item.slug === slug);
    setSelectedSlug(slug);
    setProductDraft(product ?? emptyProduct);
  };

  const saveProduct = async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/cms/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productDraft),
      });
      if (!res.ok) throw new Error("Save failed");
      const next = await res.json();
      setCms(next);
      setSelectedSlug(productDraft.slug);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const selectBlog = (slug: string) => {
    const blog = cms?.blogs.find((item) => item.slug === slug);
    setSelectedBlogSlug(slug);
    setBlogDraft(blog ?? emptyBlog);
  };

  const saveBlog = async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/cms/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blogDraft),
      });
      if (!res.ok) throw new Error("Save failed");
      const next = await res.json();
      setCms(next);
      setSelectedBlogSlug(blogDraft.slug);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  if (!cms) {
    return <div className="wg-box"><h5>Loading admin data...</h5></div>;
  }

  return (
    <>
      <div className="tf-section-2 mb-30" id="dashboard">
        {[
          ["Products", cms.products.length],
          ["Blogs", cms.blogs.length],
          ["Hero", cms.home.hero.title],
          ["Credit Days", cms.siteSettings.creditTermDays],
        ].map(([label, value]) => (
          <div className="wg-chart-default" key={label}>
            <div className="body-text mb-2">{label}</div>
            <h4>{value}</h4>
          </div>
        ))}
      </div>

      <div className="wg-box mb-30" id="homepage">
        <div className="flex items-center justify-between mb-24">
          <h5>Homepage Banner CMS</h5>
          <button type="button" className="tf-button style-1" onClick={saveCms}>Save Homepage</button>
        </div>
        <div className="cols gap22">
          <fieldset>
            <div className="body-title mb-10">Banner title</div>
            <input type="text" value={cms.home.hero.title} onChange={(event) => setHome("title", event.target.value)} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Banner image URL</div>
            <input type="text" value={cms.home.hero.image} onChange={(event) => setHome("image", event.target.value)} />
          </fieldset>
        </div>
        <fieldset>
          <div className="body-title mb-10">Banner text</div>
          <textarea value={cms.home.hero.description} onChange={(event) => setHome("description", event.target.value)} />
        </fieldset>
      </div>

      <div className="wg-box mb-30" id="products">
        <div className="flex items-center justify-between mb-24">
          <h5>Product Management</h5>
          <div className="flex gap10">
            <button type="button" className="tf-button style-1" onClick={() => { setProductDraft(emptyProduct); setSelectedSlug(""); }}>New Product</button>
            <button type="button" className="tf-button style-1" onClick={saveProduct}>Save Product</button>
          </div>
        </div>
        <div className="cols gap22">
          <fieldset>
            <div className="body-title mb-10">Select product</div>
            <select value={selectedSlug} onChange={(event) => selectProduct(event.target.value)}>
              {productOptions.map((product) => <option value={product.slug} key={product.slug}>{product.name}</option>)}
            </select>
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Product name</div>
            <input value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Slug</div>
            <input value={productDraft.slug} onChange={(event) => setProductDraft({ ...productDraft, slug: event.target.value })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">SKU</div>
            <input value={productDraft.sku} onChange={(event) => setProductDraft({ ...productDraft, sku: event.target.value })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Category</div>
            <input value={productDraft.category} onChange={(event) => setProductDraft({ ...productDraft, category: event.target.value })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Fabric</div>
            <input value={productDraft.fabric} onChange={(event) => setProductDraft({ ...productDraft, fabric: event.target.value })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Price per piece</div>
            <input type="number" value={productDraft.price} onChange={(event) => setProductDraft({ ...productDraft, price: Number(event.target.value) })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">MOQ</div>
            <input type="number" value={productDraft.moq} onChange={(event) => setProductDraft({ ...productDraft, moq: Number(event.target.value) })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Stock</div>
            <input type="number" value={productDraft.stock} onChange={(event) => setProductDraft({ ...productDraft, stock: Number(event.target.value) })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Colors comma separated</div>
            <input value={arrayToCsv(productDraft.colors)} onChange={(event) => setProductDraft({ ...productDraft, colors: csvToArray(event.target.value) })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Sizes comma separated</div>
            <input value={arrayToCsv(productDraft.sizes)} onChange={(event) => setProductDraft({ ...productDraft, sizes: csvToArray(event.target.value) })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Images comma separated</div>
            <input value={arrayToCsv(productDraft.images)} onChange={(event) => setProductDraft({ ...productDraft, images: csvToArray(event.target.value) })} />
          </fieldset>
        </div>
        <fieldset>
          <div className="body-title mb-10">Product detail description</div>
          <textarea value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} />
        </fieldset>
      </div>

      <div className="wg-box mb-30" id="blogs">
        <div className="flex items-center justify-between mb-24">
          <h5>Blog CMS</h5>
          <div className="flex gap10">
            <button type="button" className="tf-button style-1" onClick={() => { setBlogDraft(emptyBlog); setSelectedBlogSlug(""); }}>New Blog</button>
            <button type="button" className="tf-button style-1" onClick={saveBlog}>Save Blog</button>
          </div>
        </div>
        <div className="cols gap22">
          <fieldset>
            <div className="body-title mb-10">Select blog</div>
            <select value={selectedBlogSlug} onChange={(event) => selectBlog(event.target.value)}>
              {cms.blogs.map((blog) => <option value={blog.slug} key={blog.slug}>{blog.title}</option>)}
            </select>
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Title</div>
            <input value={blogDraft.title} onChange={(event) => setBlogDraft({ ...blogDraft, title: event.target.value })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Slug</div>
            <input value={blogDraft.slug} onChange={(event) => setBlogDraft({ ...blogDraft, slug: event.target.value })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Date</div>
            <input value={blogDraft.date} onChange={(event) => setBlogDraft({ ...blogDraft, date: event.target.value })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Image</div>
            <input value={blogDraft.image} onChange={(event) => setBlogDraft({ ...blogDraft, image: event.target.value })} />
          </fieldset>
          <fieldset>
            <div className="body-title mb-10">Excerpt</div>
            <input value={blogDraft.excerpt} onChange={(event) => setBlogDraft({ ...blogDraft, excerpt: event.target.value })} />
          </fieldset>
        </div>
        <fieldset>
          <div className="body-title mb-10">Blog detail content</div>
          <textarea value={blogDraft.content} onChange={(event) => setBlogDraft({ ...blogDraft, content: event.target.value })} />
        </fieldset>
      </div>

      <div className="wg-box" id="settings">
        <div className="flex items-center justify-between mb-24">
          <h5>Global Store Settings</h5>
          <button type="button" className="tf-button style-1" onClick={saveCms}>Save Settings</button>
        </div>
        <div className="cols gap22">
          <fieldset><div className="body-title mb-10">Logo</div><input value={cms.siteSettings.logo} onChange={(event) => setSettings("logo", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Email</div><input value={cms.siteSettings.email} onChange={(event) => setSettings("email", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Orders Email</div><input value={cms.siteSettings.ordersEmail} onChange={(event) => setSettings("ordersEmail", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Phone</div><input value={cms.siteSettings.phone} onChange={(event) => setSettings("phone", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Address</div><input value={cms.siteSettings.address} onChange={(event) => setSettings("address", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Open Time Weekday</div><input value={cms.siteSettings.openTimeWeekday} onChange={(event) => setSettings("openTimeWeekday", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Open Time Sunday</div><input value={cms.siteSettings.openTimeSunday} onChange={(event) => setSettings("openTimeSunday", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Credit Days</div><input type="number" value={cms.siteSettings.creditTermDays} onChange={(event) => setSettings("creditTermDays", Number(event.target.value))} /></fieldset>
          <fieldset><div className="body-title mb-10">Footer Note</div><input value={cms.siteSettings.footerNote} onChange={(event) => setSettings("footerNote", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Footer Info Heading</div><input value={cms.siteSettings.footerInfoHeading ?? ""} onChange={(event) => setSettings("footerInfoHeading", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Footer Customer Heading</div><input value={cms.siteSettings.footerCustomerHeading ?? ""} onChange={(event) => setSettings("footerCustomerHeading", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Footer Newsletter Heading</div><input value={cms.siteSettings.footerNewsletterHeading ?? ""} onChange={(event) => setSettings("footerNewsletterHeading", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Footer Newsletter Text</div><input value={cms.siteSettings.footerNewsletterText ?? ""} onChange={(event) => setSettings("footerNewsletterText", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Footer Credit</div><input value={cms.siteSettings.footerCredit ?? ""} onChange={(event) => setSettings("footerCredit", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Facebook URL</div><input value={cms.siteSettings.facebookUrl ?? ""} onChange={(event) => setSettings("facebookUrl", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Instagram URL</div><input value={cms.siteSettings.instagramUrl ?? ""} onChange={(event) => setSettings("instagramUrl", event.target.value)} /></fieldset>
          <fieldset><div className="body-title mb-10">Pinterest URL</div><input value={cms.siteSettings.pinterestUrl ?? ""} onChange={(event) => setSettings("pinterestUrl", event.target.value)} /></fieldset>
        </div>
        <div className={`body-text mt-20 ${saveState === "error" ? "text-danger" : ""}`}>
          {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved. Storefront now reads updated CMS data." : saveState === "error" ? "Save failed." : "Ready."}
        </div>
      </div>
    </>
  );
}
