"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildHeroSlides,
  normalizeHeroVideoUrls,
  type HeroSlide,
} from "@/lib/hero-video";

const IMAGE_SLIDE_MS = 5000;

function isVideoSlide(slide: HeroSlide | undefined): boolean {
  return slide?.kind === "file" || slide?.kind === "youtube";
}

export function HomeHeroRotator({
  images,
  title,
  description,
  cta,
  videoEnabled = false,
  videoUrls = [],
  videoUrl = "",
}: {
  images: string[];
  title: string;
  description: string;
  cta: { label: string; href: string };
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
      className={`tf-slideshow slider-center slider-parallax sarjan-hero-rotator${onVideoSlide ? " sarjan-hero-rotator--video-slide" : ""}`}
    >
      {slides.map((slide, index) => (
        <HeroSlideLayer
          key={slide.id}
          slide={slide}
          isActive={index === active}
          videoRef={slide.kind === "file" ? videoRef : undefined}
          youtubeRef={slide.kind === "youtube" ? youtubeRef : undefined}
        />
      ))}
      {/* Keep in DOM for height; hidden on video slides via CSS */}
      <div className="wrap-slider" aria-hidden={onVideoSlide}>
        <div className="box-content">
          <div className="container">
            <div className="content-slider">
              <div className="box-title-slider">
                <div
                  className="heading text-white title-display wow fadeInUp"
                  data-wow-delay="0s"
                >
                  {title}
                </div>
                <p
                  className="body-text-1 subheading text-white wow fadeInUp"
                  data-wow-delay=".1s"
                >
                  {description}
                </p>
              </div>
              <div className="box-btn-slider wow fadeInUp" data-wow-delay=".2s">
                <Link href={cta.href} className="tf-btn btn-fill btn-white">
                  <span className="text">{cta.label}</span>
                  <i className="icon icon-arrowUpRight" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  if (slide.kind === "image") {
    return (
      <div
        className={`sarjan-hero-slide${isActive ? " active" : ""}`}
        style={{ backgroundImage: `url(${slide.src})` }}
        aria-hidden={!isActive}
      />
    );
  }

  if (slide.kind === "file") {
    return (
      <div
        className={`sarjan-hero-slide sarjan-hero-slide--video${isActive ? " active" : ""}`}
        aria-hidden={!isActive}
      >
        {isActive ? (
          <video
            ref={videoRef}
            className="sarjan-hero-video"
            src={slide.src}
            autoPlay
            muted
            playsInline
            preload="auto"
          />
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
          <div className="sarjan-hero-youtube-wrap">
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
