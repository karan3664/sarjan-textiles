type SwiperInstance = {
  slideTo: (index: number, speed?: number, runCallbacks?: boolean) => void;
  destroy: (deleteInstance?: boolean, cleanStyles?: boolean) => void;
  on: (event: string, handler: () => void) => void;
  activeIndex: number;
  destroyed?: boolean;
};

type SwiperElement = HTMLElement & { swiper?: SwiperInstance };

type SwiperConstructor = new (
  el: string | HTMLElement,
  options: Record<string, unknown>,
) => SwiperInstance;

let disposeProductGallery: (() => void) | null = null;
let disposeProductPhotoSwipe: (() => void) | null = null;

type PhotoSwipeLightboxInstance = {
  init: () => void;
  destroy: () => void;
  on: (event: string, handler: () => void) => void;
  pswp?: {
    currIndex: number;
    currSlide?: {
      currZoomLevel?: number;
      zoomLevels?: { initial?: number };
    };
  };
};

type PhotoSwipeLightboxCtor = new (
  options: Record<string, unknown>,
) => PhotoSwipeLightboxInstance;

function getSwiperCtor(): SwiperConstructor | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Swiper?: SwiperConstructor }).Swiper ?? null;
}

function mainGalleryEl(): SwiperElement | null {
  return document.querySelector<SwiperElement>(".tf-product-media-main");
}

function thumbsGalleryEl(): SwiperElement | null {
  return document.querySelector<SwiperElement>(".tf-product-media-thumbs");
}

function notifyGallerySlide(index: number) {
  window.dispatchEvent(
    new CustomEvent("sarjan-gallery-slide", { detail: { index } }),
  );
}

type DriftInstance = { destroy: () => void };

type DriftConstructor = new (
  el: Element,
  options: Record<string, unknown>,
) => DriftInstance;

type DriftHost = HTMLElement & { __sarjanDrift?: DriftInstance };

function getDriftCtor(): DriftConstructor | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Drift?: DriftConstructor }).Drift ?? null;
}

/** Bind Drift hover zoom after React renders PDP gallery images. */
export function initProductDetailImageZoom(): void {
  if (typeof window === "undefined") return;
  if (!window.matchMedia("only screen and (min-width: 768px)").matches) return;

  const Drift = getDriftCtor();
  const pane = document.querySelector(".tf-zoom-main");
  if (!Drift || !pane) return;

  document.querySelectorAll<DriftHost>(".tf-image-zoom").forEach((el) => {
    const zoomUrl =
      el.getAttribute("data-zoom")?.trim() || el.getAttribute("src")?.trim();
    if (!zoomUrl) return;
    if (!el.getAttribute("data-zoom")) {
      el.setAttribute("data-zoom", zoomUrl);
    }

    el.__sarjanDrift?.destroy();
    el.__sarjanDrift = new Drift(el, {
      zoomFactor: 2,
      paneContainer: pane,
      inlinePane: false,
      handleTouch: false,
      hoverBoundingBox: true,
      containInline: true,
    });
  });
}

function isPhotoSwipeZoomed(
  pswp: NonNullable<PhotoSwipeLightboxInstance["pswp"]>,
): boolean {
  const slide = pswp.currSlide;
  if (!slide) return false;
  const initial = slide.zoomLevels?.initial ?? 1;
  return (slide.currZoomLevel ?? initial) > initial + 0.01;
}

/** PhotoSwipe lightbox for React PDP gallery (after scripts + DOM are ready). */
export function initProductDetailPhotoSwipe(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const Lightbox = (
    window as unknown as { PhotoSwipeLightbox?: PhotoSwipeLightboxCtor }
  ).PhotoSwipeLightbox;
  const PhotoSwipe = (window as unknown as { PhotoSwipe?: unknown }).PhotoSwipe;
  const gallery = document.querySelector("#gallery-swiper-started");
  if (!Lightbox || !PhotoSwipe || !gallery) return () => undefined;

  disposeProductPhotoSwipe?.();
  disposeProductPhotoSwipe = null;

  const lightbox = new Lightbox({
    gallery: "#gallery-swiper-started",
    children: "a",
    pswpModule: PhotoSwipe,
    bgOpacity: 1,
    secondaryZoomLevel: 2,
    maxZoomLevel: 3,
  });

  lightbox.on("change", () => {
    const { pswp } = lightbox;
    if (!pswp || isPhotoSwipeZoomed(pswp)) return;
    const main = mainGalleryEl()?.swiper;
    if (main && !main.destroyed && typeof main.slideTo === "function") {
      main.slideTo(pswp.currIndex, 0, false);
    }
  });

  lightbox.on("closingAnimationStart", () => {
    const { pswp } = lightbox;
    const main = mainGalleryEl()?.swiper;
    if (main && pswp && !main.destroyed && typeof main.slideTo === "function") {
      main.slideTo(pswp.currIndex, 0, false);
    }
  });

  lightbox.init();

  const dispose = () => {
    lightbox.destroy();
    if (disposeProductPhotoSwipe === dispose) {
      disposeProductPhotoSwipe = null;
    }
  };

  disposeProductPhotoSwipe = dispose;
  return dispose;
}

