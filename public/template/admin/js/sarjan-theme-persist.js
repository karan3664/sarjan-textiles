(function ($) {
  "use strict";

  var STORAGE_KEY = "sarjan-admin-theme-v1";

  function isSarjanAdminShell() {
    return $(".layout-wrap.sarjan-admin-shell").length > 0;
  }

  function enforceSarjanChrome() {
    if (!isSarjanAdminShell()) return;
    var $wrap = $(".layout-wrap");
    $wrap.removeClass(
      "layout-width-boxed menu-position-scrollable header-position-scrollable",
    );
    $(".layout-width").find(".full").prop("checked", true);
    $(".menu-position").find(".menu-fixed").prop("checked", true);
    $(".header-position").find(".header-fixed").prop("checked", true);
  }

  function sanitizeLayoutState(state) {
    if (!state || !isSarjanAdminShell()) return state;
    return {
      menuStyleIcon: !!state.menuStyleIcon,
      menuStyleIconDefault: !!state.menuStyleIconDefault,
      layoutWidthBoxed: false,
      menuPositionScrollable: false,
      headerPositionScrollable: false,
      loaderOff: state.loaderOff !== false,
      menuBackground: state.menuBackground || "",
      colorsHeader: state.colorsHeader || "",
      themePrimary: state.themePrimary || "",
      themeBackground: state.themeBackground || "",
    };
  }

  function disableUnsupportedThemeControls() {
    if (!isSarjanAdminShell()) return;
    var $blocked = $(
      ".form-theme-style fieldset.layout-width, .form-theme-style fieldset.menu-position, .form-theme-style fieldset.header-position",
    );
    $blocked
      .addClass("sarjan-theme-option-disabled")
      .attr("aria-disabled", "true");
    $blocked.find("input").prop("disabled", true);
    if (!$(".sarjan-theme-layout-note").length) {
      $(".form-theme-style fieldset.layout-width").before(
        '<p class="sarjan-theme-layout-note text-caption-1 text-secondary mb-12">Layout width / menu / header position are locked in Sarjan admin so the top bar stays visible.</p>',
      );
    }
  }

  function readState() {
    var $wrap = $(".layout-wrap");
    var $body = $("body");
    return {
      menuStyleIcon: $wrap.hasClass("menu-style-icon"),
      menuStyleIconDefault: $wrap.hasClass("menu-style-icon-default"),
      layoutWidthBoxed: $wrap.hasClass("layout-width-boxed"),
      menuPositionScrollable: $wrap.hasClass("menu-position-scrollable"),
      headerPositionScrollable: $wrap.hasClass("header-position-scrollable"),
      loaderOff: $wrap.hasClass("loader-off"),
      menuBackground: $wrap.attr("data-menu-background") || "",
      colorsHeader: $wrap.attr("data-colors-header") || "",
      themePrimary: $wrap.attr("data-theme-primary") || "",
      themeBackground: $body.attr("data-theme-background") || "",
    };
  }

  function darkThemeBackgrounds() {
    return [
      "theme-background-252E3A",
      "theme-background-1E1D2A",
      "theme-background-1B2627",
    ];
  }

  function syncHeaderWithBackground(state) {
    if (
      !state.colorsHeader &&
      darkThemeBackgrounds().indexOf(state.themeBackground) !== -1
    ) {
      $(".layout-wrap").attr("data-colors-header", "colors-header-1E293B");
      state.colorsHeader = "colors-header-1E293B";
    }
  }

  function syncLogo() {
    var $logo = $("#logo_header");
    if (!$logo.length) return;
    var tflight = $logo.data("light");
    var tfdark = $logo.data("dark");
    var menuBg = $(".layout-wrap").attr("data-menu-background") || "";
    if (menuBg === "colors-menu-fff") {
      $logo.attr({ src: tfdark });
      return;
    }
    if (
      menuBg === "colors-menu-1E293B" ||
      menuBg === "colors-menu-181818" ||
      menuBg === "colors-menu-3A3043"
    ) {
      $logo.attr({ src: tflight });
      return;
    }
    $logo.attr({ src: tflight });
  }

  function syncStyleRadios(state) {
    $(".menu-style")
      .find(".menu-click")
      .prop("checked", !state.menuStyleIcon && !state.menuStyleIconDefault);
    $(".menu-style").find(".icon-hover").prop("checked", state.menuStyleIcon);
    $(".menu-style")
      .find(".icon-default")
      .prop("checked", state.menuStyleIconDefault);
    $(".layout-width").find(".boxed").prop("checked", state.layoutWidthBoxed);
    $(".layout-width").find(".full").prop("checked", !state.layoutWidthBoxed);
    $(".menu-position")
      .find(".menu-fixed")
      .prop("checked", !state.menuPositionScrollable);
    $(".menu-position")
      .find(".menu-scrollable")
      .prop("checked", state.menuPositionScrollable);
    $(".header-position")
      .find(".header-fixed")
      .prop("checked", !state.headerPositionScrollable);
    $(".header-position")
      .find(".header-scrollable")
      .prop("checked", state.headerPositionScrollable);
    $(".style-loader")
      .find(".style-loader-on")
      .prop("checked", !state.loaderOff);
    $(".style-loader")
      .find(".style-loader-off")
      .prop("checked", state.loaderOff);
  }

  function syncColorSwatches(state) {
    function activate(groupSelector, value, fallbackClass) {
      var $group = $(groupSelector);
      if (!$group.length) return;
      $group.find(".item").removeClass("active");
      if (!value) {
        $group.find(".default").addClass("active");
        return;
      }
      var token = value.split("-").pop();
      var $match = $group.find(".color-" + token);
      if ($match.length) {
        $match.addClass("active");
      } else {
        $group.find(".default").addClass("active");
      }
    }

    activate(".colors-menu", state.menuBackground, "color-181818");
    activate(".colors-header", state.colorsHeader, "color-fff");
    activate(".colors-theme-primary", state.themePrimary, "color-E43131");
    activate(".colors-theme-background", state.themeBackground, "color-F7F7F7");
  }

  function applyState(state) {
    if (!state) return;
    state = sanitizeLayoutState(state);
    var $wrap = $(".layout-wrap");
    var $body = $("body");

    $wrap.toggleClass("menu-style-icon", !!state.menuStyleIcon);
    $wrap.toggleClass("menu-style-icon-default", !!state.menuStyleIconDefault);
    $wrap.toggleClass("layout-width-boxed", false);
    $wrap.toggleClass("menu-position-scrollable", false);
    $wrap.toggleClass("header-position-scrollable", false);
    $wrap.toggleClass("loader-off", !!state.loaderOff);

    if (state.menuBackground) {
      $wrap.attr("data-menu-background", state.menuBackground);
    } else {
      $wrap.removeAttr("data-menu-background");
    }

    syncHeaderWithBackground(state);

    if (state.colorsHeader) {
      $wrap.attr("data-colors-header", state.colorsHeader);
    } else {
      $wrap.removeAttr("data-colors-header");
    }

    if (state.themePrimary) {
      $wrap.attr("data-theme-primary", state.themePrimary);
    } else {
      $wrap.removeAttr("data-theme-primary");
    }

    if (state.themeBackground) {
      $body.attr("data-theme-background", state.themeBackground);
    } else {
      $body.removeAttr("data-theme-background");
    }

    syncLogo();
    syncStyleRadios(sanitizeLayoutState(state));
    syncColorSwatches(state);
    enforceSarjanChrome();
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(sanitizeLayoutState(readState())),
      );
    } catch (e) {
      /* ignore quota / private mode */
    }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function showSavedHint(message) {
    var $hint = $(".sarjan-admin-theme-save-hint");
    if (!$hint.length) {
      $("#offcanvasRight .offcanvas-body").prepend(
        '<p class="sarjan-admin-theme-save-hint text-caption-1 mb-12" role="status" aria-live="polite"></p>',
      );
      $hint = $(".sarjan-admin-theme-save-hint");
    }
    $hint.text(message || "Preferences saved").css({ color: "#2d8f5f" });
    window.clearTimeout(showSavedHint._timer);
    showSavedHint._timer = window.setTimeout(function () {
      $hint.text("");
    }, 2400);
  }

  function injectSaveButtons() {
    if ($(".sarjan-admin-theme-save").length) return;

    var $save = $(
      '<button type="button" class="tf-button style-2 label-01 w-100 sarjan-admin-theme-save mb-10">Save preferences</button>',
    );

    $(".form-theme-style .button-clear-select").before($save.clone());
    $(".form-theme-color .button-clear-select").before($save);
  }

  function bindPersistence() {
    injectSaveButtons();

    $(document).on("click", ".sarjan-admin-theme-save", function () {
      enforceSarjanChrome();
      saveState();
      showSavedHint("Preferences saved");
      var offcanvas = document.getElementById("offcanvasRight");
      if (offcanvas && window.bootstrap && window.bootstrap.Offcanvas) {
        var instance = window.bootstrap.Offcanvas.getInstance(offcanvas);
        if (instance) instance.hide();
      }
    });

    $(document).on(
      "change",
      ".form-theme-style input[type='radio']",
      function () {
        window.setTimeout(function () {
          enforceSarjanChrome();
          saveState();
        }, 0);
      },
    );

    $(document).on(
      "click",
      ".form-theme-color .select-colors-theme .item",
      function () {
        window.setTimeout(function () {
          var state = readState();
          syncHeaderWithBackground(state);
          if (state.colorsHeader) {
            $(".layout-wrap").attr("data-colors-header", state.colorsHeader);
          }
          saveState();
        }, 0);
      },
    );

    $(document).on(
      "click",
      ".form-theme-style .button-clear-select",
      function () {
        window.setTimeout(function () {
          clearState();
          $("body").removeAttr("data-theme-background");
          $(".layout-wrap").removeAttr("data-colors-header");
          enforceSarjanChrome();
          saveState();
        }, 0);
      },
    );

    $(document).on(
      "click",
      ".form-theme-color .button-clear-select",
      function () {
        window.setTimeout(function () {
          clearState();
          saveState();
        }, 0);
      },
    );
  }

  $(function () {
    enforceSarjanChrome();
    var saved = loadState();
    if (saved) {
      applyState(saved);
    }
    bindPersistence();
    disableUnsupportedThemeControls();
    enforceSarjanChrome();
  });
})(jQuery);
