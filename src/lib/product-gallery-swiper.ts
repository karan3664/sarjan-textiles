type SwiperInstance = {
  slideTo: (index: number, speed?: number, runCallbacks?: boolean) => void;
  destroy: (deleteInstance?: boolean, cleanStyles?: boolean) => void;
  on: (event: string, handler: () => void) => void;
  activeIndex: number;
};

type SwiperElement = HTMLElement & { swiper?: SwiperInstance };

type SwiperConstructor = new (
  el: string | HTMLElement,
  options: Record<string, unknown>,
) => SwiperInstance;

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

/** Init PDP thumbs + main gallery (zoom.js often runs before React mounts). */
export function initProductDetailGallerySwiper(): () => void {
  const Swiper = getSwiperCtor();
  const slider = document.querySelector<HTMLElement>(".thumbs-slider");
  const thumbsEl = thumbsGalleryEl();
  const mainEl = mainGalleryEl();
  if (!Swiper || !slider || !thumbsEl || !mainEl) return () => undefined;

  slider.dataset.sarjanReactGallery = "true";

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

  const main = new Swiper(mainEl, {
    spaceBetween: 0,
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

  const onActiveIndex = () => notifyGallerySlide(main.activeIndex);

  main.on("slideChange", onActiveIndex);
  thumbs.on("slideChange", onActiveIndex);

  return () => {
    main.destroy(true, true);
    thumbs.destroy(true, true);
    delete mainEl.dataset.sarjanSwiperReady;
    delete thumbsEl.dataset.sarjanSwiperReady;
    delete slider.dataset.sarjanReactGallery;
  };
}

let gallerySlideToken = 0;

export function slideProductGalleryToIndex(index: number) {
  if (typeof window === "undefined" || index < 0) return;

  const token = ++gallerySlideToken;

  const trySlide = (attempt = 0) => {
    if (token !== gallerySlideToken) return;

    const mainEl = mainGalleryEl();
    const thumbsEl = thumbsGalleryEl();
    if (!mainEl || !thumbsEl) return;

    if (!mainEl.swiper) {
      initProductDetailGallerySwiper();
    }

    const main = mainEl.swiper;
    const thumbs = thumbsEl.swiper;
    if (!main) {
      if (attempt < 16) window.setTimeout(() => trySlide(attempt + 1), 60);
      return;
    }

    if (main.activeIndex === index) return;

    main.slideTo(index, 280, false);
    thumbs?.slideTo(index, 280, false);
  };

  trySlide();
}
