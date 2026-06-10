"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CmsHtml } from "@/components/shared/CmsHtml";
import {
  buildHeroSlides,
  normalizeHeroVideoUrls,
  type HeroSlide,
} from "@/lib/hero-video";
import { StorefrontBannerImage } from "./StorefrontBannerImage";
import type { CmsHomeBanner } from "@/lib/home-banners";
import { imageIndexForSlide } from "@/lib/home-banners";

const IMAGE_SLIDE_MS = 5000;

function isVideoSlide(slide: HeroSlide | undefined): boolean {
  return slide?.kind === "file" || slide?.kind === "youtube";
}

export function HomeHeroRotator({
  images,
  title,
  description,
  cta,
  bannerSlides = [],
  videoEnabled = false,
  videoUrls = [],
  videoUrl = "",
}: {
  images: string[];
  title: string;
  description: string;
  cta: { label: string; href: string };
  bannerSlides?: CmsHomeBanner[];
  videoEnabled?: boolean;
  videoUrls?: string[];
  /** @deprecated use videoUrls */
  videoUrl?: string;
}) {
  const [siteOrigin, setSiteOrigin] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  const resolvedVideoUrls = useMemo(
    () => normalizeHeroVideoUrls({ videoUrls, videoUrl }),
    [videoUrls, videoUrl],
  );

  const slides = useMemo(
    () => buildHeroSlides(images, videoEnabled, resolvedVideoUrls, siteOrigin),
    [images, videoEnabled, resolvedVideoUrls, siteOrigin],
  );
  const [active, setActive] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeRef = useRef<HTMLIFrameElement>(null);
  const videoEndedRef = useRef(false);
  const activeSlide = slides[active] ?? slides[0];
  const onVideoSlide = isVideoSlide(activeSlide);
  const activeBannerIndex = imageIndexForSlide(slides, active);
  const activeBanner = bannerSlides[activeBannerIndex];
  const slideTitle = activeBanner?.title || title;
  const slideDescription = activeBanner?.description || description;
  const slideCta = {
    label: activeBanner?.ctaLabel || cta.label,
    href: activeBanner?.ctaHref || cta.href,
  };
  const slideEyebrow = activeBanner?.eyebrow?.trim() ?? "";

  const advanceSlide = useCallback(() => {
    if (slides.length < 2) return;
    setActive((current) => (current + 1) % slides.length);
  }, [slides.length]);

  const advanceAfterVideo = useCallback(() => {
    if (videoEndedRef.current) return;
    videoEndedRef.current = true;
    advanceSlide();
  }, [advanceSlide]);

  useEffect(() => {
    videoEndedRef.current = false;
  }, [active]);

  useEffect(() => {
    setActive((current) => (current < slides.length ? current : 0));
  }, [slides.length]);

  /* Image slides: fixed interval. Video slides: wait until playback ends. */
  useEffect(() => {
    if (slides.length < 2 || onVideoSlide) return;
    const timer = window.setInterval(advanceSlide, IMAGE_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [slides.length, onVideoSlide, advanceSlide]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || activeSlide?.kind !== "file") {
      if (video) {
        video.pause();
      }
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = false;

    const onEnded = () => advanceAfterVideo();
    const onError = () => advanceAfterVideo();
    const play = () => {
      void video.play().catch(() => advanceAfterVideo());
    };

    if (video.src !== activeSlide.src) {
      video.src = activeSlide.src;
    }
    video.currentTime = 0;
    play();
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    video.addEventListener("loadeddata", play);
    return () => {
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      video.removeEventListener("loadeddata", play);
      video.pause();
    };
  }, [activeSlide, advanceAfterVideo]);

  useEffect(() => {
    if (activeSlide?.kind !== "youtube") return;

    const iframe = youtubeRef.current;
    const listenToPlayer = () => {
      iframe?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: "1" }),
        "https://www.youtube.com",
      );
      iframe?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "addEventListener",
          args: ["onStateChange"],
          id: "1",
        }),
        "https://www.youtube.com",
      );
    };

    iframe?.addEventListener("load", listenToPlayer);
    listenToPlayer();

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com") return;
      try {
        const raw =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        const ended =
          (raw?.event === "onStateChange" && raw?.info === 0) ||
          (raw?.event === "infoDelivery" && raw?.info?.playerState === 0);
        if (ended) advanceAfterVideo();
      } catch {
        /* ignore non-JSON messages */
      }
    };

    window.addEventListener("message", onMessage);
    return () => {
      iframe?.removeEventListener("load", listenToPlayer);
      window.removeEventListener("message", onMessage);
    };
  }, [activeSlide, advanceAfterVideo]);

  return (
    <div
      className={`tf-slideshow slider-parallax sarjan-hero-rotator${onVideoSlide ? " sarjan-hero-rotator--video-slide" : ""}`}
    >
      <div className="sarjan-hero-rotator-stage">
        {slides.map((slide, index) => (
          <HeroSlideLayer
            key={slide.id}
            slide={slide}
            isActive={index === active}
            videoRef={slide.kind === "file" ? videoRef : undefined}
            youtubeRef={slide.kind === "youtube" ? youtubeRef : undefined}
          />
        ))}
      </div>
      {/* Title/CTA only on image slides — omit on video so mobile never shows copy over YouTube/file video */}
      {!onVideoSlide ? (
        <div className="wrap-slider sarjan-hero-copy-layer">
          <div className="box-content sarjan-hero-copy">
            <div className="content-slider sarjan-hero-copy-stack">
              <div className="box-title-slider sarjan-hero-copy-titles">
                {slideEyebrow ? (
                  <p className="text-button sarjan-hero-eyebrow mb-8 sarjan-cms-banner-text">
                    <CmsHtml html={slideEyebrow} />
                  </p>
                ) : null}
                <h2 className="heading sarjan-hero-heading sarjan-hero-heading-multiline sarjan-cms-banner-text">
                  <CmsHtml html={slideTitle} />
                </h2>
                <p className="body-text-1 subheading sarjan-hero-subheading sarjan-cms-banner-text">
                  <CmsHtml html={slideDescription} />
                </p>
              </div>
              <div className="box-btn-slider sarjan-hero-cta">
                <Link
                  href={slideCta.href}
                  className="tf-btn btn-fill btn-white"
                >
                  <span className="text">
                    <CmsHtml html={slideCta.label} />
                  </span>
                  <i className="icon icon-arrowUpRight" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {slides.length > 1 ? (
        <div className="sarjan-hero-dots">
          {slides.map((slide, index) => (
            <button
              type="button"
              className={index === active ? "active" : ""}
              onClick={() => setActive(index)}
              aria-label={`Show banner ${index + 1}`}
              key={`hero-dot-${slide.id}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const DEFAULT_VIDEO_ASPECT = 16 / 9;

/** Size hero video/YouTube to fill the slide (cover — same as image slides, no letterboxing). */
function useHeroMediaCoverFit(
  wrapRef: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
  aspectRatio: number,
  fittedClass: string,
  widthVar: string,
  heightVar: string,
) {
  const fitMedia = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w < 2 || h < 2) return;

    const mediaAspect = aspectRatio > 0 ? aspectRatio : DEFAULT_VIDEO_ASPECT;
    const containerAspect = w / h;

    let iw: number;
    let ih: number;
    if (containerAspect > mediaAspect) {
      ih = h;
      iw = Math.ceil(h * mediaAspect);
    } else {
      iw = w;
      ih = Math.ceil(w / mediaAspect);
    }

    el.style.setProperty(widthVar, `${iw}px`);
    el.style.setProperty(heightVar, `${ih}px`);
    el.classList.add(fittedClass);
  }, [wrapRef, aspectRatio, fittedClass, widthVar, heightVar]);

  useEffect(() => {
    if (!enabled) return;

    const run = () => fitMedia();
    run();
    const raf = requestAnimationFrame(run);

    const el = wrapRef.current;
    if (!el) return () => cancelAnimationFrame(raf);

    const ro = new ResizeObserver(() => run());
    ro.observe(el);
    window.addEventListener("resize", run);
    window.addEventListener("orientationchange", run);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", run);
      window.removeEventListener("orientationchange", run);
      el.classList.remove(fittedClass);
      el.style.removeProperty(widthVar);
      el.style.removeProperty(heightVar);
    };
  }, [enabled, fitMedia, wrapRef, fittedClass, widthVar, heightVar]);
}

function HeroSlideLayer({
  slide,
  isActive,
  videoRef,
  youtubeRef,
}: {
  slide: HeroSlide;
  isActive: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  youtubeRef?: React.RefObject<HTMLIFrameElement | null>;
}) {
  const youtubeWrapRef = useRef<HTMLDivElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const [fileAspect, setFileAspect] = useState(DEFAULT_VIDEO_ASPECT);

  useHeroMediaCoverFit(
    youtubeWrapRef,
    isActive && slide.kind === "youtube",
    DEFAULT_VIDEO_ASPECT,
    "sarjan-hero-youtube-wrap--fitted",
    "--hero-yt-w",
    "--hero-yt-h",
  );
  useHeroMediaCoverFit(
    videoWrapRef,
    isActive && slide.kind === "file",
    fileAspect,
    "sarjan-hero-video-wrap--fitted",
    "--hero-media-w",
    "--hero-media-h",
  );

  if (slide.kind === "image") {
    return (
      <div
        className={`sarjan-hero-slide sarjan-hero-slide--image${isActive ? " active" : ""}`}
        aria-hidden={!isActive}
      >
        <StorefrontBannerImage
          src={slide.src}
          alt=""
          className="sarjan-hero-slide-img"
          variant="hero"
          priority={isActive}
          fill
        />
      </div>
    );
  }

  if (slide.kind === "file") {
    return (
      <div
        className={`sarjan-hero-slide sarjan-hero-slide--video${isActive ? " active" : ""}`}
        aria-hidden={!isActive}
      >
        {isActive ? (
          <div ref={videoWrapRef} className="sarjan-hero-video-wrap">
            <video
              ref={videoRef}
              className="sarjan-hero-video"
              src={slide.src}
              autoPlay
              muted
              playsInline
              preload="auto"
              onLoadedMetadata={(event) => {
                const el = event.currentTarget;
                if (el.videoWidth > 0 && el.videoHeight > 0) {
                  setFileAspect(el.videoWidth / el.videoHeight);
                }
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`sarjan-hero-slide sarjan-hero-slide--video sarjan-hero-slide--youtube${isActive ? " active" : ""}`}
      aria-hidden={!isActive}
    >
      {isActive ? (
        <>
          <div ref={youtubeWrapRef} className="sarjan-hero-youtube-wrap">
            <iframe
              ref={youtubeRef}
              className="sarjan-hero-youtube"
              src={slide.heroEmbedUrl}
              title="Hero banner video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <a
            href={slide.watchUrl}
            className="sarjan-hero-youtube-link sarjan-hero-youtube-link--bottom-right"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Watch on YouTube"
          >
            <span className="sarjan-hero-youtube-link-pill">
              Watch on YouTube
              <i className="icon icon-arrowUpRight" aria-hidden />
            </span>
          </a>
        </>
      ) : null}
    </div>
  );
}
