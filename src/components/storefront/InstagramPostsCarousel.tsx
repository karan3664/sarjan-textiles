"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InstagramProfileEmbed } from "@/components/storefront/InstagramProfileEmbed";
import { fetchInstagramPostsInBrowser } from "@/lib/instagram-parse";
import type { InstagramPost } from "@/lib/instagram-types";

type Props = {
  posts: InstagramPost[];
  profileUrl: string;
  username: string;
};

type SwiperInstance = {
  destroy: (deleteInstance?: boolean, cleanStyles?: boolean) => void;
};

type SwiperGlobal = {
  new (
    selector: string | HTMLElement,
    options?: Record<string, unknown>,
  ): SwiperInstance;
};

function instagramImageSrc(url: string) {
  return `/api/instagram/media?url=${encodeURIComponent(url)}`;
}

function initInstagramSwiper(
  root: HTMLElement | null,
  swiperRef: React.MutableRefObject<SwiperInstance | null>,
) {
  if (!root) return;

  const SwiperCtor = (window as Window & { Swiper?: SwiperGlobal }).Swiper;
  if (!SwiperCtor) return;

  swiperRef.current?.destroy(true, true);
  swiperRef.current = null;
  delete root.dataset.swiperReady;

  const pagination = root.parentElement?.querySelector(
    ".sw-pagination-gallery",
  ) as HTMLElement | null;

  swiperRef.current = new SwiperCtor(root, {
    slidesPerView: 2,
    spaceBetween: 8,
    loop: true,
    speed: 800,
    observer: true,
    observeParents: true,
    watchOverflow: true,
    pagination: pagination ? { el: pagination, clickable: true } : undefined,
    breakpoints: {
      576: {
        slidesPerView: 2,
        spaceBetween: 10,
      },
      768: {
        slidesPerView: 3,
        spaceBetween: 10,
      },
      992: {
        slidesPerView: 4,
        spaceBetween: 10,
      },
      1200: {
        slidesPerView: 5,
        spaceBetween: 10,
      },
      1400: {
        slidesPerView: 6,
        spaceBetween: 10,
      },
    },
  });

  root.dataset.swiperReady = "true";
}

function CarouselSlides({
  posts,
  profileUrl,
  username,
  carouselRef,
  swiperRef,
}: {
  posts: InstagramPost[];
  profileUrl: string;
  username: string;
  carouselRef: React.RefObject<HTMLDivElement | null>;
  swiperRef: React.MutableRefObject<SwiperInstance | null>;
}) {
  const handle = username.replace(/^@/, "");

  useEffect(() => {
    const tryInit = () => initInstagramSwiper(carouselRef.current, swiperRef);
    tryInit();
    const timer = window.setInterval(() => {
      if (carouselRef.current?.dataset.swiperReady === "true") {
        window.clearInterval(timer);
        return;
      }
      tryInit();
    }, 200);
    return () => {
      window.clearInterval(timer);
      swiperRef.current?.destroy(true, true);
      swiperRef.current = null;
    };
  }, [carouselRef, swiperRef, posts]);

  return (
    <div className="sarjan-instagram-carousel-wrap">
      <div
        ref={carouselRef}
        dir="ltr"
        className="swiper sarjan-instagram-carousel"
      >
        <div className="swiper-wrapper">
          {posts.map((post, index) => (
            <div className="swiper-slide" key={`gallery-${post.id}`}>
              <div
                className="gallery-item hover-overlay hover-img sarjan-instagram-slide wow fadeInUp"
                data-wow-delay={`.${(index % 6) + 1}s`}
              >
                <a
                  href={post.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="img-style sarjan-instagram-gallery-link"
                >
                  <img
                    src={instagramImageSrc(post.image)}
                    alt={post.alt}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </a>
                <a
                  href={post.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="box-icon hover-tooltip"
                >
                  <span className="icon icon-instagram" />
                  <span className="tooltip">View on Instagram</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sw-pagination-gallery sw-dots type-circle justify-content-center" />
      <div className="sarjan-instagram-carousel-footer text-center">
        <Link
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tf-btn btn-fill radius-4"
        >
          <span className="text text-button">Follow @{handle}</span>
        </Link>
      </div>
    </div>
  );
}

export function InstagramPostsCarousel({
  posts: initialPosts,
  profileUrl,
  username,
}: Props) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(!initialPosts.length);
  const handle = username.replace(/^@/, "");

  useEffect(() => {
    setPosts(initialPosts);
    setLoading(!initialPosts.length);

    let cancelled = false;

    const saveCache = (fresh: InstagramPost[]) => {
      void fetch("/api/instagram/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: fresh }),
      });
    };

    const load = async () => {
      try {
        const browserPosts = await fetchInstagramPostsInBrowser(username, 12);
        if (cancelled) return;

        if (browserPosts.length) {
          setPosts(browserPosts);
          saveCache(browserPosts);
          return;
        }

        const res = await fetch("/api/instagram", { cache: "no-store" });
        const data = (await res.json()) as { posts?: InstagramPost[] };
        if (cancelled) return;

        if (data.posts?.length) {
          setPosts(data.posts);
          return;
        }

        if (!initialPosts.length) setPosts([]);
      } catch {
        if (!cancelled && !initialPosts.length) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [initialPosts, username]);

  if (loading) {
    return (
      <div className="sarjan-instagram-empty text-center">
        <p className="text-secondary mb_0">Loading Instagram posts…</p>
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className="sarjan-instagram-empty">
        <p className="text-secondary text-center mb_20">
          Live gallery is updating — showing posts from Instagram directly.
        </p>
        <InstagramProfileEmbed profileUrl={profileUrl} />
        <div className="text-center mt_20">
          <Link
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tf-btn btn-fill radius-4"
          >
            <span className="text text-button">Follow @{handle}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CarouselSlides
      posts={posts}
      profileUrl={profileUrl}
      username={username}
      carouselRef={carouselRef}
      swiperRef={swiperRef}
    />
  );
}
