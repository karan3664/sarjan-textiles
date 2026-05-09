if ($(".tf-sw-card").length > 0) {
  var swiper = new Swiper(".tf-sw-card", {
    observer: true,
    observeParents: true,
    slidesPerView: 4,
    spaceBetween: 30,
    // loop: true,
    autoplay: {
      delay: 200,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    autoplay: false,
    speed: 600,
    pagination: {
      el: ".sw-card-pagination",
      clickable: true,
    },
    breakpoints: {
      0: {
        slidesPerView: 1
      },
      768: {
        slidesPerView: 2
      },
      991: {
        slidesPerView: 3
      },
      1440: {
        slidesPerView: 4
      }
    },
  });

}