/** Init PDP thumbs + main gallery (zoom.js often runs before React mounts). */
export function initProductDetailGallerySwiper(initialIndex = 0): () => void {
  const Swiper = getSwiperCtor();
  const slider = document.querySelector<HTMLElement>(".thumbs-slider");
  const thumbsEl = thumbsGalleryEl();
  const mainEl = mainGalleryEl();
  if (!Swiper || !slider || !thumbsEl || !mainEl) return () => undefined;

  disposeProductGallery?.();
  disposeProductGallery = null;

  slider.dataset.sarjanReactGallery = "true";

  const jq = (
    window as unknown as {
      jQuery?: { (sel: string): { off: (ev: string) => void } };
    }
  ).jQuery;
  jq?.(".color-btn").off("click");

  if (mainEl.swiper) {
    mainEl.swiper.destroy(true, true);
  }
  if (thumbsEl.swiper) {
    thumbsEl.swiper.destroy(true, true);
  }

  const direction = thumbsEl.dataset.direction || "vertical";
  const thumbs = new Swiper(thumbsEl, {
    spaceBetween: 10,
    slidesPerView: "auto",
    freeMode: true,
    direction: "vertical",
    watchSlidesProgress: true,
    observer: true,
    observeParents: true,
    breakpoints: {
      0: { direction: "horizontal" },
      1200: { direction },
    },
  });

  const safeInitialIndex = safeGalleryIndex(mainEl, initialIndex);

  const main = new Swiper(mainEl, {
    spaceBetween: 0,
    initialSlide: safeInitialIndex,
    observer: true,
    observeParents: true,
    navigation: {
      nextEl: ".thumbs-next",
      prevEl: ".thumbs-prev",
    },
    thumbs: { swiper: thumbs },
  });

  mainEl.dataset.sarjanSwiperReady = "true";
  thumbsEl.dataset.sarjanSwiperReady = "true";
  mainEl.swiper = main;
  thumbsEl.swiper = thumbs;

  if (safeInitialIndex > 0) {
    try {
      main.slideTo(safeInitialIndex, 0, false);
      thumbs.slideTo(safeInitialIndex, 0, false);
    } catch {
      // Swiper may not be ready yet; slideProductGalleryToIndex will retry.
    }
  }

  const onActiveIndex = () => notifyGallerySlide(main.activeIndex);

  main.on("slideChange", onActiveIndex);
  thumbs.on("slideChange", onActiveIndex);

  window.setTimeout(() => initProductDetailImageZoom(), 0);

  const dispose = () => {
    document.querySelectorAll<DriftHost>(".tf-image-zoom").forEach((el) => {
      el.__sarjanDrift?.destroy();
      delete el.__sarjanDrift;
    });
    if (!mainEl.swiper?.destroyed) {
      mainEl.swiper?.destroy(true, true);
    }
    if (!thumbsEl.swiper?.destroyed) {
      thumbsEl.swiper?.destroy(true, true);
    }
    delete mainEl.swiper;
    delete thumbsEl.swiper;
    delete mainEl.dataset.sarjanSwiperReady;
    delete thumbsEl.dataset.sarjanSwiperReady;
    delete slider.dataset.sarjanReactGallery;
    if (disposeProductGallery === dispose) {
      disposeProductGallery = null;
    }
  };

  disposeProductGallery = dispose;
  return dispose;
}

let gallerySlideToken = 0;

function gallerySlideCount(mainEl: SwiperElement): number {
  return mainEl.querySelectorAll(".swiper-slide").length;
}

function safeGalleryIndex(mainEl: SwiperElement, index: number): number {
  const count = gallerySlideCount(mainEl);
  if (count <= 0) return Math.max(0, index);
  return Math.min(Math.max(0, index), count - 1);
}

export function slideProductGalleryToIndex(index: number) {
  if (typeof window === "undefined" || index < 0) return;

  const token = ++gallerySlideToken;

  const trySlide = (attempt = 0) => {
    if (token !== gallerySlideToken) return;

    const mainEl = mainGalleryEl();
    const thumbsEl = thumbsGalleryEl();
    if (!mainEl || !thumbsEl) return;

    if (!mainEl.swiper || mainEl.swiper.destroyed) {
      initProductDetailGallerySwiper(index);
    }

    const main = mainEl.swiper;
    if (!main || main.destroyed || typeof main.slideTo !== "function") {
      if (attempt < 24) window.setTimeout(() => trySlide(attempt + 1), 50);
      return;
    }

    const safeIndex = safeGalleryIndex(mainEl, index);

    try {
      main.slideTo(safeIndex, 280, true);
      const thumbs = thumbsEl.swiper;
      if (thumbs && !thumbs.destroyed && typeof thumbs.slideTo === "function") {
        thumbs.slideTo(safeIndex, 280, false);
      }
    } catch {
      if (attempt < 24) window.setTimeout(() => trySlide(attempt + 1), 50);
    }
  };

  trySlide();
}
