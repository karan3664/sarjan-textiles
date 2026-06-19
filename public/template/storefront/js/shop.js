/**
 * Range Two Price
 * Filter Products
 * Filter Sort
 * Switch Layout
 * Handle Sidebar Filter
 * Handle Dropdown Filter
 */
(function ($) {
  "use strict";

  var GRID_COLUMN_CLASSES =
    "tf-col-2 tf-col-3 tf-col-4 tf-col-5 tf-col-6 tf-col-7";

  function isListLayoutActive() {
    return $(".wrapper-control-shop").hasClass("listLayout-wrapper");
  }

  /** jQuery .show() restores display:block and breaks CSS grid — clear inline instead. */
  function clearInlineLayoutDisplay() {
    $("#gridLayout, #listLayout").css("display", "");
  }

  /** Preserve Sarjan grid classes — never use .removeClass() with no args. */
  function applyGridColumnLayout(layoutClass) {
    var $grid = $("#gridLayout");
    if (!$grid.length || !layoutClass) {
      return;
    }
    $grid.removeClass(GRID_COLUMN_CLASSES).addClass(layoutClass);
    clearInlineLayoutDisplay();
    $(".wrapper-control-shop")
      .addClass("gridLayout-wrapper")
      .removeClass("listLayout-wrapper");
    $(".tf-view-layout-switch").removeClass("active");
    $(
      '.tf-view-layout-switch[data-value-layout="' + layoutClass + '"]',
    ).addClass("active");
  }

  function applyListLayout() {
    clearInlineLayoutDisplay();
    $(".wrapper-control-shop")
      .addClass("listLayout-wrapper")
      .removeClass("gridLayout-wrapper");
    $(".tf-view-layout-switch").removeClass("active");
    $('.tf-view-layout-switch[data-value-layout="list"]').addClass("active");
  }

  /* Range Two Price
  -------------------------------------------------------------------------------------*/
  var rangeTwoPrice = function () {
    if ($("#price-value-range").length > 0) {
      var skipSlider = document.getElementById("price-value-range");
      var skipValues = [
        document.getElementById("price-min-value"),
        document.getElementById("price-max-value"),
      ];

      var min = parseInt(skipSlider.getAttribute("data-min"));
      var max = parseInt(skipSlider.getAttribute("data-max"));

      noUiSlider.create(skipSlider, {
        start: [min, max],
        connect: true,
        step: 1,
        range: {
          min: min,
          max: max,
        },
        format: {
          from: function (value) {
            return parseInt(value);
          },
          to: function (value) {
            return parseInt(value);
          },
        },
      });

      skipSlider.noUiSlider.on("update", function (val, e) {
        skipValues[e].innerText = val[e];
      });
    }
  };

  /* Filter Products
  -------------------------------------------------------------------------------------*/
  var filterProducts = function () {
    const priceSlider = document.getElementById("price-value-range");
    if (!priceSlider || !priceSlider.dataset || !priceSlider.noUiSlider) {
      return;
    }

    const minPrice = parseInt(priceSlider.dataset.min);
    const maxPrice = parseInt(priceSlider.dataset.max);
    const parseMoney = function (text) {
      return parseFloat(String(text || "").replace(/[^\d.]/g, "")) || 0;
    };

    const filters = {
      minPrice: minPrice,
      maxPrice: maxPrice,
      size: null,
      color: null,
      availability: null,
      brands: [],
      sale: false,
    };

    priceSlider.noUiSlider.on("update", function (values) {
      filters.minPrice = parseInt(values[0]);
      filters.maxPrice = parseInt(values[1]);

      $("#price-min-value").text(filters.minPrice);
      $("#price-max-value").text(filters.maxPrice);

      applyFilters();
      updateMetaFilter();
    });

    $(".size-check").click(function () {
      filters.size = $(this).hasClass("free-size")
        ? null
        : $(this).text().trim();
      applyFilters();
      updateMetaFilter();
    });

    $(".color-check").click(function () {
      filters.color = $(this).text().trim();
      applyFilters();
      updateMetaFilter();
    });

    $('input[name="availability"]').change(function () {
      filters.availability =
        $(this).attr("id") === "inStock" ? "In stock" : "Out of stock";
      applyFilters();
      updateMetaFilter();
    });

    $('input[name="brand"]').change(function () {
      const brandId = $(this).attr("id");
      let brandLabel = $(this).next("label").text().trim();
      brandLabel = brandLabel.replace(/\s*\(\d+\)$/, "");

      if ($(this).is(":checked")) {
        filters.brands.push({ id: brandId, label: brandLabel });
      } else {
        filters.brands = filters.brands.filter((brand) => brand.id !== brandId);
      }
      applyFilters();
      updateMetaFilter();
    });

    $(".shop-sale-text").click(function () {
      filters.sale = !filters.sale;
      $(this).toggleClass("active", filters.sale);
      applyFilters();
      updateMetaFilter();
    });

    function updateMetaFilter() {
      const appliedFilters = $("#applied-filters");
      const metaFilterShop = $(".meta-filter-shop");
      appliedFilters.empty();

      if (filters.availability) {
        appliedFilters.append(
          `<span class="filter-tag">${filters.availability} <span class="remove-tag icon-close" data-filter="availability"></span></span>`,
        );
      }
      if (filters.size) {
        appliedFilters.append(
          `<span class="filter-tag">${filters.size} <span class="remove-tag icon-close" data-filter="size"></span></span>`,
        );
      }
      if (filters.minPrice > minPrice || filters.maxPrice < maxPrice) {
        appliedFilters.append(
          `<span class="filter-tag">$${filters.minPrice} - $${filters.maxPrice} <span class="remove-tag icon-close" data-filter="price"></span></span>`,
        );
      }
      if (filters.color) {
        const colorElement = $(`.color-check:contains('${filters.color}')`);
        const backgroundClass = colorElement
          .find(".color")
          .attr("class")
          .split(" ")
          .find((cls) => cls.startsWith("bg-"));
        const line = backgroundClass === "bg-white" ? "line-black" : "";
        appliedFilters.append(
          `<span class="filter-tag color-tag">
                  <span class="color ${backgroundClass} ${line}"></span>
                  ${filters.color}
                  <span class="remove-tag icon-close" data-filter="color"></span>
              </span>`,
        );
      }

      if (filters.brands.length > 0) {
        filters.brands.forEach((brand) => {
          appliedFilters.append(
            `<span class="filter-tag">${brand.label} <span class="remove-tag icon-close" data-filter="brand" data-value="${brand.id}"></span></span>`,
          );
        });
      }

      if (filters.sale) {
        appliedFilters.append(
          `<span class="filter-tag on-sale d-none">On Sale <span class="remove-tag icon-close" data-filter="sale"></span></span>`,
        );
      }

      const hasFiltersApplied = appliedFilters.children().length > 0;
      metaFilterShop.toggle(hasFiltersApplied);

      $("#remove-all").toggle(hasFiltersApplied);
    }

    $("#applied-filters").on("click", ".remove-tag", function () {
      const filterType = $(this).data("filter");
      const filterValue = $(this).data("value");

      if (filterType === "size") {
        filters.size = null;
        $(".size-check").removeClass("active");
      }
      if (filterType === "color") {
        filters.color = null;
        $(".color-check").removeClass("active");
      }
      if (filterType === "availability") {
        filters.availability = null;
        $('input[name="availability"]').prop("checked", false);
      }
      if (filterType === "brand") {
        filters.brands = filters.brands.filter(
          (brand) => brand.id !== filterValue,
        );
        $(`input[name="brand"][id="${filterValue}"]`).prop("checked", false);
      }
      if (filterType === "price") {
        filters.minPrice = minPrice;
        filters.maxPrice = maxPrice;
        priceSlider.noUiSlider.set([minPrice, maxPrice]);
      }

      if (filterType === "sale") {
        filters.sale = false;
        $(".shop-sale-text").removeClass("active");
      }

      applyFilters();
      updateMetaFilter();
    });

    $("#remove-all,#reset-filter").click(function () {
      filters.size = null;
      filters.color = null;
      filters.availability = null;
      filters.brands = [];
      filters.minPrice = minPrice;
      filters.maxPrice = maxPrice;
      filters.sale = false;

      $(".shop-sale-text").removeClass("active");
      $('input[name="brand"]').prop("checked", false);
      $('input[name="availability"]').prop("checked", false);
      $(".size-check, .color-check").removeClass("active");
      priceSlider.noUiSlider.set([minPrice, maxPrice]);

      applyFilters();
      updateMetaFilter();
    });

    function applyFilters() {
      let visibleProductCountGrid = 0;
      let visibleProductCountList = 0;

      $(".wrapper-shop .card-product").each(function () {
        const product = $(this);
        let showProduct = true;

        const priceText = product.find(".current-price").text();
        const price = parseMoney(priceText);
        if (price < filters.minPrice || price > filters.maxPrice) {
          showProduct = false;
        }

        if (
          filters.size &&
          !product.find(`.size-item:contains('${filters.size}')`).length
        ) {
          showProduct = false;
        }

        if (
          filters.color &&
          !product.find(`.color-swatch:contains('${filters.color}')`).length
        ) {
          showProduct = false;
        }

        if (filters.availability) {
          const availabilityStatus = product.data("availability");
          if (filters.availability !== availabilityStatus) {
            showProduct = false;
          }
        }

        if (filters.sale) {
          if (!product.find(".on-sale-wrap").length) {
            showProduct = false;
          }
        }

        if (filters.brands.length > 0) {
          const brandId = product.attr("data-brand");
          if (!filters.brands.some((brand) => brand.id === brandId)) {
            showProduct = false;
          }
        }

        product.toggle(showProduct);

        if (showProduct) {
          if (product.hasClass("grid")) {
            visibleProductCountGrid++;
          } else if (product.hasClass("style-list")) {
            visibleProductCountList++;
          }
        }
      });

      $("#product-count-grid").html(
        `<span class="count">${visibleProductCountGrid}</span> Products Found`,
      );
      $("#product-count-list").html(
        `<span class="count">${visibleProductCountList}</span> Products Found`,
      );
      updateLastVisibleItem();
      if (visibleProductCountGrid >= 12 || visibleProductCountList >= 12) {
        $(".wg-pagination,.tf-loading").show();
      } else {
        $(".wg-pagination,.tf-loading").hide();
      }
    }

    function updateLastVisibleItem() {
      setTimeout(() => {
        $(".card-product.style-list").removeClass("last");
        const lastVisible = $(".card-product.style-list:visible").last();
        if (lastVisible.length > 0) {
          lastVisible.addClass("last");
        }
      }, 50);
    }
  };

  /* Filter Sort
  -------------------------------------------------------------------------------------*/
  var filterSort = function () {
    let originalProductsList = $("#listLayout .card-product").clone();
    let originalProductsGrid = $("#gridLayout .card-product").clone();
    let paginationList = $("#listLayout .wg-pagination").clone();
    let paginationGrid = $("#gridLayout .wg-pagination").clone();
    const parseMoney = function (text) {
      return parseFloat(String(text || "").replace(/[^\d.]/g, "")) || 0;
    };

    $(".select-item").on("click", function () {
      if (
        this.tagName === "A" &&
        $(this).attr("href") &&
        $(this).attr("href") !== "#"
      ) {
        return;
      }
      const sortValue = $(this).data("sort-value");
      $(".select-item").removeClass("active");
      $(this).addClass("active");
      $(".text-sort-value").text($(this).find(".text-value-item").text());

      applyFilter(sortValue, isListLayoutActive());
    });

    function applyFilter(sortValue, listActive) {
      let products;

      if (listActive) {
        products = $("#listLayout .card-product");
      } else {
        products = $("#gridLayout .card-product");
      }

      if (sortValue === "best-selling") {
        if (listActive) {
          $("#listLayout").empty().append(originalProductsList.clone());
        } else {
          $("#gridLayout").empty().append(originalProductsGrid.clone());
        }
        bindProductEvents();
        displayPagination(products, listActive);
        return;
      }

      if (sortValue === "price-low-high") {
        products.sort(
          (a, b) =>
            parseMoney($(a).find(".current-price,.price").first().text()) -
            parseMoney($(b).find(".current-price,.price").first().text()),
        );
      } else if (sortValue === "price-high-low") {
        products.sort(
          (a, b) =>
            parseMoney($(b).find(".current-price,.price").first().text()) -
            parseMoney($(a).find(".current-price,.price").first().text()),
        );
      } else if (sortValue === "a-z") {
        products.sort((a, b) =>
          $(a).find(".title").text().localeCompare($(b).find(".title").text()),
        );
      } else if (sortValue === "z-a") {
        products.sort((a, b) =>
          $(b).find(".title").text().localeCompare($(a).find(".title").text()),
        );
      }

      if (listActive) {
        $("#listLayout").empty().append(products);
      } else {
        $("#gridLayout").empty().append(products);
      }
      bindProductEvents();
      displayPagination(products, listActive);
    }

    function displayPagination(products, listActive) {
      if (products.length >= 12) {
        if (listActive) {
          $("#listLayout").append(paginationList.clone());
        } else {
          $("#gridLayout").append(paginationGrid.clone());
        }
      }
    }

    function bindProductEvents() {
      if ($(".card-product").length > 0) {
        $(".color-swatch").on("click, mouseover", function () {
          var swatchColor = $(this).find("img").attr("src");
          var imgProduct = $(this)
            .closest(".card-product")
            .find(".img-product");
          imgProduct.attr("src", swatchColor);
          $(this)
            .closest(".card-product")
            .find(".color-swatch.active")
            .removeClass("active");
          $(this).addClass("active");
        });
      }
      $(".size-box").on("click", ".size-item", function () {
        $(this).closest(".size-box").find(".size-item").removeClass("active");
        $(this).addClass("active");
      });
    }
    bindProductEvents();
  };

  /* Switch Layout 
  -------------------------------------------------------------------------------------*/
  var swLayoutShop = function () {
    let isListActive = $(".sw-layout-list").hasClass("active");
    let userSelectedLayout = null;

    function hasValidLayout() {
      return (
        $("#gridLayout").hasClass("tf-col-2") ||
        $("#gridLayout").hasClass("tf-col-3") ||
        $("#gridLayout").hasClass("tf-col-4") ||
        $("#gridLayout").hasClass("tf-col-5") ||
        $("#gridLayout").hasClass("tf-col-6") ||
        $("#gridLayout").hasClass("tf-col-7")
      );
    }

    function updateLayoutDisplay() {
      const windowWidth = $(window).width();

      if (!hasValidLayout()) {
        applyGridColumnLayout("tf-col-4");
        return;
      }

      if (isListActive) {
        applyListLayout();
        return;
      }

      if (userSelectedLayout) {
        if (windowWidth <= 767) {
          applyGridColumnLayout("tf-col-2");
        } else if (windowWidth <= 1200 && userSelectedLayout !== "tf-col-2") {
          applyGridColumnLayout("tf-col-3");
        } else if (
          windowWidth <= 1400 &&
          (userSelectedLayout === "tf-col-5" ||
            userSelectedLayout === "tf-col-6" ||
            userSelectedLayout === "tf-col-7")
        ) {
          applyGridColumnLayout("tf-col-4");
        } else {
          applyGridColumnLayout(userSelectedLayout);
        }
        return;
      }

      if (windowWidth <= 767) {
        if (!$("#gridLayout").hasClass("tf-col-2")) {
          applyGridColumnLayout("tf-col-2");
        }
      } else if (windowWidth <= 1200) {
        if (!$("#gridLayout").hasClass("tf-col-3")) {
          applyGridColumnLayout("tf-col-3");
        }
      } else if (windowWidth <= 1400) {
        if (
          $("#gridLayout").hasClass("tf-col-5") ||
          $("#gridLayout").hasClass("tf-col-6") ||
          $("#gridLayout").hasClass("tf-col-7")
        ) {
          applyGridColumnLayout("tf-col-4");
        }
      } else {
        clearInlineLayoutDisplay();
        $(".wrapper-control-shop")
          .addClass("gridLayout-wrapper")
          .removeClass("listLayout-wrapper");
      }
    }

    $(document).ready(function () {
      if (isListActive) {
        applyListLayout();
      } else {
        clearInlineLayoutDisplay();
        $(".wrapper-control-shop")
          .addClass("gridLayout-wrapper")
          .removeClass("listLayout-wrapper");
        updateLayoutDisplay();
      }
    });

    $(window).on("resize", updateLayoutDisplay);

    $(".tf-view-layout-switch").on("click", function () {
      const layout = $(this).data("value-layout");

      if (layout === "list") {
        isListActive = true;
        userSelectedLayout = null;
        applyListLayout();
      } else {
        isListActive = false;
        userSelectedLayout = layout;
        applyGridColumnLayout(layout);
      }
    });
  };

  /* Handle Sidebar Filter 
  -------------------------------------------------------------------------------------*/
  var handleSidebarFilter = function () {
    $(".filterShop").click(function () {
      if ($(window).width() <= 1200) {
        $(".sidebar-filter,.overlay-filter").addClass("show");
      }
    });
    $(".close-filter ,.overlay-filter").click(function () {
      $(".sidebar-filter,.overlay-filter").removeClass("show");
    });
  };

  /* Handle Dropdown Filter 
  -------------------------------------------------------------------------------------*/
  var handleDropdownFilter = function () {
    if (".wrapper-filter-dropdown".length > 0) {
      $(".filterDropdown").click(function (event) {
        event.stopPropagation();
        $(".dropdown-filter").toggleClass("show");
        $(this).toggleClass("active");
        var icon = $(this).find(".icon");
        if ($(this).hasClass("active")) {
          icon.removeClass("icon-filter").addClass("icon-close");
        } else {
          icon.removeClass("icon-close").addClass("icon-filter");
        }
        if ($(window).width() <= 1200) {
          $(".overlay-filter").addClass("show");
        }
      });
      $(document).click(function (event) {
        if (!$(event.target).closest(".wrapper-filter-dropdown").length) {
          $(".dropdown-filter").removeClass("show");
          $(".filterDropdown").removeClass("active");
          $(".filterDropdown .icon")
            .removeClass("icon-close")
            .addClass("icon-filter");
        }
      });
      $(".close-filter ,.overlay-filter").click(function () {
        $(".dropdown-filter").removeClass("show");
        $(".filterDropdown").removeClass("active");
        $(".filterDropdown .icon")
          .removeClass("icon-close")
          .addClass("icon-filter");
        $(".overlay-filter").removeClass("show");
      });
    }
  };

  $(function () {
    rangeTwoPrice();
    filterProducts();
    filterSort();
    swLayoutShop();
    handleSidebarFilter();
    handleDropdownFilter();
  });
})(jQuery);
