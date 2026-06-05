import Link from "next/link";
import { products } from "@/data/mock";
import { getCatalogProducts } from "@/lib/catalog";
import { localeFromHeaders } from "@/lib/server-locale";
import { FULL_SIZE_RUN } from "@/lib/cart-client";
import { FeedbackForm } from "./FeedbackForm";
import { ModaveProductCard } from "./ModaveProductCard";
import { PageTitle } from "./PageTitle";
import { PaymentConfirmationClient } from "./PaymentConfirmationClient";
import { paginationRangeLabel } from "@/lib/pagination-utils";
import { StorefrontPagination } from "./StorefrontPagination";
import { FaqAccordion } from "./FaqAccordion";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";
import {
  faqItemsForLocale,
  translateStorefrontNav,
  translateStorefrontUi,
} from "@/lib/storefront-ui";

export function DynamicInfoPage({
  title,
  subtitle,
  image = "/sarjan-assets/banner-textiles-studio.webp",
  items,
  cta,
}: {
  title: string;
  subtitle: string;
  image?: string;
  items: Array<{ title: string; body: string }>;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="sarjan-policy-page">
      <PageTitle title={title} crumbs={["Homepage", title]} />
      <section className="flat-spacing sarjan-policy-content">
        <div className="container">
          <div className="row g-4 g-lg-5 align-items-start">
            <div className="col-lg-5">
              <div className="sarjan-policy-media">
                <img src={image} alt={title} loading="lazy" decoding="async" />
              </div>
            </div>
            <div className="col-lg-7">
              <div className="sarjan-policy-copy">
                <div className="sarjan-policy-lead">
                  <h2 className="sarjan-policy-heading">{title}</h2>
                  <p className="sarjan-policy-subtitle">{subtitle}</p>
                </div>
                <ul className="sarjan-policy-list">
                  {items.map((item) => (
                    <li className="sarjan-policy-item" key={item.title}>
                      <span
                        className="sarjan-policy-item-icon"
                        aria-hidden="true"
                      >
                        <i className="icon icon-sealCheck" />
                      </span>
                      <div className="sarjan-policy-item-body">
                        <h3>{item.title}</h3>
                        <p>{item.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                {cta ? (
                  <Link
                    href={cta.href}
                    className={withBtnIcon(
                      "tf-btn btn-fill radius-4 sarjan-policy-cta",
                    )}
                  >
                    <TfButtonIcon
                      icon="icon-arrRight"
                      textClassName="text text-button"
                    >
                      {cta.label}
                    </TfButtonIcon>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export async function SearchResultPage({
  q = "",
  page = 1,
}: {
  q?: string;
  page?: number;
}) {
  const locale = await localeFromHeaders();
  const data = await getCatalogProducts({ q, page, limit: 24, locale });

  return (
    <>
      <PageTitle title="Search Result" crumbs={["Homepage", "Search Result"]} />
      <section className="flat-spacing sarjan-search-page">
        <div className="container">
          <form className="form-search-result" action="/search-result">
            <fieldset>
              <input
                name="q"
                defaultValue={q}
                placeholder="Search SKU, fabric, category"
              />
            </fieldset>
            <button
              type="submit"
              className={withBtnIcon("tf-btn btn-fill radius-4")}
            >
              <TfButtonIcon icon="icon-search2">Search</TfButtonIcon>
            </button>
          </form>
          <div className="heading-section text-center mt_32">
            <h4>{q ? `${data.total} result for "${q}"` : "All products"}</h4>
            <p className="text-secondary">Admin-managed Sarjan catalog.</p>
          </div>
          <div className="tf-grid-layout tf-col-2 lg-col-4 mt_32">
            {data.items.map((product, index) => (
              <ModaveProductCard
                product={product}
                delay={`${index * 0.03}s`}
                key={product.slug}
              />
            ))}
          </div>
          <StorefrontPagination
            basePath="/search-result"
            page={data.page}
            totalPages={data.totalPages}
            query={{ q: q || undefined }}
            summary={paginationRangeLabel(data.page, 24, data.total, "results")}
          />
        </div>
      </section>
    </>
  );
}

export function PaymentConfirmationPage({ orderId }: { orderId?: string }) {
  return (
    <>
      <PageTitle
        title="Payment Confirmation"
        crumbs={["Homepage", "Payment Confirmation"]}
      />
      <PaymentConfirmationClient orderId={orderId} />
    </>
  );
}

export function PaymentFailurePage() {
  return (
    <>
      <PageTitle
        title="Payment Failure"
        crumbs={["Homepage", "Payment Failure"]}
      />
      <section className="flat-spacing">
        <div className="container">
          <div className="payment-confirm-wrap text-center">
            <div className="box-icon w_80 round bg-danger mx-auto">
              <i className="icon icon-close text-white" />
            </div>
            <h3 className="mt_24">Order request failed</h3>
            <p className="text-secondary mt_8">
              Please retry checkout or contact Sarjan Textiles order team.
            </p>
            <Link
              href="/checkout"
              className={withBtnIcon("tf-btn btn-fill radius-4 mt_32")}
            >
              <TfButtonIcon icon="icon-arrLeft">Return Checkout</TfButtonIcon>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export function TermsPage() {
  const terms = [
    [
      "B2B Account Approval",
      "Only approved wholesale clients can place orders. Admin can approve, reject, or request more details.",
    ],
    [
      "MOQ & Set Buying",
      `Products are ordered in full size sets. Standard set: ${FULL_SIZE_RUN.join(" / ")}.`,
    ],
    [
      "Order Approval",
      "Every order remains pending until Sarjan admin confirms stock, MOQ, dispatch terms, and final quantity.",
    ],
    [
      "Payment",
      "Payment terms are confirmed by Sarjan accounts team after order approval.",
    ],
    [
      "Dispatch",
      "Dispatch stages are Pending, Approved, In Production, Packed, Ready for Dispatch, Dispatched, Delivered.",
    ],
  ];

  return (
    <div className="sarjan-policy-page">
      <PageTitle title="Terms Of Use" crumbs={["Homepage", "Terms Of Use"]} />
      <section className="flat-spacing sarjan-terms-page">
        <div className="container">
          <p className="sarjan-terms-intro">
            Wholesale ordering rules for approved Sarjan Textiles B2B accounts.
            Contact us if you need clarification before placing an order.
          </p>
          <div className="sarjan-terms-grid">
            {terms.map(([title, text]) => (
              <article className="sarjan-terms-card" key={title}>
                <h5>{title}</h5>
                <p className="text-secondary">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export async function FaqPage() {
  const locale = await localeFromHeaders();
  const items = faqItemsForLocale(locale);
  const faqTitle = translateStorefrontNav("FAQs", locale);
  const homeLabel = translateStorefrontUi("home", locale);

  return (
    <div className="sarjan-faqs-page sarjan-policy-page">
      <PageTitle title={faqTitle} crumbs={[homeLabel, faqTitle]} />
      <section className="flat-spacing sarjan-faqs-content">
        <div className="container">
          <FaqAccordion items={items} />
          <div className="sarjan-faq-support">
            <p className="text-secondary">
              {locale === "hi"
                ? "और मदद चाहिए? WhatsApp, फोन या ईमेल से संपर्क करें।"
                : locale === "gu"
                  ? "વધુ મદદ જોઈએ? WhatsApp, ફોન અથવા ઈમેલથી સંપર્ક કરો."
                  : "Need more help? Reach us on WhatsApp, phone, or email."}
            </p>
            <Link
              href="/contact"
              className={withBtnIcon("tf-btn btn-fill radius-4 sarjan-faq-cta")}
            >
              <TfButtonIcon icon="icon-phone" textClassName="text text-button">
                {translateStorefrontNav("Contact", locale)}
              </TfButtonIcon>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Public order / product feedback (no login). Testimonials: /my-account-testimonials only. */
export function OrderFeedbackPage() {
  return (
    <>
      <PageTitle
        title="Order Feedback"
        crumbs={["Homepage", "Order Feedback"]}
      />
      <section className="flat-spacing sarjan-order-feedback-page">
        <div className="container">
          <div className="heading-section text-center mb_32">
            <h4>Order or product feedback</h4>
            <p className="text-secondary">
              Questions about an order, dispatch, quality, or catalog? Send a
              message and our team will reply by email.
            </p>
            <p className="text-caption-1 text-secondary mt_12">
              To share a homepage testimonial,{" "}
              <Link href="/login" className="link">
                sign in
              </Link>{" "}
              and open{" "}
              <Link href="/my-account-testimonials" className="link">
                My Account → Share Testimonial
              </Link>
              .
            </p>
          </div>
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <FeedbackForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function ProductSoldOutPage() {
  const product = products[0];

  return (
    <>
      <PageTitle
        title="Product Sold Out"
        crumbs={["Homepage", "Product Sold Out"]}
      />
      <section className="flat-spacing">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6 position-relative">
              <div className="sarjan-oos-ribbon" role="status">
                Out of stock
              </div>
              <img
                className="radius-16 w-100"
                src={product.images[0]}
                alt={product.name}
              />
            </div>
            <div className="col-md-6">
              <div className="product-info-wrap">
                <div className="badge bg-danger text-white mb_16">Sold Out</div>
                <h3>{product.name}</h3>
                <p className="text-secondary mt_8">
                  This product is currently out of stock. Admin can enable
                  preorder or suggest similar prints.
                </p>
                <p className="mt_16">Set: {FULL_SIZE_RUN.join(" / ")}</p>
                <Link
                  href="/products"
                  className={withBtnIcon("tf-btn btn-fill radius-4 mt_24")}
                >
                  <TfButtonIcon icon="icon-arrRight">
                    Browse Available Products
                  </TfButtonIcon>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function NotFoundPage() {
  return (
    <>
      <PageTitle title="404" crumbs={["Homepage", "404"]} />
      <section className="flat-spacing">
        <div className="container text-center">
          <h1 className="display-2">404</h1>
          <h4 className="mt_16">Page not found</h4>
          <p className="text-secondary mt_8">Requested page does not exist.</p>
          <Link
            href="/"
            className={withBtnIcon("tf-btn btn-fill radius-4 mt_32")}
          >
            <TfButtonIcon icon="icon-arrLeft">Back Home</TfButtonIcon>
          </Link>
        </div>
      </section>
    </>
  );
}
