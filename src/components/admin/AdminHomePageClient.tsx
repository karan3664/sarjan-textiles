"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CmsHome } from "@/lib/cms-store";

type SaveState = "idle" | "saving" | "saved" | "error";
type UploadState = Record<string, "uploading" | string | undefined>;
type HomeSectionType = "hero" | "categories" | "topPicks" | "marquee" | "featuredProduct" | "trendingProducts" | "services" | "testimonials" | "gallery" | "brands";
type HomeSectionControl = { id: string; type: HomeSectionType; title?: string; enabled?: boolean };

const sectionOptions: Array<{ type: HomeSectionType; title: string }> = [
  { type: "hero", title: "Hero Banner" },
  { type: "categories", title: "Category Cards" },
  { type: "topPicks", title: "Featured Products" },
  { type: "marquee", title: "Marquee Text" },
  { type: "featuredProduct", title: "Product Feature" },
  { type: "trendingProducts", title: "Trending Products" },
  { type: "services", title: "Service Icons" },
  { type: "testimonials", title: "Testimonials" },
  { type: "gallery", title: "Shop Gallery" },
  { type: "brands", title: "Clients Slider" },
];

type HomeDraft = Omit<CmsHome, "hero" | "sections"> & {
  hero: CmsHome["hero"] & { images?: string[] };
  sections?: HomeSectionControl[];
  topPicksTitle?: string;
  topPicksDescription?: string;
  testimonialsTitle?: string;
  testimonialsDescription?: string;
};

type Category = HomeDraft["categories"][number] & { href?: string };
type Highlight = HomeDraft["highlights"][number];
type Service = HomeDraft["services"][number];

function defaultSections(): HomeSectionControl[] {
  return sectionOptions.map((item) => ({
    id: item.type,
    type: item.type,
    title: item.title,
    enabled: true,
  }));
}

function getHeroImages(hero: HomeDraft["hero"]) {
  const images = Array.isArray(hero.images) && hero.images.length ? hero.images : [hero.image];
  return images.filter(Boolean);
}

function splitLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function joinLines(value: string[]) {
  return value.join("\n");
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return <input type="text" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />;
}

