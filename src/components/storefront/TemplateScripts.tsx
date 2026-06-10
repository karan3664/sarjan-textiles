"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

import { OrderedVendorScripts } from "@/components/shared/OrderedVendorScripts";

const coreScripts = ["jquery.min.js", "bootstrap.min.js", "main.js"];

const carouselScripts = ["swiper-bundle.min.js", "carousel.js"];

const lazyMediaScripts = ["lazysize.min.js"];

const shopScripts = ["nouislider.min.js", "shop.js"];

/** Pages that lazy-load images via lazysize. */
function usesLazyMedia(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/products" ||
    pathname.startsWith("/collections") ||
    pathname.startsWith("/blog")
  );
}

/** Pages with Swiper carousels (hero, product grids, promos). */
function usesSwiper(pathname: string) {
  if (usesLazyMedia(pathname)) return true;
  return pathname.startsWith("/products/");
}

const productDetailScripts = [
  "drift.min.js",
  "photoswipe-lightbox.umd.min.js",
  "photoswipe.umd.min.js",
  "zoom.js",
];

const templateVersion = "sarjan-20260509-2";

export function TemplateScripts() {
  const pathname = usePathname();
  const scripts = [
    ...coreScripts,
    ...(usesSwiper(pathname) ? carouselScripts : []),
    ...(usesLazyMedia(pathname) ? lazyMediaScripts : []),
    ...(pathname === "/products" ? shopScripts : []),
    ...(pathname.startsWith("/products/") ? productDetailScripts : []),
  ];

  return (
    <>
      <Script id="sarjan-template-dom-guard" strategy="afterInteractive">
        {`
          (function () {
            if (typeof Node === "undefined" || Node.prototype.__sarjanRemoveChildGuard) return;
            var originalRemoveChild = Node.prototype.removeChild;
            Node.prototype.removeChild = function (child) {
              if (child && child.parentNode !== this) return child;
              return originalRemoveChild.call(this, child);
            };
            Node.prototype.__sarjanRemoveChildGuard = true;
          })();
        `}
      </Script>
      <Script id="sarjan-tab-swiper-refresh" strategy="afterInteractive">
        {`
          document.addEventListener("shown.bs.tab", function () {
            setTimeout(function () {
              document.querySelectorAll(".swiper").forEach(function (node) {
                if (node.swiper && typeof node.swiper.update === "function") {
                  node.swiper.update();
                  if (node.swiper.pagination && typeof node.swiper.pagination.render === "function") node.swiper.pagination.render();
                  if (node.swiper.pagination && typeof node.swiper.pagination.update === "function") node.swiper.pagination.update();
                }
              });
            }, 80);
          });
        `}
      </Script>
      <Script id="sarjan-bootstrap-target-guard" strategy="afterInteractive">
        {`
          document.addEventListener("click", function (event) {
            var trigger = event.target && event.target.closest ? event.target.closest("[data-bs-toggle='modal'], [data-bs-toggle='offcanvas']") : null;
            if (!trigger) return;
            var selector = trigger.getAttribute("data-bs-target") || trigger.getAttribute("href") || "";
            if (!selector || selector.charAt(0) !== "#") return;
            if (document.querySelector(selector)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
          }, true);
        `}
      </Script>
      <Script id="sarjan-loader-fallback" strategy="afterInteractive">
        {`
          (function () {
            if (!window.WOW) {
              window.WOW = function () {
                return { init: function () {} };
              };
            }
            function hideLoader() {
              document.querySelectorAll(".preload").forEach(function (node) {
                node.style.opacity = "0";
                node.style.pointerEvents = "none";
                node.style.display = "none";
                setTimeout(function () {
                  if (node && node.parentNode) node.parentNode.removeChild(node);
                }, 250);
              });
              document.body.classList.remove("preload-wrapper");
            }
            if (document.readyState === "complete" || document.readyState === "interactive") {
              setTimeout(hideLoader, 250);
            } else {
              document.addEventListener("DOMContentLoaded", function () { setTimeout(hideLoader, 250); });
            }
            window.addEventListener("load", function () { setTimeout(hideLoader, 250); });
            setTimeout(hideLoader, 1800);
          })();
        `}
      </Script>
      <Script id="sarjan-hard-route-links" strategy="afterInteractive">
        {`
          document.addEventListener("click", function (event) {
            var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
            if (!anchor) return;
            if (event.target && event.target.closest && event.target.closest("button, input, textarea, select, label")) return;
            if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            if (anchor.target || anchor.hasAttribute("download")) return;
            if (anchor.getAttribute("data-bs-toggle") || anchor.closest("[data-bs-toggle]")) return;
            if (anchor.hasAttribute("data-sarjan-react")) return;
            var href = anchor.getAttribute("href") || "";
            if (!href || href.charAt(0) === "#" || href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;
            var url;
            try { url = new URL(href, window.location.href); } catch (_) { return; }
            if (url.origin !== window.location.origin) return;
            if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
            event.preventDefault();
            window.location.assign(url.pathname + url.search + url.hash);
          }, true);
        `}
      </Script>
      <Script id="sarjan-disable-legacy-delete" strategy="afterInteractive">
        {`
          (function () {
            function disableLegacyDeleteHandlers() {
              var jq = window.jQuery;
              if (!jq) return;
              jq(document).off("click", ".remove");
              jq(".remove").off("click");
              jq(".clear-file-delete").off("click");
            }
            disableLegacyDeleteHandlers();
            document.addEventListener("DOMContentLoaded", disableLegacyDeleteHandlers);
            window.addEventListener("load", disableLegacyDeleteHandlers);
            setTimeout(disableLegacyDeleteHandlers, 400);
            setTimeout(disableLegacyDeleteHandlers, 2000);
          })();
        `}
      </Script>
      <Script id="sarjan-product-detail-actions" strategy="afterInteractive">
        {`
          document.addEventListener("click", function (event) {
            var reviewBtn = event.target && event.target.closest ? event.target.closest(".btn-comment-review") : null;
            if (reviewBtn) {
              var wrap = reviewBtn.closest(".write-cancel-review-wrap");
              if (wrap) {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (reviewBtn.classList.contains("btn-write-review")) wrap.classList.add("write-review");
                if (reviewBtn.classList.contains("btn-cancel-review")) wrap.classList.remove("write-review");
              }
            }
            var copyBtn = event.target && event.target.closest ? event.target.closest("#share_social .button-submit button") : null;
            if (copyBtn) {
              var input = document.querySelector("#share_social .form-share input");
              if (input && navigator.clipboard) navigator.clipboard.writeText(input.value);
            }
          }, true);
        `}
      </Script>
      <OrderedVendorScripts
        scope="storefront"
        basePath="/template/storefront/js"
        files={scripts}
        version={templateVersion}
      />
    </>
  );
}
