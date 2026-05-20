export type HeroSlide =
  | { id: string; kind: "image"; src: string }
  | { id: string; kind: "file"; src: string }
  | {
      id: string;
      kind: "youtube";
      videoId: string;
      embedUrl: string;
      heroEmbedUrl: string;
      watchUrl: string;
    };

/** Extract YouTube video id from watch, embed, or youtu.be URLs. */
export function parseYouTubeVideoId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return id && id.length === 11 ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname.startsWith("/embed/")) {
        const id = url.pathname.split("/")[2];
        return id && id.length === 11 ? id : null;
      }
      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/")[2];
        return id && id.length === 11 ? id : null;
      }
      const v = url.searchParams.get("v");
      return v && v.length === 11 ? v : null;
    }
  } catch {
    /* fall through to regex */
  }

  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}

export function youtubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: videoId,
    controls: "0",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
    disablekb: "1",
    fs: "0",
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/** Hero slider: play once, enable JS API for end detection (no loop). */
export function youtubeHeroEmbedUrl(videoId: string, origin?: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
    disablekb: "1",
    fs: "0",
    enablejsapi: "1",
  });
  const siteOrigin = origin?.trim().replace(/\/$/, "");
  if (siteOrigin) params.set("origin", siteOrigin);
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export type HeroVideoSource =
  | { type: "youtube"; videoId: string; embedUrl: string }
  | { type: "file"; src: string };

/** Resolve CMS hero video URL to a playable source (YouTube or uploaded file). */
export function parseHeroVideoSource(raw: string): HeroVideoSource | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const youtubeId = parseYouTubeVideoId(trimmed);
  if (youtubeId) {
    return {
      type: "youtube",
      videoId: youtubeId,
      embedUrl: youtubeEmbedUrl(youtubeId),
    };
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return { type: "file", src: trimmed };
  }

  return null;
}

/** CMS hero videos — supports legacy single `videoUrl`. */
export function normalizeHeroVideoUrls(hero?: {
  videoUrls?: unknown;
  videoUrl?: string;
}): string[] {
  if (Array.isArray(hero?.videoUrls)) {
    const urls = hero.videoUrls
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    if (urls.length) return urls;
  }
  const legacy = String(hero?.videoUrl ?? "").trim();
  return legacy ? [legacy] : [];
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function buildHeroSlides(
  images: string[],
  videoEnabled: boolean,
  videoUrls: string[],
  siteOrigin?: string,
): HeroSlide[] {
  const safeImages = images.length
    ? images
    : ["/sarjan-assets/banner-textiles-studio.webp"];

  const slides: HeroSlide[] = safeImages.map((src, index) => ({
    id: `image-${index}-${src}`,
    kind: "image",
    src,
  }));

  if (!videoEnabled) return slides;

  normalizeHeroVideoUrls({ videoUrls }).forEach((raw, index) => {
    const video = parseHeroVideoSource(raw);
    if (!video) return;

    if (video.type === "youtube") {
      slides.push({
        id: `youtube-${video.videoId}-${index}`,
        kind: "youtube",
        videoId: video.videoId,
        embedUrl: video.embedUrl,
        heroEmbedUrl: youtubeHeroEmbedUrl(video.videoId, siteOrigin),
        watchUrl: youtubeWatchUrl(video.videoId),
      });
    } else {
      slides.push({
        id: `file-${index}-${video.src}`,
        kind: "file",
        src: video.src,
      });
    }
  });

  return slides;
}

export function isYouTubeHeroUrl(raw: string): boolean {
  return parseYouTubeVideoId(raw) !== null;
}
