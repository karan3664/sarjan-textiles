"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Product } from "@/data/mock";
import type { CmsHome } from "@/lib/cms-store";
import {
  normalizeHeroVideoUrls,
  parseHeroVideoSource,
  youtubeThumbnailUrl,
} from "@/lib/hero-video";
import { AdminHtmlEditor } from "@/components/admin/AdminHtmlEditor";
import { AdminHomeBannerSlides } from "@/components/admin/AdminHomeBannerSlides";
import { putAdminCms } from "@/lib/admin-cms-fetch";
import {
  normalizeHomeBanners,
  syncHomeHeroFromBanners,
  type CmsHomeBanner,
} from "@/lib/home-banners";

type SaveState = "idle" | "saving" | "saved" | "error";
type UploadState = Record<string, "uploading" | string | undefined>;
type HomeSectionType =
  | "hero"
  | "categories"
  | "topPicks"
  | "marquee"
  | "featuredProduct"
  | "trendingProducts"
  | "services"
  | "testimonials"
  | "gallery"
  | "brands"
  | "custom";
type CustomBlockType = "text" | "image" | "button" | "product";
type CustomBlock = {
  id: string;
  type: CustomBlockType;
  heading?: string;
  body?: string;
  image?: string;
  alt?: string;
  label?: string;
  href?: string;
  productSlug?: string;
};
type HomeSectionControl = {
  id: string;
  type: HomeSectionType;
  title?: string;
  enabled?: boolean;
  subtitle?: string;
  layout?: "grid" | "banner" | "split";
  blocks?: CustomBlock[];
};

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
  { type: "custom", title: "Custom Section" },
];