function HeroImagesField({
  images,
  uploadState,
  onUpload,
  onPrimary,
  onRemove,
}: {
  images: string[];
  uploadState: UploadState;
  onUpload: (files: File[]) => void;
  onPrimary: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const state = uploadState.hero;
  const primary = images[0];

  return (
    <div className="sarjan-home-image-panel">
      <div className="sarjan-home-preview">
        {primary ? <img src={primary} alt="" /> : <div className="body-text text-secondary">No banner selected</div>}
      </div>
      <div className="sarjan-home-upload-row">
        <label className="tf-button style-1 mb-0">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              onUpload(Array.from(event.target.files ?? []));
              event.currentTarget.value = "";
            }}
          />
          {state === "uploading" ? "Uploading..." : "Choose Files"}
        </label>
        <div className="text-caption-1 text-secondary">Upload banner JPG, PNG, WEBP. Multiple allowed.</div>
      </div>
      {state && state !== "uploading" && <div className="text-tiny text-danger mt-8">{state}</div>}
      <div className="sarjan-home-thumb-grid">
        {images.map((image, index) => (
          <div className={`sarjan-home-thumb${index === 0 ? " active" : ""}`} key={`${image}-${index}`}>
            <button type="button" className="sarjan-home-thumb-image" onClick={() => onPrimary(index)} aria-label="Set primary banner">
              <img src={image} alt="" />
            </button>
            <button type="button" className="sarjan-home-thumb-remove" onClick={() => onRemove(index)} aria-label="Remove banner image">
              <i className="icon-close" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageUploadField({
  label,
  value,
  uploadKey,
  uploadState,
  onUpload,
}: {
  label: string;
  value: string;
  uploadKey: string;
  uploadState: UploadState;
  onUpload: (uploadKey: string, file: File) => void;
}) {
  const state = uploadState[uploadKey];

  return (
    <Field label={label}>
      <div className="sarjan-upload-control">
        <div className="sarjan-upload-preview">
          <img src={value} alt="" />
        </div>
        <label className="sarjan-upload-drop">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(uploadKey, file);
              event.currentTarget.value = "";
            }}
          />
          <span className="sarjan-upload-icon">
            <i className="icon-edit" />
          </span>
          <span className="text-title">{state === "uploading" ? "Uploading..." : "Upload image"}</span>
          <span className="text-caption-1 text-secondary">JPG, PNG, WEBP up to 30MB</span>
        </label>
      </div>
      {state && state !== "uploading" && <div className="text-tiny text-danger mt-8">{state}</div>}
    </Field>
  );
}

export function AdminHomePageClient({ initialHome }: { initialHome: CmsHome }) {
  const [home, setHome] = useState<HomeDraft>(() => ({
    ...(initialHome as HomeDraft),
    sections: ((initialHome as HomeDraft).sections?.length ? (initialHome as HomeDraft).sections : defaultSections()),
  }));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [uploadState, setUploadState] = useState<UploadState>({});

  const previewStats = useMemo(
    () => [
      ["Hero", home.hero.title],
      ["Categories", home.categories.length],
      ["Highlights", home.highlights.length],
    ],
    [home],
  );

  const heroImages = getHeroImages(home.hero);
  const sections = home.sections?.length ? home.sections : defaultSections();

  const saveHome = async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ home }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Home save failed");
      if (!data.home) throw new Error("CMS response missing home data");
      setHome({ ...data.home, sections: data.home.sections?.length ? data.home.sections : defaultSections() });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (error) {
      console.error(error);
      setSaveState("error");
    }
  };

  const updateHero = (key: keyof HomeDraft["hero"], value: string) => {
    setHome((current) => ({ ...current, hero: { ...current.hero, [key]: value } }));
  };

  const updateHeroImages = (images: string[]) => {
    const nextImages = images.filter(Boolean);
    setHome((current) => ({
      ...current,
      hero: {
        ...current.hero,
        image: nextImages[0] ?? current.hero.image,
        images: nextImages,
      },
    }));
  };

  const updateHeroCta = (key: "label" | "href", value: string) => {
    setHome((current) => ({
      ...current,
      hero: { ...current.hero, primaryCta: { ...current.hero.primaryCta, [key]: value } },
    }));
  };

  const updateCategory = (index: number, key: keyof Category, value: string) => {
    setHome((current) => {
      const categories = [...current.categories] as Category[];
      categories[index] = { ...categories[index], [key]: value };
      return { ...current, categories };
    });
  };

  const updateHighlight = (index: number, key: keyof Highlight, value: string) => {
    setHome((current) => {
      const highlights = [...current.highlights];
      highlights[index] = { ...highlights[index], [key]: value };
      return { ...current, highlights };
    });
  };

  const updateService = (index: number, key: keyof Service, value: string) => {
    setHome((current) => {
      const services = [...current.services];
      services[index] = { ...services[index], [key]: value };
      return { ...current, services };
    });
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/uploads", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const error = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(error?.error ?? "Image upload failed");
    }
    return (await res.json()) as { url: string };
  };

  const uploadImage = async (uploadKey: string, file: File) => {
    setUploadState((current) => ({ ...current, [uploadKey]: "uploading" }));

    try {
      const data = await uploadFile(file);
      if (uploadKey === "hero") updateHero("image", data.url);
      if (uploadKey.startsWith("category-")) {
        const index = Number(uploadKey.replace("category-", ""));
        updateCategory(index, "image", data.url);
      }
      setUploadState((current) => ({ ...current, [uploadKey]: undefined }));
    } catch (error) {
      setUploadState((current) => ({ ...current, [uploadKey]: error instanceof Error ? error.message : "Upload failed" }));
    }
  };

  const uploadHeroImages = async (files: File[]) => {
    if (!files.length) return;
    setUploadState((current) => ({ ...current, hero: "uploading" }));
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const item = await uploadFile(file);
        uploaded.push(item.url);
      }
      updateHeroImages([...heroImages, ...uploaded]);
      setUploadState((current) => ({ ...current, hero: undefined }));
    } catch (error) {
      setUploadState((current) => ({ ...current, hero: error instanceof Error ? error.message : "Upload failed" }));
    }
  };

  const setPrimaryHeroImage = (index: number) => {
    const nextImages = [...heroImages];
    const [selected] = nextImages.splice(index, 1);
    updateHeroImages([selected, ...nextImages]);
  };

  const removeHeroImage = (index: number) => {
    updateHeroImages(heroImages.filter((_, imageIndex) => imageIndex !== index));
  };

  const updateSection = (index: number, patch: Partial<HomeSectionControl>) => {
    setHome((current) => {
      const next = [...(current.sections?.length ? current.sections : sections)];
      next[index] = { ...next[index], ...patch };
      return { ...current, sections: next };
    });
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setHome((current) => {
      const next = [...(current.sections?.length ? current.sections : sections)];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, sections: next };
    });
  };

  const duplicateSection = (index: number) => {
    setHome((current) => {
      const next = [...(current.sections?.length ? current.sections : sections)];
      const source = next[index];
      next.splice(index + 1, 0, { ...source, id: `${source.type}-${Date.now()}`, title: `${source.title ?? source.type} Copy` });
      return { ...current, sections: next };
    });
  };

  const removeSection = (index: number) => {
    setHome((current) => ({ ...current, sections: (current.sections?.length ? current.sections : sections).filter((_, itemIndex) => itemIndex !== index) }));
  };

  const addSection = (type: HomeSectionType) => {
    const option = sectionOptions.find((item) => item.type === type);
    setHome((current) => ({
      ...current,
      sections: [
        ...(current.sections?.length ? current.sections : sections),
        { id: `${type}-${Date.now()}`, type, title: option?.title ?? type, enabled: true },
      ],
    }));
  };

  return (
    <>
      <div className="sarjan-home-kpi-grid">
        {previewStats.map(([label, value], index) => (
          <div className="sarjan-home-kpi-card" key={label}>
            <div className="sarjan-home-kpi-icon">
              <i className={index === 0 ? "icon-edit" : index === 1 ? "icon-folders" : index === 2 ? "icon-chart-bar" : "icon-users"} />
            </div>
            <div>
              <div className="body-text text-secondary">{label}</div>
              <h5 className="text-line-clamp-1">{value}</h5>
            </div>
          </div>
        ))}
      </div>

      <div className="wg-box mb-30 sarjan-home-action-card">
        <div className="flex flex-wrap justify-between gap14 items-center">
          <div>
            <h5>Home Page Content</h5>
            <div className="body-text text-secondary">Frontend home page reads this data through CMS API.</div>
          </div>
          <div className="sarjan-home-action-row">
            {saveState === "saved" && <div className="sarjan-save-state success">Saved</div>}
            {saveState === "error" && <div className="sarjan-save-state danger">Save failed</div>}
            <button type="button" className="tf-button style-1" onClick={saveHome} disabled={saveState === "saving"}>
              {saveState === "saving" ? "Saving..." : "Save Home Page"}
            </button>
            <a className="tf-button" href="/" target="_blank">
              Preview Frontend
            </a>
          </div>
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Shopify-style Section Builder</h5>
            <div className="body-text text-secondary">Add, hide/show, reorder, duplicate, and remove homepage sections. Frontend renders in this exact order.</div>
          </div>
          <select className="w-auto" defaultValue="" onChange={(event) => {
            if (event.target.value) addSection(event.target.value as HomeSectionType);
            event.currentTarget.value = "";
          }}>
            <option value="">Add Section</option>
            {sectionOptions.map((item) => <option value={item.type} key={item.type}>{item.title}</option>)}
          </select>
        </div>
        <div className="d-grid gap-3">
          {sections.map((section, index) => (
            <div className="sarjan-section-builder-row" key={section.id}>
              <div className="d-flex align-items-center gap10">
                <span className="box-status text-button type-delivery">{index + 1}</span>
                <div>
                  <h6>{section.title ?? sectionOptions.find((item) => item.type === section.type)?.title ?? section.type}</h6>
                  <div className="text-caption-1 text-secondary">{section.type}</div>
                </div>
              </div>
              <div className="sarjan-section-builder-actions">
                <button type="button" className="tf-button" onClick={() => moveSection(index, -1)} disabled={index === 0}>Up</button>
                <button type="button" className="tf-button" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1}>Down</button>
                <button type="button" className="tf-button" onClick={() => updateSection(index, { enabled: section.enabled === false })}>{section.enabled === false ? "Show" : "Hide"}</button>
                <button type="button" className="tf-button" onClick={() => duplicateSection(index)}>Duplicate</button>
                <button type="button" className="tf-button" onClick={() => removeSection(index)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Homepage Banner</h5>
            <div className="body-text text-secondary">Client-facing hero slider with multiple banner images.</div>
          </div>
          <div className="box-status text-button type-delivery">Live Preview</div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(360px,0.9fr)_minmax(500px,1.1fr)] gap-8 2xl:gap-10 items-start">
          <div>
            <div className="body-title mb-10">Banner Images</div>
            <HeroImagesField images={heroImages} uploadState={uploadState} onUpload={uploadHeroImages} onPrimary={setPrimaryHeroImage} onRemove={removeHeroImage} />
          </div>
          <div className="sarjan-home-form-panel">
            <div className="mb-24">
              <h5>Banner Content</h5>
              <div className="body-text text-secondary">Comprehensive insights into homepage hero section.</div>
            </div>
            <div className="cols gap22">
              <Field label="Eyebrow">
                <TextInput value={home.hero.eyebrow} onChange={(value) => updateHero("eyebrow", value)} />
              </Field>
              <Field label="Banner title">
                <TextInput value={home.hero.title} onChange={(value) => updateHero("title", value)} />
              </Field>
              <Field label="Button label">
                <TextInput value={home.hero.primaryCta.label} onChange={(value) => updateHeroCta("label", value)} />
              </Field>
              <Field label="Button link">
                <TextInput value={home.hero.primaryCta.href} onChange={(value) => updateHeroCta("href", value)} />
              </Field>
            </div>
            <Field label="Banner description">
              <textarea value={home.hero.description} onChange={(event) => updateHero("description", event.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Category Cards After Banner</h5>
            <div className="body-text text-secondary">Three featured collection blocks shown under homepage banner.</div>
          </div>
          <div className="box-status text-button type-delivery">{home.categories.length} Cards</div>
        </div>
        <div className="sarjan-category-editor-grid">
          {(home.categories as Category[]).map((category, index) => (
            <div className="sarjan-category-editor-card" key={`${category.name}-${index}`}>
              <div className="sarjan-category-preview">
                <img src={category.image} alt="" />
                <div className="sarjan-category-preview-label">
                  <span>{index + 1}</span>
                  <strong>{category.name}</strong>
                </div>
              </div>
              <label className="sarjan-category-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadImage(`category-${index}`, file);
                    event.currentTarget.value = "";
                  }}
                />
                <span>{uploadState[`category-${index}`] === "uploading" ? "Uploading..." : "Choose Image"}</span>
                <small>JPG, PNG, WEBP</small>
              </label>
              {uploadState[`category-${index}`] && uploadState[`category-${index}`] !== "uploading" && (
                <div className="text-tiny text-danger">{uploadState[`category-${index}`]}</div>
              )}
              <div className="sarjan-category-fields">
                <Field label="Card title">
                  <TextInput value={category.name} onChange={(value) => updateCategory(index, "name", value)} />
                </Field>
                <Field label="Link">
                  <TextInput value={category.href ?? "#catalog"} onChange={(value) => updateCategory(index, "href", value)} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Home Section Headings</h5>
            <div className="body-text text-secondary">Manage visible titles and subtitles for homepage content blocks.</div>
          </div>
          <div className="box-status text-button type-delivery">4 Sections</div>
        </div>
        <div className="sarjan-heading-editor-grid">
          <div className="sarjan-heading-editor-card">
            <div className="sarjan-heading-preview">
              <span>01</span>
              <div>
                <h6>{home.topPicksTitle ?? "Today's Top Picks"}</h6>
                <p>{home.topPicksDescription ?? "Fresh Sarjan textile products from admin-managed data."}</p>
              </div>
            </div>
            <div className="sarjan-heading-fields">
              <Field label="Section title">
                <TextInput value={home.topPicksTitle ?? "Today's Top Picks"} onChange={(value) => setHome((current) => ({ ...current, topPicksTitle: value }))} />
              </Field>
              <Field label="Section subtitle">
                <textarea value={home.topPicksDescription ?? ""} onChange={(event) => setHome((current) => ({ ...current, topPicksDescription: event.target.value }))} />
              </Field>
            </div>
          </div>

          <div className="sarjan-heading-editor-card">
            <div className="sarjan-heading-preview">
              <span>02</span>
              <div>
                <h6>{home.trendingTitle}</h6>
                <p>{home.trendingDescription}</p>
              </div>
            </div>
            <div className="sarjan-heading-fields">
              <Field label="Section title">
                <TextInput value={home.trendingTitle} onChange={(value) => setHome((current) => ({ ...current, trendingTitle: value }))} />
              </Field>
              <Field label="Section subtitle">
                <textarea value={home.trendingDescription} onChange={(event) => setHome((current) => ({ ...current, trendingDescription: event.target.value }))} />
              </Field>
            </div>
          </div>

          <div className="sarjan-heading-editor-card">
            <div className="sarjan-heading-preview">
              <span>03</span>
              <div>
                <h6>{home.testimonialsTitle ?? "Customer Say!"}</h6>
                <p>{home.testimonialsDescription ?? "Our customers adore our products, and we constantly aim to delight them."}</p>
              </div>
            </div>
            <div className="sarjan-heading-fields">
              <Field label="Section title">
                <TextInput value={home.testimonialsTitle ?? "Customer Say!"} onChange={(value) => setHome((current) => ({ ...current, testimonialsTitle: value }))} />
              </Field>
              <Field label="Section subtitle">
                <textarea value={home.testimonialsDescription ?? ""} onChange={(event) => setHome((current) => ({ ...current, testimonialsDescription: event.target.value }))} />
              </Field>
            </div>
          </div>

          <div className="sarjan-heading-editor-card">
            <div className="sarjan-heading-preview">
              <span>04</span>
              <div>
                <h6>{home.galleryTitle}</h6>
                <p>{home.galleryDescription}</p>
              </div>
            </div>
            <div className="sarjan-heading-fields">
              <Field label="Section title">
                <TextInput value={home.galleryTitle} onChange={(value) => setHome((current) => ({ ...current, galleryTitle: value }))} />
              </Field>
              <Field label="Section subtitle">
                <textarea value={home.galleryDescription} onChange={(event) => setHome((current) => ({ ...current, galleryDescription: event.target.value }))} />
              </Field>
            </div>
          </div>
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Highlights / Credit Stats</h5>
            <div className="body-text text-secondary">Compact trust metrics shown on homepage.</div>
          </div>
          <div className="box-status text-button type-delivery">{home.highlights.length} Stats</div>
        </div>
        <div className="sarjan-highlight-editor-grid">
          {home.highlights.map((highlight, index) => (
            <div className="sarjan-highlight-editor-card" key={`${highlight.label}-${index}`}>
              <div className="sarjan-highlight-preview">
                <div className="sarjan-highlight-value">{highlight.value}</div>
                <div className="sarjan-highlight-label">{highlight.label}</div>
              </div>
              <div className="sarjan-compact-fields">
                <Field label="Value">
                  <TextInput value={highlight.value} onChange={(value) => updateHighlight(index, "value", value)} />
                </Field>
                <Field label="Label">
                  <TextInput value={highlight.label} onChange={(value) => updateHighlight(index, "label", value)} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Marquee Text</h5>
            <div className="body-text text-secondary">Scrolling textile messages used between homepage sections.</div>
          </div>
          <div className="box-status text-button type-delivery">{home.marqueeTop.length + home.marqueeBottom.length} Lines</div>
        </div>
        <div className="sarjan-marquee-editor-grid">
          <div className="sarjan-marquee-editor-card">
            <div className="sarjan-marquee-preview">
              {home.marqueeTop.slice(0, 4).map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
            <Field label="Top marquee, one per line">
              <textarea value={joinLines(home.marqueeTop)} onChange={(event) => setHome((current) => ({ ...current, marqueeTop: splitLines(event.target.value) }))} />
            </Field>
          </div>
          <div className="sarjan-marquee-editor-card">
            <div className="sarjan-marquee-preview alt">
              {home.marqueeBottom.slice(0, 4).map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
            <Field label="Bottom marquee, one per line">
              <textarea value={joinLines(home.marqueeBottom)} onChange={(event) => setHome((current) => ({ ...current, marqueeBottom: splitLines(event.target.value) }))} />
            </Field>
          </div>
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Service Icons</h5>
            <div className="body-text text-secondary">Homepage service promise cards with icon, title, and body text.</div>
          </div>
          <div className="box-status text-button type-delivery">{home.services.length} Services</div>
        </div>
        <div className="sarjan-service-editor-grid">
          {home.services.map((service, index) => (
            <div className="sarjan-service-editor-card" key={`${service.title}-${index}`}>
              <div className="sarjan-service-preview">
                <div className="sarjan-service-icon"><i className={service.icon} /></div>
                <h6>{service.title}</h6>
                <p>{service.body}</p>
              </div>
              <div className="sarjan-compact-fields">
                <Field label="Icon class">
                  <TextInput value={service.icon} onChange={(value) => updateService(index, "icon", value)} />
                </Field>
                <Field label="Title">
                  <TextInput value={service.title} onChange={(value) => updateService(index, "title", value)} />
                </Field>
                <Field label="Body">
                  <textarea value={service.body} onChange={(event) => updateService(index, "body", event.target.value)} />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card sarjan-testimonial-routing-card">
        <div>
          <h5>Testimonials moved to approval workflow</h5>
          <div className="body-text text-secondary">Customers submit testimonials from frontend/API. Admin approves them from separate page. Approved testimonials appear on homepage.</div>
        </div>
        <a className="tf-button style-1" href="/admin/testimonials">Manage Testimonials</a>
      </div>
    </>
  );
}
