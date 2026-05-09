"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CmsHome } from "@/lib/cms-store";

type SaveState = "idle" | "saving" | "saved" | "error";

type HomeDraft = CmsHome & {
  topPicksTitle?: string;
  topPicksDescription?: string;
  testimonialsTitle?: string;
  testimonialsDescription?: string;
};

type Category = HomeDraft["categories"][number] & { href?: string };
type Highlight = HomeDraft["highlights"][number];
type Service = HomeDraft["services"][number];
type Testimonial = HomeDraft["testimonials"][number];

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

export function AdminHomePageClient({ initialHome }: { initialHome: HomeDraft }) {
  const [home, setHome] = useState<HomeDraft>(initialHome);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const previewStats = useMemo(
    () => [
      ["Hero", home.hero.title],
      ["Categories", home.categories.length],
      ["Highlights", home.highlights.length],
      ["Testimonials", home.testimonials.length],
    ],
    [home],
  );

  const saveHome = async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ home }),
      });
      if (!res.ok) throw new Error("Home save failed");
      const data = await res.json();
      setHome(data.home);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const updateHero = (key: keyof HomeDraft["hero"], value: string) => {
    setHome((current) => ({ ...current, hero: { ...current.hero, [key]: value } }));
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

  const updateTestimonial = (index: number, key: keyof Testimonial, value: string) => {
    setHome((current) => {
      const testimonials = [...current.testimonials];
      testimonials[index] = { ...testimonials[index], [key]: value };
      return { ...current, testimonials };
    });
  };

  return (
    <>
      <div className="tf-section-2 mb-30">
        {previewStats.map(([label, value]) => (
          <div className="wg-chart-default" key={label}>
            <div className="body-text mb-2">{label}</div>
            <h5 className="text-line-clamp-1">{value}</h5>
          </div>
        ))}
      </div>

      <div className="wg-box mb-30">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Home Page Content</h5>
            <div className="body-text text-secondary">Frontend home page reads this data through CMS API.</div>
          </div>
          <div className="flex gap10 items-center">
            {saveState === "saved" && <div className="text-tiny text-success">Saved</div>}
            {saveState === "error" && <div className="text-tiny text-danger">Save failed</div>}
            <button type="button" className="tf-button style-1" onClick={saveHome} disabled={saveState === "saving"}>
              {saveState === "saving" ? "Saving..." : "Save Home Page"}
            </button>
            <a className="tf-button" href="/" target="_blank">
              Preview Frontend
            </a>
          </div>
        </div>
      </div>

      <div className="wg-box mb-30">
        <div className="flex items-center justify-between mb-24">
          <h5>Hero Banner</h5>
          <img src={home.hero.image} alt="" style={{ width: 120, height: 70, objectFit: "cover", borderRadius: 8 }} />
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
        <Field label="Banner image URL">
          <TextInput value={home.hero.image} onChange={(value) => updateHero("image", value)} />
        </Field>
        <Field label="Banner description">
          <textarea value={home.hero.description} onChange={(event) => updateHero("description", event.target.value)} />
        </Field>
      </div>

      <div className="wg-box mb-30">
        <h5 className="mb-24">Category Cards After Banner</h5>
        <div className="grid-layout-3 gap22">
          {(home.categories as Category[]).map((category, index) => (
            <div className="wg-box" key={`${category.name}-${index}`}>
              <img src={category.image} alt="" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8, marginBottom: 16 }} />
              <Field label="Card title">
                <TextInput value={category.name} onChange={(value) => updateCategory(index, "name", value)} />
              </Field>
              <Field label="Image URL">
                <TextInput value={category.image} onChange={(value) => updateCategory(index, "image", value)} />
              </Field>
              <Field label="Link">
                <TextInput value={category.href ?? "#catalog"} onChange={(value) => updateCategory(index, "href", value)} />
              </Field>
            </div>
          ))}
        </div>
      </div>

      <div className="wg-box mb-30">
        <h5 className="mb-24">Home Section Headings</h5>
        <div className="cols gap22">
          <Field label="Today's Top Picks title">
            <TextInput value={home.topPicksTitle ?? "Today's Top Picks"} onChange={(value) => setHome((current) => ({ ...current, topPicksTitle: value }))} />
          </Field>
          <Field label="Today's Top Picks subtitle">
            <TextInput value={home.topPicksDescription ?? ""} onChange={(value) => setHome((current) => ({ ...current, topPicksDescription: value }))} />
          </Field>
          <Field label="Trending title">
            <TextInput value={home.trendingTitle} onChange={(value) => setHome((current) => ({ ...current, trendingTitle: value }))} />
          </Field>
          <Field label="Trending subtitle">
            <TextInput value={home.trendingDescription} onChange={(value) => setHome((current) => ({ ...current, trendingDescription: value }))} />
          </Field>
          <Field label="Testimonials title">
            <TextInput value={home.testimonialsTitle ?? "Customer Say!"} onChange={(value) => setHome((current) => ({ ...current, testimonialsTitle: value }))} />
          </Field>
          <Field label="Testimonials subtitle">
            <TextInput value={home.testimonialsDescription ?? ""} onChange={(value) => setHome((current) => ({ ...current, testimonialsDescription: value }))} />
          </Field>
          <Field label="Gallery title">
            <TextInput value={home.galleryTitle} onChange={(value) => setHome((current) => ({ ...current, galleryTitle: value }))} />
          </Field>
          <Field label="Gallery subtitle">
            <TextInput value={home.galleryDescription} onChange={(value) => setHome((current) => ({ ...current, galleryDescription: value }))} />
          </Field>
        </div>
      </div>

      <div className="wg-box mb-30">
        <h5 className="mb-24">Highlights / Credit Stats</h5>
        <div className="grid-layout-4 gap22">
          {home.highlights.map((highlight, index) => (
            <div className="wg-box" key={`${highlight.label}-${index}`}>
              <Field label="Value">
                <TextInput value={highlight.value} onChange={(value) => updateHighlight(index, "value", value)} />
              </Field>
              <Field label="Label">
                <TextInput value={highlight.label} onChange={(value) => updateHighlight(index, "label", value)} />
              </Field>
            </div>
          ))}
        </div>
      </div>

      <div className="wg-box mb-30">
        <h5 className="mb-24">Marquee Text</h5>
        <div className="cols gap22">
          <Field label="Top marquee, one per line">
            <textarea value={joinLines(home.marqueeTop)} onChange={(event) => setHome((current) => ({ ...current, marqueeTop: splitLines(event.target.value) }))} />
          </Field>
          <Field label="Bottom marquee, one per line">
            <textarea value={joinLines(home.marqueeBottom)} onChange={(event) => setHome((current) => ({ ...current, marqueeBottom: splitLines(event.target.value) }))} />
          </Field>
        </div>
      </div>

      <div className="wg-box mb-30">
        <h5 className="mb-24">Service Icons</h5>
        <div className="grid-layout-4 gap22">
          {home.services.map((service, index) => (
            <div className="wg-box" key={`${service.title}-${index}`}>
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
          ))}
        </div>
      </div>

      <div className="wg-box mb-30">
        <h5 className="mb-24">Testimonials</h5>
        <div className="cols gap22">
          {home.testimonials.map((testimonial, index) => (
            <div className="wg-box" key={`${testimonial.author}-${index}`}>
              <img src={testimonial.image} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 16 }} />
              <Field label="Author">
                <TextInput value={testimonial.author} onChange={(value) => updateTestimonial(index, "author", value)} />
              </Field>
              <Field label="Quote">
                <textarea value={testimonial.quote} onChange={(event) => updateTestimonial(index, "quote", event.target.value)} />
              </Field>
              <Field label="Product">
                <TextInput value={testimonial.product} onChange={(value) => updateTestimonial(index, "product", value)} />
              </Field>
              <Field label="Price">
                <TextInput value={testimonial.price} onChange={(value) => updateTestimonial(index, "price", value)} />
              </Field>
              <Field label="Image URL">
                <TextInput value={testimonial.image} onChange={(value) => updateTestimonial(index, "image", value)} />
              </Field>
              <Field label="Avatar URL">
                <TextInput value={testimonial.avatar} onChange={(value) => updateTestimonial(index, "avatar", value)} />
              </Field>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