type HomeDraft = Omit<CmsHome, "hero" | "sections"> & {
  hero: CmsHome["hero"] & {
    images?: string[];
    videoEnabled?: boolean;
    videoUrls?: string[];
    videoUrl?: string;
  };
  banners?: CmsHomeBanner[];
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

function blankBlock(type: CustomBlockType): CustomBlock {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  if (type === "text")
    return { id, type, heading: "New heading", body: "Add section text here." };
  if (type === "image")
    return {
      id,
      type,
      image: "/sarjan-assets/banner-textiles-studio.webp",
      alt: "Sarjan Textiles",
    };
  if (type === "button")
    return { id, type, label: "Explore Now", href: "/products" };
  return { id, type, productSlug: "" };
}

function getHeroImages(hero: HomeDraft["hero"]) {
  const images =
    Array.isArray(hero.images) && hero.images.length
      ? hero.images
      : [hero.image];
  return images.filter(Boolean);
}

function getHeroVideos(hero: HomeDraft["hero"]) {
  return normalizeHeroVideoUrls(hero);
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(value: string[]) {
  return value.join("\n");
}

function stripHtmlPreview(html: string, max = 52) {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function buildHomeDraft(initialHome: CmsHome | HomeDraft): HomeDraft {
  const draft = initialHome as HomeDraft;
  const videoUrls = getHeroVideos(draft.hero);
  return syncHomeHeroFromBanners({
    ...draft,
    hero: { ...draft.hero, videoUrls, videoUrl: videoUrls[0] ?? "" },
    sections: draft.sections?.length ? draft.sections : defaultSections(),
  }) as HomeDraft;
}

type HomeEditorSaveContextValue = {
  saveHome: () => Promise<void>;
  saveState: SaveState;
};

const HomeEditorSaveContext = createContext<HomeEditorSaveContextValue | null>(
  null,
);

function useHomeEditorSave() {
  return useContext(HomeEditorSaveContext);
}

function Field({
  label,
  children,
  dirty,
  onSave,
  saving,
}: {
  label: string;
  children: ReactNode;
  dirty?: boolean;
  onSave?: () => void;
  saving?: boolean;
}) {
  return (
    <fieldset className="sarjan-cms-field">
      <div className="sarjan-cms-field-head">
        <div className="body-title mb-0">{label}</div>
        {dirty && onSave ? (
          <button
            type="button"
            className="tf-button style-1 sarjan-cms-field-save"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        ) : null}
      </div>
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
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function TextField({
  label,
  value,
  savedValue,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | number;
  savedValue: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const save = useHomeEditorSave();
  const dirty = String(value) !== String(savedValue);
  return (
    <Field
      label={label}
      dirty={dirty}
      onSave={save?.saveHome}
      saving={save?.saveState === "saving"}
    >
      <TextInput value={value} onChange={onChange} placeholder={placeholder} />
    </Field>
  );
}

function HtmlField({
  label,
  value,
  savedValue,
  onChange,
  rows = 6,
  placeholder,
}: {
  label: string;
  value: string;
  savedValue: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const save = useHomeEditorSave();
  const dirty = value !== savedValue;
  return (
    <Field
      label={label}
      dirty={dirty}
      onSave={save?.saveHome}
      saving={save?.saveState === "saving"}
    >
      <AdminHtmlEditor
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
      />
    </Field>
  );
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
        {primary ? (
          <img src={primary} alt="" />
        ) : (
          <div className="body-text text-secondary">No banner selected</div>
        )}
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
        <div className="text-caption-1 text-secondary">
          Upload banner JPG, PNG, WEBP. Multiple allowed.
        </div>
      </div>
      {state && state !== "uploading" && (
        <div className="text-tiny text-danger mt-8">{state}</div>
      )}
      <div className="sarjan-home-thumb-grid">
        {images.map((image, index) => (
          <div
            className={`sarjan-home-thumb${index === 0 ? " active" : ""}`}
            key={`${image}-${index}`}
          >
            <button
              type="button"
              className="sarjan-home-thumb-image"
              onClick={() => onPrimary(index)}
              aria-label="Set primary banner"
            >
              <img src={image} alt="" />
            </button>
            <button
              type="button"
              className="sarjan-home-thumb-remove"
              onClick={() => onRemove(index)}
              aria-label="Remove banner image"
            >
              <i className="icon-close" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroVideoThumb({ url }: { url: string }) {
  const parsed = parseHeroVideoSource(url);
  if (parsed?.type === "youtube") {
    return (
      <img
        src={youtubeThumbnailUrl(parsed.videoId)}
        alt=""
        className="sarjan-home-thumb-youtube"
      />
    );
  }
  if (parsed?.type === "file") {
    return (
      <video
        src={parsed.src}
        muted
        playsInline
        preload="metadata"
        className="sarjan-home-thumb-video"
      />
    );
  }
  return <span className="body-text text-tiny">Invalid URL</span>;
}

function HeroVideosField({
  enabled,
  videos,
  poster,
  uploadState,
  urlDraft,
  onToggle,
  onUpload,
  onAddUrl,
  onUrlDraftChange,
  onPrimary,
  onRemove,
}: {
  enabled: boolean;
  videos: string[];
  poster?: string;
  uploadState?: string;
  urlDraft: string;
  onToggle: (enabled: boolean) => void;
  onUpload: (files: File[]) => void;
  onAddUrl: () => void;
  onUrlDraftChange: (value: string) => void;
  onPrimary: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const primary = videos[0];
  const parsed = primary ? parseHeroVideoSource(primary) : null;

  return (
    <div className="sarjan-home-video-panel mt-24">
      <div className="body-title mb-10">
        Video slides (rotates with banners)
      </div>
      <label className="tf-cart-checkbox d-flex align-items-center gap-8 mb-16">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <span className="text-secondary">
          Add video slides after banner images (muted autoplay, plays once each)
        </span>
      </label>
      {enabled ? (
        <>
          <div className="sarjan-home-preview sarjan-home-video-preview">
            {parsed?.type === "youtube" ? (
              <iframe
                className="sarjan-home-video-preview-youtube"
                src={parsed.embedUrl}
                title="YouTube preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : parsed?.type === "file" ? (
              <video
                src={parsed.src}
                poster={poster}
                muted
                loop
                playsInline
                autoPlay
                controls
              />
            ) : (
              <div className="body-text text-secondary">
                Upload videos or add a YouTube / MP4 URL
              </div>
            )}
          </div>
          <div className="sarjan-home-upload-row">
            <label className="tf-button style-1 mb-0">
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                multiple
                onChange={(event) => {
                  onUpload(Array.from(event.target.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
              {uploadState === "uploading" ? "Uploading..." : "Choose Videos"}
            </label>
          </div>
          <p className="sarjan-home-video-hint text-caption-1 text-secondary">
            <span className="sarjan-home-video-hint-line">
              MP4, WebM, MOV (max 80MB each). Multiple uploads allowed.
            </span>
            <span className="sarjan-home-video-hint-line sarjan-home-video-hint-chips">
              <span>Or add a YouTube link:</span>
              <span className="sarjan-inline-code">youtube.com/watch?v=…</span>
              <span className="sarjan-inline-code">youtu.be/…</span>
            </span>
          </p>
          {uploadState && uploadState !== "uploading" ? (
            <div className="text-tiny text-danger mt-8">{uploadState}</div>
          ) : null}
          <div className="sarjan-home-add-video-url mt-16">
            <Field label="Add video URL (YouTube or file path)">
              <div className="sarjan-home-add-video-url-row">
                <TextInput
                  value={urlDraft}
                  onChange={onUrlDraftChange}
                  placeholder="https://www.youtube.com/watch?v=… or /uploads/cms/hero.mp4"
                />
                <button
                  type="button"
                  className="tf-button style-1 mb-0"
                  onClick={onAddUrl}
                >
                  Add
                </button>
              </div>
            </Field>
          </div>
          {videos.length ? (
            <div className="sarjan-home-thumb-grid sarjan-home-video-thumb-grid">
              {videos.map((url, index) => (
                <div
                  className={`sarjan-home-thumb sarjan-home-video-thumb${index === 0 ? " active" : ""}`}
                  key={`${url}-${index}`}
                >
                  <button
                    type="button"
                    className="sarjan-home-thumb-image"
                    onClick={() => onPrimary(index)}
                    aria-label="Show this video first in rotation"
                  >
                    <HeroVideoThumb url={url} />
                  </button>
                  <button
                    type="button"
                    className="sarjan-home-thumb-remove"
                    onClick={() => onRemove(index)}
                    aria-label="Remove video"
                  >
                    <i className="icon-close" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function AdminHomePageClient({
  initialHome,
  products,
}: {
  initialHome: CmsHome;
  products: Product[];
}) {
  const [home, setHome] = useState<HomeDraft>(() =>
    buildHomeDraft(initialHome),
  );
  const [savedHome, setSavedHome] = useState<HomeDraft>(() =>
    buildHomeDraft(initialHome),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>({});
  const [heroVideoUrlDraft, setHeroVideoUrlDraft] = useState("");

  const previewStats = useMemo(
    () => [
      ["Hero", stripHtmlPreview(home.hero.title)],
      ["Categories", home.categories.length],
      ["Highlights", home.highlights.length],
    ],
    [home],
  );

  const heroImages = getHeroImages(home.hero);
  const heroVideos = getHeroVideos(home.hero);
  const bannerSlides = normalizeHomeBanners(home);
  const sections = home.sections?.length ? home.sections : defaultSections();

  const setBannerSlides = (nextBanners: CmsHomeBanner[]) => {
    setHome(
      (current) =>
        syncHomeHeroFromBanners({
          ...current,
          banners: nextBanners,
        }) as HomeDraft,
    );
  };

  const updateBannerSlide = (index: number, patch: Partial<CmsHomeBanner>) => {
    const next = [...normalizeHomeBanners(home)];
    next[index] = { ...next[index], ...patch };
    setBannerSlides(next);
  };

  const moveBannerSlide = (index: number, direction: -1 | 1) => {
    const next = [...normalizeHomeBanners(home)];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBannerSlides(next);
  };

  const removeBannerSlide = (index: number) => {
    setBannerSlides(normalizeHomeBanners(home).filter((_, i) => i !== index));
  };

  const addBannerSlide = () => {
    const next = [
      ...normalizeHomeBanners(home),
      {
        id: `banner-${Date.now()}`,
        image: "/sarjan-assets/banner-textiles-studio.webp",
        eyebrow: "",
        title: "",
        description: "",
        ctaLabel: "",
        ctaHref: "",
        actionType: "url" as const,
        actionValue: "",
        enabled: true,
      },
    ];
    setBannerSlides(next);
  };

  const saveHome = async () => {
    setSaveState("saving");
    setSaveError("");
    try {
      const payload = syncHomeHeroFromBanners(home);
      const data = await putAdminCms<{ home?: HomeDraft }>({ home: payload });
      const saved = data.home;
      if (saved) {
        const next = buildHomeDraft(saved);
        setHome(next);
        setSavedHome(next);
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (error) {
      console.error(error);
      setSaveError(error instanceof Error ? error.message : "Home save failed");
      setSaveState("error");
    }
  };

  const updateHero = (key: keyof HomeDraft["hero"], value: string) => {
    setHome((current) => ({
      ...current,
      hero: { ...current.hero, [key]: value },
    }));
  };

  const updateHeroVideoEnabled = (enabled: boolean) => {
    setHome((current) => ({
      ...current,
      hero: { ...current.hero, videoEnabled: enabled },
    }));
  };

  const updateHeroVideos = (videoUrls: string[]) => {
    const next = videoUrls.map((item) => item.trim()).filter(Boolean);
    setHome((current) => ({
      ...current,
      hero: {
        ...current.hero,
        videoUrls: next,
        videoUrl: next[0] ?? "",
        videoEnabled: next.length > 0 ? true : current.hero.videoEnabled,
      },
    }));
  };

  const uploadHeroVideos = async (files: File[]) => {
    if (!files.length) return;
    setUploadState((current) => ({ ...current, heroVideo: "uploading" }));
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/uploads", {
          method: "POST",
          body,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? "Video upload failed");
        }
        uploaded.push(data.url);
      }
      updateHeroVideos([...heroVideos, ...uploaded]);
      setUploadState((current) => ({ ...current, heroVideo: undefined }));
    } catch (error) {
      setUploadState((current) => ({
        ...current,
        heroVideo:
          error instanceof Error ? error.message : "Video upload failed",
      }));
    }
  };

  const addHeroVideoUrl = () => {
    const trimmed = heroVideoUrlDraft.trim();
    if (!trimmed) return;
    if (!parseHeroVideoSource(trimmed)) {
      setUploadState((current) => ({
        ...current,
        heroVideo: "Enter a valid YouTube or video file URL",
      }));
      return;
    }
    if (heroVideos.includes(trimmed)) {
      setUploadState((current) => ({
        ...current,
        heroVideo: "This video is already in the list",
      }));
      return;
    }
    updateHeroVideos([...heroVideos, trimmed]);
    setHeroVideoUrlDraft("");
    setUploadState((current) => ({ ...current, heroVideo: undefined }));
  };

  const setPrimaryHeroVideo = (index: number) => {
    const next = [...heroVideos];
    const [selected] = next.splice(index, 1);
    if (!selected) return;
    updateHeroVideos([selected, ...next]);
  };

  const removeHeroVideo = (index: number) => {
    updateHeroVideos(
      heroVideos.filter((_, videoIndex) => videoIndex !== index),
    );
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
      hero: {
        ...current.hero,
        primaryCta: { ...current.hero.primaryCta, [key]: value },
      },
    }));
  };

  const updateCategory = (
    index: number,
    key: keyof Category,
    value: string,
  ) => {
    setHome((current) => {
      const categories = [...current.categories] as Category[];
      categories[index] = { ...categories[index], [key]: value };
      return { ...current, categories };
    });
  };

  const updateHighlight = (
    index: number,
    key: keyof Highlight,
    value: string,
  ) => {
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
      const error = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(error?.error ?? "Image upload failed");
    }
    return (await res.json()) as { url: string };
  };

  const uploadBannerSlides = async (files: File[]) => {
    if (!files.length) return;
    setUploadState((current) => ({ ...current, hero: "uploading" }));
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const item = await uploadFile(file);
        uploaded.push(item.url);
      }
      const next = [
        ...normalizeHomeBanners(home),
        ...uploaded.map((image, offset) => ({
          id: `banner-${Date.now()}-${offset}`,
          image,
          eyebrow: "",
          title: "",
          description: "",
          ctaLabel: "",
          ctaHref: "",
          actionType: "url" as const,
          actionValue: "",
          enabled: true,
        })),
      ];
      setBannerSlides(next);
      setUploadState((current) => ({ ...current, hero: undefined }));
    } catch (error) {
      setUploadState((current) => ({
        ...current,
        hero: error instanceof Error ? error.message : "Upload failed",
      }));
    }
  };

  const replaceBannerSlideImage = async (index: number, file: File) => {
    const key = `banner-${index}`;
    setUploadState((current) => ({ ...current, [key]: "uploading" }));
    try {
      const item = await uploadFile(file);
      updateBannerSlide(index, { image: item.url });
      setUploadState((current) => ({ ...current, [key]: undefined }));
    } catch (error) {
      setUploadState((current) => ({
        ...current,
        [key]: error instanceof Error ? error.message : "Upload failed",
      }));
    }
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
      setUploadState((current) => ({
        ...current,
        [uploadKey]: error instanceof Error ? error.message : "Upload failed",
      }));
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
      setUploadState((current) => ({
        ...current,
        hero: error instanceof Error ? error.message : "Upload failed",
      }));
    }
  };

  const setPrimaryHeroImage = (index: number) => {
    const nextImages = [...heroImages];
    const [selected] = nextImages.splice(index, 1);
    updateHeroImages([selected, ...nextImages]);
  };

  const removeHeroImage = (index: number) => {
    updateHeroImages(
      heroImages.filter((_, imageIndex) => imageIndex !== index),
    );
  };

  const updateSection = (index: number, patch: Partial<HomeSectionControl>) => {
    setHome((current) => {
      const next = [
        ...(current.sections?.length ? current.sections : sections),
      ];
      next[index] = { ...next[index], ...patch };
      return { ...current, sections: next };
    });
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setHome((current) => {
      const next = [
        ...(current.sections?.length ? current.sections : sections),
      ];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, sections: next };
    });
  };

  const duplicateSection = (index: number) => {
    setHome((current) => {
      const next = [
        ...(current.sections?.length ? current.sections : sections),
      ];
      const source = next[index];
      next.splice(index + 1, 0, {
        ...source,
        id: `${source.type}-${Date.now()}`,
        title: `${source.title ?? source.type} Copy`,
      });
      return { ...current, sections: next };
    });
  };

  const removeSection = (index: number) => {
    setHome((current) => ({
      ...current,
      sections: (current.sections?.length ? current.sections : sections).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  const addSection = (type: HomeSectionType) => {
    const option = sectionOptions.find((item) => item.type === type);
    setHome((current) => ({
      ...current,
      sections: [
        ...(current.sections?.length ? current.sections : sections),
        {
          id: `${type}-${Date.now()}`,
          type,
          title:
            type === "custom" ? "New Custom Section" : (option?.title ?? type),
          enabled: true,
          layout: type === "custom" ? "grid" : undefined,
          blocks: type === "custom" ? [blankBlock("text")] : undefined,
        },
      ],
    }));
  };

  const addCustomBlock = (sectionIndex: number, type: CustomBlockType) => {
    setHome((current) => {
      const next = [
        ...(current.sections?.length ? current.sections : sections),
      ];
      const currentSection = next[sectionIndex];
      next[sectionIndex] = {
        ...currentSection,
        blocks: [...(currentSection.blocks ?? []), blankBlock(type)],
      };
      return { ...current, sections: next };
    });
  };

  const updateCustomBlock = (
    sectionIndex: number,
    blockIndex: number,
    patch: Partial<CustomBlock>,
  ) => {
    setHome((current) => {
      const next = [
        ...(current.sections?.length ? current.sections : sections),
      ];
      const currentSection = next[sectionIndex];
      const blocks = [...(currentSection.blocks ?? [])];
      blocks[blockIndex] = { ...blocks[blockIndex], ...patch };
      next[sectionIndex] = { ...currentSection, blocks };
      return { ...current, sections: next };
    });
  };

  const removeCustomBlock = (sectionIndex: number, blockIndex: number) => {
    setHome((current) => {
      const next = [
        ...(current.sections?.length ? current.sections : sections),
      ];
      const currentSection = next[sectionIndex];
      next[sectionIndex] = {
        ...currentSection,
        blocks: (currentSection.blocks ?? []).filter(
          (_, index) => index !== blockIndex,
        ),
      };
      return { ...current, sections: next };
    });
  };

  const uploadCustomBlockImage = async (
    sectionIndex: number,
    blockIndex: number,
    file: File,
  ) => {
    const key = `custom-${sectionIndex}-${blockIndex}`;
    setUploadState((current) => ({ ...current, [key]: "uploading" }));
    try {
      const data = await uploadFile(file);
      updateCustomBlock(sectionIndex, blockIndex, { image: data.url });
      setUploadState((current) => ({ ...current, [key]: undefined }));
    } catch (error) {
      setUploadState((current) => ({
        ...current,
        [key]: error instanceof Error ? error.message : "Upload failed",
      }));
    }
  };

  const savedSections = savedHome.sections?.length
    ? savedHome.sections
    : defaultSections();

  const savedSection = (sectionId: string) =>
    savedSections.find((item) => item.id === sectionId);

  return (
    <HomeEditorSaveContext.Provider value={{ saveHome, saveState }}>
      <div className="sarjan-home-kpi-grid">
        {previewStats.map(([label, value], index) => (
          <div className="sarjan-home-kpi-card" key={label}>
            <div className="sarjan-home-kpi-icon">
              <i
                className={
                  index === 0
                    ? "icon-edit"
                    : index === 1
                      ? "icon-folders"
                      : index === 2
                        ? "icon-chart-bar"
                        : "icon-users"
                }
              />
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
            <div className="body-text text-secondary">
              Frontend home page reads this data through CMS API.
            </div>
          </div>
          <div className="sarjan-home-action-row">
            {saveState === "saved" && (
              <div className="sarjan-save-state success">Saved</div>
            )}
            {saveState === "error" && (
              <div className="sarjan-save-state danger" title={saveError}>
                {saveError || "Save failed"}
              </div>
            )}
            <button
              type="button"
              className="tf-button style-1"
              onClick={saveHome}
              disabled={saveState === "saving"}
            >
              {saveState === "saving" ? "Saving..." : "Save Home Page"}
            </button>
            <a className="tf-button" href="/" target="_blank">
              Preview Frontend
            </a>
          </div>
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card sarjan-home-hero-editor">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Homepage Banner Slides</h5>
            <div className="body-text text-secondary">
              Add multiple banners — each slide has its own image, text, fonts,
              and button. Same order on website and mobile app after Save.
            </div>
          </div>
          <div className="box-status text-button type-delivery">
            Live Preview
          </div>
        </div>

        <AdminHomeBannerSlides
          banners={bannerSlides}
          uploadState={uploadState}
          onUpload={uploadBannerSlides}
          onReplace={replaceBannerSlideImage}
          onUpdate={updateBannerSlide}
          onMove={moveBannerSlide}
          onRemove={removeBannerSlide}
          onAdd={addBannerSlide}
        />

        <div className="mt-24 pt-24 border-top">
          <div className="body-title mb-10">Optional video slides</div>
          <HeroVideosField
            enabled={Boolean(home.hero.videoEnabled)}
            videos={heroVideos}
            poster={heroImages[0]}
            uploadState={uploadState.heroVideo}
            urlDraft={heroVideoUrlDraft}
            onToggle={updateHeroVideoEnabled}
            onUpload={uploadHeroVideos}
            onAddUrl={addHeroVideoUrl}
            onUrlDraftChange={setHeroVideoUrlDraft}
            onPrimary={setPrimaryHeroVideo}
            onRemove={removeHeroVideo}
          />
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Shopify-style Section Builder</h5>
            <div className="body-text text-secondary">
              Add, hide/show, reorder, duplicate, and remove homepage sections.
              Frontend renders in this exact order.
            </div>
          </div>
          <select
            className="w-auto"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value)
                addSection(event.target.value as HomeSectionType);
              event.currentTarget.value = "";
            }}
          >
            <option value="">Add Section</option>
            {sectionOptions.map((item) => (
              <option value={item.type} key={item.type}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className="d-grid gap-3">
          {sections.map((section, index) => (
            <div className="sarjan-section-builder-card" key={section.id}>
              <div className="sarjan-section-builder-row">
                <div className="d-flex align-items-center gap10">
                  <span className="box-status text-button type-delivery">
                    {index + 1}
                  </span>
                  <div>
                    <h6>
                      {section.title ??
                        sectionOptions.find(
                          (item) => item.type === section.type,
                        )?.title ??
                        section.type}
                    </h6>
                    <div className="text-caption-1 text-secondary">
                      {section.type}
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
                      updateSection(index, {
                        enabled: section.enabled === false,
                      })
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

              {section.type === "custom" && (
                <div className="sarjan-custom-section-editor">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
                    <HtmlField
                      label="Section name"
                      value={section.title ?? ""}
                      savedValue={savedSection(section.id)?.title ?? ""}
                      onChange={(value) =>
                        updateSection(index, { title: value })
                      }
                      rows={3}
                      placeholder="Example: Summer Collection"
                    />
                    <Field label="Layout">
                      <select
                        value={section.layout ?? "grid"}
                        onChange={(event) =>
                          updateSection(index, {
                            layout: event.target
                              .value as HomeSectionControl["layout"],
                          })
                        }
                      >
                        <option value="grid">Grid</option>
                        <option value="banner">Banner</option>
                        <option value="split">Split</option>
                      </select>
                    </Field>
                  </div>
                  <HtmlField
                    label="Section subtitle"
                    value={section.subtitle ?? ""}
                    savedValue={savedSection(section.id)?.subtitle ?? ""}
                    onChange={(value) =>
                      updateSection(index, { subtitle: value })
                    }
                    rows={4}
                    placeholder="Optional subtitle shown under section name"
                  />
                  <div className="sarjan-custom-block-actions">
                    <span className="body-title">Add content:</span>
                    {(
                      [
                        "text",
                        "image",
                        "button",
                        "product",
                      ] as CustomBlockType[]
                    ).map((type) => (
                      <button
                        type="button"
                        className="tf-button"
                        onClick={() => addCustomBlock(index, type)}
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
                        >
                          <div className="flex justify-between gap10 items-center mb-16">
                            <span className="box-status text-button type-delivery">
                              {block.type}
                            </span>
                            <button
                              type="button"
                              className="tf-button"
                              onClick={() =>
                                removeCustomBlock(index, blockIndex)
                              }
                            >
                              Remove
                            </button>
                          </div>

                          {block.type === "text" && (
                            <div className="d-grid gap-3">
                              <HtmlField
                                label="Heading"
                                value={block.heading ?? ""}
                                savedValue={
                                  savedSection(section.id)?.blocks?.find(
                                    (item) => item.id === block.id,
                                  )?.heading ?? ""
                                }
                                onChange={(value) =>
                                  updateCustomBlock(index, blockIndex, {
                                    heading: value,
                                  })
                                }
                                rows={3}
                              />
                              <HtmlField
                                label="Text"
                                value={block.body ?? ""}
                                savedValue={
                                  savedSection(section.id)?.blocks?.find(
                                    (item) => item.id === block.id,
                                  )?.body ?? ""
                                }
                                onChange={(value) =>
                                  updateCustomBlock(index, blockIndex, {
                                    body: value,
                                  })
                                }
                                rows={6}
                              />
                            </div>
                          )}

                          {block.type === "image" && (
                            <div className="d-grid gap-3">
                              <div className="sarjan-custom-image-preview">
                                <img
                                  src={
                                    block.image ||
                                    "/sarjan-assets/banner-textiles-studio.webp"
                                  }
                                  alt={block.alt ?? ""}
                                />
                              </div>
                              <label className="sarjan-category-upload">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (file)
                                      uploadCustomBlockImage(
                                        index,
                                        blockIndex,
                                        file,
                                      );
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
                                uploadState[uploadKey] !== "uploading" && (
                                  <div className="text-tiny text-danger">
                                    {uploadState[uploadKey]}
                                  </div>
                                )}
                              <Field label="Alt text">
                                <TextInput
                                  value={block.alt ?? ""}
                                  onChange={(value) =>
                                    updateCustomBlock(index, blockIndex, {
                                      alt: value,
                                    })
                                  }
                                />
                              </Field>
                            </div>
                          )}

                          {block.type === "button" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <HtmlField
                                label="Button label"
                                value={block.label ?? ""}
                                savedValue={
                                  savedSection(section.id)?.blocks?.find(
                                    (item) => item.id === block.id,
                                  )?.label ?? ""
                                }
                                onChange={(value) =>
                                  updateCustomBlock(index, blockIndex, {
                                    label: value,
                                  })
                                }
                                rows={3}
                              />
                              <Field label="Button link">
                                <TextInput
                                  value={block.href ?? ""}
                                  onChange={(value) =>
                                    updateCustomBlock(index, blockIndex, {
                                      href: value,
                                    })
                                  }
                                />
                              </Field>
                            </div>
                          )}

                          {block.type === "product" && (
                            <Field label="Product">
                              <select
                                value={block.productSlug ?? ""}
                                onChange={(event) =>
                                  updateCustomBlock(index, blockIndex, {
                                    productSlug: event.target.value,
                                  })
                                }
                              >
                                <option value="">Select Product</option>
                                {products.slice(0, 500).map((product) => (
                                  <option
                                    value={product.slug}
                                    key={product.slug}
                                  >
                                    {product.name} / {product.sku}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Category Cards After Banner</h5>
            <div className="body-text text-secondary">
              Three featured collection blocks shown under homepage banner.
            </div>
          </div>
          <div className="box-status text-button type-delivery">
            {home.categories.length} Cards
          </div>
        </div>
        <div className="sarjan-category-editor-grid">
          {(home.categories as Category[]).map((category, index) => (
            <div
              className="sarjan-category-editor-card"
              key={`${category.name}-${index}`}
            >
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
                <span>
                  {uploadState[`category-${index}`] === "uploading"
                    ? "Uploading..."
                    : "Choose Image"}
                </span>
                <small>JPG, PNG, WEBP</small>
              </label>
              {uploadState[`category-${index}`] &&
                uploadState[`category-${index}`] !== "uploading" && (
                  <div className="text-tiny text-danger">
                    {uploadState[`category-${index}`]}
                  </div>
                )}
              <div className="sarjan-category-fields">
                <HtmlField
                  label="Card title"
                  value={category.name}
                  savedValue={savedHome.categories[index]?.name ?? ""}
                  onChange={(value) => updateCategory(index, "name", value)}
                  rows={3}
                />
                <Field label="Link">
                  <TextInput
                    value={category.href ?? "#catalog"}
                    onChange={(value) => updateCategory(index, "href", value)}
                  />
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
            <div className="body-text text-secondary">
              Manage visible titles and subtitles for homepage content blocks.
            </div>
          </div>
          <div className="box-status text-button type-delivery">4 Sections</div>
        </div>
        <div className="sarjan-heading-editor-grid">
          <div className="sarjan-heading-editor-card">
            <div className="sarjan-heading-preview">
              <span>01</span>
              <div>
                <h6>{home.topPicksTitle ?? "Today's Top Picks"}</h6>
                <p>
                  {home.topPicksDescription ??
                    "Fresh Sarjan textile products from admin-managed data."}
                </p>
              </div>
            </div>
            <div className="sarjan-heading-fields">
              <HtmlField
                label="Section title"
                value={home.topPicksTitle ?? "Today's Top Picks"}
                savedValue={savedHome.topPicksTitle ?? "Today's Top Picks"}
                onChange={(value) =>
                  setHome((current) => ({ ...current, topPicksTitle: value }))
                }
                rows={3}
              />
              <HtmlField
                label="Section subtitle"
                value={home.topPicksDescription ?? ""}
                savedValue={savedHome.topPicksDescription ?? ""}
                onChange={(value) =>
                  setHome((current) => ({
                    ...current,
                    topPicksDescription: value,
                  }))
                }
                rows={4}
              />
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
              <HtmlField
                label="Section title"
                value={home.trendingTitle}
                savedValue={savedHome.trendingTitle}
                onChange={(value) =>
                  setHome((current) => ({ ...current, trendingTitle: value }))
                }
                rows={3}
              />
              <HtmlField
                label="Section subtitle"
                value={home.trendingDescription}
                savedValue={savedHome.trendingDescription}
                onChange={(value) =>
                  setHome((current) => ({
                    ...current,
                    trendingDescription: value,
                  }))
                }
                rows={4}
              />
            </div>
          </div>

          <div className="sarjan-heading-editor-card">
            <div className="sarjan-heading-preview">
              <span>03</span>
              <div>
                <h6>{home.testimonialsTitle ?? "Customer Say!"}</h6>
                <p>
                  {home.testimonialsDescription ??
                    "Our customers adore our products, and we constantly aim to delight them."}
                </p>
              </div>
            </div>
            <div className="sarjan-heading-fields">
              <HtmlField
                label="Section title"
                value={home.testimonialsTitle ?? "Customer Say!"}
                savedValue={savedHome.testimonialsTitle ?? "Customer Say!"}
                onChange={(value) =>
                  setHome((current) => ({
                    ...current,
                    testimonialsTitle: value,
                  }))
                }
                rows={3}
              />
              <HtmlField
                label="Section subtitle"
                value={home.testimonialsDescription ?? ""}
                savedValue={savedHome.testimonialsDescription ?? ""}
                onChange={(value) =>
                  setHome((current) => ({
                    ...current,
                    testimonialsDescription: value,
                  }))
                }
                rows={4}
              />
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
              <HtmlField
                label="Section title"
                value={home.galleryTitle}
                savedValue={savedHome.galleryTitle}
                onChange={(value) =>
                  setHome((current) => ({ ...current, galleryTitle: value }))
                }
                rows={3}
              />
              <HtmlField
                label="Section subtitle"
                value={home.galleryDescription}
                savedValue={savedHome.galleryDescription}
                onChange={(value) =>
                  setHome((current) => ({
                    ...current,
                    galleryDescription: value,
                  }))
                }
                rows={4}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Highlights / Credit Stats</h5>
            <div className="body-text text-secondary">
              Compact trust metrics shown on homepage.
            </div>
          </div>
          <div className="box-status text-button type-delivery">
            {home.highlights.length} Stats
          </div>
        </div>
        <div className="sarjan-highlight-editor-grid">
          {home.highlights.map((highlight, index) => (
            <div
              className="sarjan-highlight-editor-card"
              key={`${highlight.label}-${index}`}
            >
              <div className="sarjan-highlight-preview">
                <div className="sarjan-highlight-value">{highlight.value}</div>
                <div className="sarjan-highlight-label">{highlight.label}</div>
              </div>
              <div className="sarjan-compact-fields">
                <HtmlField
                  label="Value"
                  value={highlight.value}
                  savedValue={savedHome.highlights[index]?.value ?? ""}
                  onChange={(value) => updateHighlight(index, "value", value)}
                  rows={3}
                />
                <HtmlField
                  label="Label"
                  value={highlight.label}
                  savedValue={savedHome.highlights[index]?.label ?? ""}
                  onChange={(value) => updateHighlight(index, "label", value)}
                  rows={3}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Marquee Text</h5>
            <div className="body-text text-secondary">
              Scrolling textile messages used between homepage sections.
            </div>
          </div>
          <div className="box-status text-button type-delivery">
            {home.marqueeTop.length + home.marqueeBottom.length} Lines
          </div>
        </div>
        <div className="sarjan-marquee-editor-grid">
          <div className="sarjan-marquee-editor-card">
            <div className="sarjan-marquee-preview">
              {home.marqueeTop.slice(0, 4).map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
            <Field label="Top marquee, one per line">
              <textarea
                value={joinLines(home.marqueeTop)}
                onChange={(event) =>
                  setHome((current) => ({
                    ...current,
                    marqueeTop: splitLines(event.target.value),
                  }))
                }
              />
            </Field>
          </div>
          <div className="sarjan-marquee-editor-card">
            <div className="sarjan-marquee-preview alt">
              {home.marqueeBottom.slice(0, 4).map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
            <Field label="Bottom marquee, one per line">
              <textarea
                value={joinLines(home.marqueeBottom)}
                onChange={(event) =>
                  setHome((current) => ({
                    ...current,
                    marqueeBottom: splitLines(event.target.value),
                  }))
                }
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card">
        <div className="flex flex-wrap justify-between gap14 items-center mb-24">
          <div>
            <h5>Service Icons</h5>
            <div className="body-text text-secondary">
              Homepage service promise cards with icon, title, and body text.
            </div>
          </div>
          <div className="box-status text-button type-delivery">
            {home.services.length} Services
          </div>
        </div>
        <div className="sarjan-service-editor-grid">
          {home.services.map((service, index) => (
            <div
              className="sarjan-service-editor-card"
              key={`${service.title}-${index}`}
            >
              <div className="sarjan-service-preview">
                <div className="sarjan-service-icon">
                  <i className={service.icon} />
                </div>
                <h6>{service.title}</h6>
                <p>{service.body}</p>
              </div>
              <div className="sarjan-compact-fields">
                <Field label="Icon class">
                  <TextInput
                    value={service.icon}
                    onChange={(value) => updateService(index, "icon", value)}
                  />
                </Field>
                <HtmlField
                  label="Title"
                  value={service.title}
                  savedValue={savedHome.services[index]?.title ?? ""}
                  onChange={(value) => updateService(index, "title", value)}
                  rows={3}
                />
                <HtmlField
                  label="Body"
                  value={service.body}
                  savedValue={savedHome.services[index]?.body ?? ""}
                  onChange={(value) => updateService(index, "body", value)}
                  rows={6}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wg-box mb-30 sarjan-home-editor-card sarjan-testimonial-routing-card">
        <div>
          <h5>Testimonials moved to approval workflow</h5>
          <div className="body-text text-secondary">
            Approved clients submit testimonials from My Account (login
            required). Admin approves them here. Order feedback is under Order
            Feedback.
          </div>
        </div>
        <a className="tf-button style-1" href="/admin/testimonials">
          Manage Testimonials
        </a>
      </div>
    </HomeEditorSaveContext.Provider>
  );
}
