"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { celebrateOrderPlaced } from "@/lib/order-celebration";
import {
  B2B_ORDER_SUCCESS_BODY,
  B2B_ORDER_SUCCESS_TITLE,
} from "@/lib/b2b-order-messages";
import { GstVerificationFields } from "./GstVerificationFields";
import {
  bumpClientAvatarCache,
  clientAvatarSrc,
  hasCustomClientAvatar,
} from "@/lib/client-avatar-display";
import { resolveDispatchAddress } from "@/lib/dispatch-address";
import { findStateForCity } from "@/lib/india-locations";
import { IndiaStateCitySelect } from "@/components/shared/IndiaStateCitySelect";
import { checkClientFieldsUnique } from "@/lib/check-client-unique";
import {
  clientAuthHeaders,
  clientAuthJsonHeaders,
  hasLocalClientSession,
  logoutClientSession,
  restoreClientSessionFromCookie,
} from "@/lib/client-auth-browser";
import { readStoredClient } from "@/lib/client-session";
import {
  AccountSessionProvider,
  persistAccountClient,
  useAccountSession,
  type AccountClient,
  type AccountOrder,
} from "./AccountSessionContext";
import {
  isGstVerifiedOnFile,
  isValidGstin,
  normalizeGstin,
} from "@/lib/gstin-form";
import { siteSettings } from "@/data/site";
import { PageTitle } from "./PageTitle";
import { TestimonialSubmitForm } from "./TestimonialSubmitForm";
import { OrderPlacedViaBadge } from "./OrderPlacedViaBadge";
import { TfButtonIcon, withBtnIcon } from "./TfButtonIcon";
import {
  fetchAccountNavigation,
  filterAccountNavItems,
  type PublicAccountNavItem,
} from "@/lib/account-nav-client";
import { effectiveStorefrontLocale } from "@/lib/locale-launch";
import { SARJAN_LANG_COOKIE } from "@/lib/locale-cookie";
import { enrichOrderPricing, formatInrPricingLine } from "@/lib/gst-display";
import {
  MIN_CLIENT_PASSWORD_LENGTH,
  minClientPasswordMessage,
} from "@/lib/password-policy";
import { buildPricingDisplayLines } from "@/lib/order-pricing-breakdown";
import { isOrderInvoiceAvailable } from "@/lib/invoice-order-access";
import { AccountAddressManager } from "@/components/storefront/AccountAddressManager";
import { OrderLineReviewCta } from "@/components/storefront/OrderLineReviewCta";
import { ReviewRequestBanner } from "@/components/storefront/ReviewRequestBanner";

type Client = AccountClient;

type Order = AccountOrder;

const fallbackSidebarNav: Array<{
  href: string;
  label: string;
  shortLabel?: string;
  icon: string;
}> = [
  { href: "/my-account", label: "Dashboard", icon: "icon-user" },
  { href: "/my-account-orders", label: "Orders", icon: "icon-ShoppingBagOpen" },
  { href: "/my-account-address", label: "Address", icon: "icon-map-pin" },
  {
    href: "/my-account-testimonials",
    label: "Share Testimonial",
    shortLabel: "Reviews",
    icon: "icon-star",
  },
  {
    href: "/order-tracking",
    label: "Order Tracking",
    shortLabel: "Tracking",
    icon: "icon-shipping",
  },
];

function readAccountLocale(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SARJAN_LANG_COOKIE}=`));
  return effectiveStorefrontLocale(match?.split("=")[1]?.trim() || "en");
}

function sidebarNavFromApi(items: PublicAccountNavItem[]) {
  const filtered = filterAccountNavItems(items, { isAuthenticated: true });
  if (!filtered.length) return fallbackSidebarNav;
  return filtered.map((item) => ({
    href: item.href,
    label: item.label,
    shortLabel: item.label.split(" ")[0],
    icon: item.icon ?? "icon-arrRight",
  }));
}

const logoutNavItem = {
  label: "Logout",
  icon: "icon-arrLeft",
} as const;

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function AccountFrame({
  active,
  title,
  children,
  sectionClass = "",
}: {
  active: string;
  title: string;
  children: React.ReactNode;
  sectionClass?: string;
}) {
  return (
    <AccountSessionProvider>
      <AccountFrameInner
        active={active}
        title={title}
        sectionClass={sectionClass}
      >
        {children}
      </AccountFrameInner>
    </AccountSessionProvider>
  );
}

function AccountFrameInner({
  active,
  title,
  children,
  sectionClass = "",
}: {
  active: string;
  title: string;
  children: React.ReactNode;
  sectionClass?: string;
}) {
  const { client, loading } = useAccountSession();
  const [sidebarNav, setSidebarNav] = useState(fallbackSidebarNav);

  useEffect(() => {
    void fetchAccountNavigation(readAccountLocale()).then((data) => {
      setSidebarNav(sidebarNavFromApi(data.sidebar));
    });
  }, []);

  return (
    <>
      <PageTitle title={title} crumbs={["Homepage", title]} />
      <section
        className={`flat-spacing sarjan-account-page${sectionClass ? ` ${sectionClass}` : ""}`}
      >
        <div className="container">
          <div className="my-account-wrap">
            <div className="wrap-sidebar-account">
              <div className="sidebar-account sarjan-account-sidebar-card">
                <div className="account-avatar">
                  <div className="image">
                    <img
                      src={clientAvatarSrc(client?.avatarUrl, client?.id)}
                      alt=""
                    />
                  </div>
                  <h6 className="mb_4">
                    {loading ? "Loading…" : (client?.companyName ?? "Account")}
                  </h6>
                  <div className="body-text-1 text-secondary">
                    {loading
                      ? "Please wait"
                      : (client?.email ?? "Sign in required")}
                  </div>
                </div>
                <ul className="my-account-nav">
                  {sidebarNav.map((item) => (
                    <li key={item.href}>
                      {item.href === active ? (
                        <span className="my-account-nav-item sarjan-account-nav-item active">
                          <i className={`icon ${item.icon}`} aria-hidden />
                          <span className="sarjan-account-nav-label">
                            {item.label}
                          </span>
                        </span>
                      ) : (
                        <a
                          href={item.href}
                          className="my-account-nav-item sarjan-account-nav-item"
                        >
                          <i className={`icon ${item.icon}`} aria-hidden />
                          <span className="sarjan-account-nav-label">
                            {item.label}
                          </span>
                        </a>
                      )}
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      className="my-account-nav-item sarjan-account-nav-item sarjan-account-nav-logout w-100 border-0 bg-transparent text-start"
                      onClick={() => logoutClientSession()}
                    >
                      <i className={`icon ${logoutNavItem.icon}`} aria-hidden />
                      <span className="sarjan-account-nav-label">
                        {logoutNavItem.label}
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
            <div className="my-account-content">
              <nav
                className="sarjan-account-mobile-nav"
                aria-label="Account sections"
              >
                {sidebarNav.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`sarjan-account-mobile-nav__item${item.href === active ? " is-active" : ""}`}
                  >
                    <i className={`icon ${item.icon}`} aria-hidden />
                    <span>{item.shortLabel ?? item.label}</span>
                  </a>
                ))}
                <button
                  type="button"
                  className="sarjan-account-mobile-nav__item sarjan-account-mobile-nav__item--logout"
                  onClick={() => logoutClientSession()}
                >
                  <i className={`icon ${logoutNavItem.icon}`} aria-hidden />
                  <span>{logoutNavItem.label}</span>
                </button>
              </nav>
              {children}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function AccountDashboardPage() {
  return (
    <AccountFrame active="/my-account" title="My Account">
      <AccountDashboardContent />
    </AccountFrame>
  );
}

function AccountDashboardContent() {
  const { client, orders, loading, setClient } = useAccountSession();
  const [form, setForm] = useState({
    companyName: "",
    email: "",
    phone: "",
    gst: "",
    ownerLegalName: "",
    city: "",
    state: "",
  });
  const [savedGst, setSavedGst] = useState("");
  const [gstVerified, setGstVerified] = useState(false);
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarPreviewKey, setAvatarPreviewKey] = useState(0);
  useEffect(() => {
    if (!client) return;
    const gst = client.gst ?? client.address?.gst ?? "";
    const normalizedGst = normalizeGstin(gst);
    setSavedGst(normalizedGst);
    setGstVerified(
      isGstVerifiedOnFile({
        gst: normalizedGst,
        companyName: client.companyName,
        ownerLegalName: client.address?.ownerLegalName,
      }),
    );
    setForm({
      companyName: client.companyName ?? "",
      email: client.email ?? "",
      phone: client.phone ?? client.address?.phone ?? "",
      gst,
      ownerLegalName: client.address?.ownerLegalName ?? "",
      city: client.city ?? client.address?.city ?? "",
      state:
        client.address?.state ??
        findStateForCity(client.city ?? client.address?.city ?? ""),
    });
  }, [client]);

  const onGstVerifiedChange = useCallback((verified: boolean) => {
    setGstVerified(verified);
  }, []);

  const updateForm = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const updatePassword = (key: keyof typeof password, value: string) =>
    setPassword((current) => ({ ...current, [key]: value }));

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client?.id) {
      setMessage("Login required.");
      return;
    }

    const nextGst = normalizeGstin(form.gst);
    const gstChanged = nextGst !== savedGst;

    if (!nextGst || !isValidGstin(nextGst)) {
      setMessage("GST number is required (valid 15-character GSTIN).");
      return;
    }
    if (gstChanged && !gstVerified) {
      setMessage(
        "Verify GST with the portal after changing or adding a GST number.",
      );
      return;
    }
    if (!form.companyName.trim()) {
      setMessage("Trade / business name is required.");
      return;
    }
    if (!form.ownerLegalName.trim()) {
      setMessage("Legal / proprietor full name is required.");
      return;
    }
    if (!form.state.trim() || !form.city.trim()) {
      setMessage("Select state and city.");
      return;
    }

    const phone = form.phone.trim();
    const unique = await checkClientFieldsUnique(
      { phone, gst: nextGst, excludeClientId: client.id },
      { authHeaders: clientAuthJsonHeaders() },
    );
    if (!unique.ok) {
      setMessage(unique.error);
      return;
    }

    const res = await fetch(`/api/clients/${encodeURIComponent(client.id)}`, {
      method: "PATCH",
      headers: clientAuthJsonHeaders(),
      body: JSON.stringify({
        companyName: form.companyName.trim(),
        phone: form.phone.trim(),
        gst: nextGst,
        city: form.city.trim(),
        address: {
          ...(client.address ?? {}),
          phone: form.phone.trim(),
          gst: nextGst,
          city: form.city.trim(),
          state: form.state.trim(),
          ownerLegalName: form.ownerLegalName.trim(),
        },
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setClient(persistAccountClient(data.client));
      const refreshedGst = normalizeGstin(
        data.client.gst ?? data.client.address?.gst ?? "",
      );
      setSavedGst(refreshedGst);
      setGstVerified(
        isGstVerifiedOnFile({
          gst: refreshedGst,
          companyName: data.client.companyName,
          ownerLegalName: data.client.address?.ownerLegalName,
        }),
      );
      setMessage("Account updated.");
    } else {
      setMessage(data.error ?? "Account update failed.");
    }
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordMessage("");
  };

  const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client?.id) {
      setPasswordMessage("Login required.");
      return;
    }
    if (!password.currentPassword || !password.newPassword) {
      setPasswordMessage("Current and new password required.");
      return;
    }
    if (password.newPassword !== password.confirmPassword) {
      setPasswordMessage("New password and confirm password do not match.");
      return;
    }
    if (password.newPassword.length < MIN_CLIENT_PASSWORD_LENGTH) {
      setPasswordMessage(minClientPasswordMessage("New password"));
      return;
    }

    const passwordRes = await fetch(
      `/api/clients/${encodeURIComponent(client.id)}`,
      {
        method: "PATCH",
        headers: clientAuthJsonHeaders(),
        body: JSON.stringify({
          currentPassword: password.currentPassword,
          newPassword: password.newPassword,
        }),
      },
    );
    const passwordData = await passwordRes.json();
    if (!passwordRes.ok) {
      setPasswordMessage(passwordData.error ?? "Password update failed.");
      return;
    }
    setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordMessage("Password updated.");
    setTimeout(() => {
      closePasswordModal();
    }, 700);
  };

  const applyAvatarClient = useCallback(
    (next: Client, message: string) => {
      const stored = persistAccountClient(next);
      bumpClientAvatarCache();
      setClient(stored);
      setAvatarPreviewKey((key) => key + 1);
      setAvatarMessage(message);
      window.setTimeout(() => setAvatarMessage(""), 5000);
    },
    [setClient],
  );

  const uploadAvatar = async (file: File) => {
    if (!client?.id) return;
    if (!hasLocalClientSession()) {
      setAvatarMessage("Login required.");
      return;
    }
    setAvatarUploading(true);
    setAvatarMessage("");
    const formData = new FormData();
    formData.set("file", file);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(client.id)}/avatar`,
        {
          method: "POST",
          headers: clientAuthHeaders(),
          body: formData,
        },
      );
      const data = (await res.json()) as { client?: Client; error?: string };
      if (!res.ok) {
        setAvatarMessage(data.error ?? "Upload failed.");
        return;
      }
      if (data.client) {
        applyAvatarClient(data.client, "Photo updated.");
      }
    } catch {
      setAvatarMessage("Upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!client?.id) return;
    if (!hasCustomClientAvatar(client.avatarUrl)) return;
    if (!hasLocalClientSession()) {
      setAvatarMessage("Login required.");
      return;
    }
    setAvatarRemoving(true);
    setAvatarMessage("");
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(client.id)}/avatar`,
        {
          method: "DELETE",
          headers: clientAuthHeaders(),
        },
      );
      const data = (await res.json()) as { client?: Client; error?: string };
      if (!res.ok) {
        setAvatarMessage(data.error ?? "Could not remove photo.");
        return;
      }
      if (data.client) {
        bumpClientAvatarCache();
        const stored = persistAccountClient(data.client);
        setClient(stored);
        setAvatarPreviewKey((key) => key + 1);
        setAvatarMessage("Profile photo removed.");
        window.setTimeout(() => setAvatarMessage(""), 5000);
      }
    } catch {
      setAvatarMessage("Could not remove photo.");
    } finally {
      setAvatarRemoving(false);
    }
  };

  const pendingOrderCount = useMemo(
    () =>
      orders.filter((order) => order.status.toLowerCase().includes("pending"))
        .length,
    [orders],
  );
  const accountStatusLabel =
    client?.status === "approved"
      ? "Wholesale account active"
      : client?.status === "pending"
        ? "Pending approval"
        : client?.status === "rejected"
          ? "Application not approved"
          : "Account";

  return (
    <div className="account-details sarjan-account-dashboard">
      {loading ? (
        <p className="sarjan-account-dashboard__loading">Loading account…</p>
      ) : client ? (
        <>
          <header className="sarjan-account-dashboard__header">
            <div>
              <p className="sarjan-account-dashboard__eyebrow">B2B wholesale</p>
              <h2 className="sarjan-account-dashboard__title">
                Welcome back{form.companyName ? `, ${form.companyName}` : ""}
              </h2>
              <p className="sarjan-account-dashboard__subtitle text-secondary">
                Manage your business profile, orders, and dispatch details in
                one place.
              </p>
            </div>
            <span
              className={`sarjan-account-status-pill sarjan-account-status-pill--${client.status ?? "pending"}`}
            >
              {accountStatusLabel}
            </span>
          </header>

          <div className="sarjan-account-stat-grid mb_24">
            <div className="sarjan-account-stat-card">
              <span className="sarjan-account-stat-card__label">
                Total orders
              </span>
              <strong className="sarjan-account-stat-card__value">
                {orders.length}
              </strong>
            </div>
            <div className="sarjan-account-stat-card">
              <span className="sarjan-account-stat-card__label">
                Pending approval
              </span>
              <strong className="sarjan-account-stat-card__value">
                {pendingOrderCount}
              </strong>
            </div>
            <div className="sarjan-account-stat-card">
              <span className="sarjan-account-stat-card__label">
                Credit terms
              </span>
              <strong className="sarjan-account-stat-card__value">
                {siteSettings.creditTermDays} days
              </strong>
            </div>
          </div>

          <form className="form-account-details" onSubmit={saveProfile}>
            <div className="sarjan-account-panel sarjan-account-panel--profile mb_24">
              <div className="sarjan-account-panel__head">
                <h5 className="title mb_0">Profile photo</h5>
                <p className="text-secondary text-caption-1 mb_0">
                  Company logo or professional headshot · JPG, PNG, WebP · max
                  4MB
                </p>
              </div>
              <div className="sarjan-profile-avatar-layout">
                <div className="sarjan-profile-avatar-thumb">
                  <img
                    key={avatarPreviewKey}
                    src={clientAvatarSrc(client.avatarUrl, client.id)}
                    alt=""
                    width={100}
                    height={100}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = clientAvatarSrc();
                    }}
                  />
                </div>
                <div className="sarjan-profile-avatar-actions">
                  <input
                    ref={avatarInputRef}
                    id="sarjan-profile-avatar-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    className="d-none"
                    disabled={avatarUploading || avatarRemoving}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadAvatar(file);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className={withBtnIcon(
                      "tf-btn btn-white has-border radius-4",
                    )}
                    disabled={avatarUploading || avatarRemoving}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <TfButtonIcon icon="icon-arrowUpRight">
                      {avatarUploading ? "Uploading…" : "Choose photo"}
                    </TfButtonIcon>
                  </button>
                  {hasCustomClientAvatar(client.avatarUrl) ? (
                    <button
                      type="button"
                      className={withBtnIcon(
                        "tf-btn btn-white has-border radius-4 sarjan-profile-avatar-remove",
                      )}
                      disabled={avatarUploading || avatarRemoving}
                      onClick={() => void removeAvatar()}
                    >
                      <TfButtonIcon icon="icon-close">
                        {avatarRemoving ? "Removing…" : "Remove photo"}
                      </TfButtonIcon>
                    </button>
                  ) : null}
                  {avatarMessage ? (
                    <p
                      className={
                        avatarMessage.includes("failed") ||
                        avatarMessage.includes("blocked") ||
                        avatarMessage.includes("Could not") ||
                        avatarMessage.includes("adult") ||
                        avatarMessage.includes("explicit") ||
                        avatarMessage.includes("not verify")
                          ? "text-danger text-caption-1 mt_8 mb_0"
                          : "text-success text-caption-1 mt_8 mb_0"
                      }
                    >
                      {avatarMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="sarjan-account-panel account-info mb_24">
              <div className="sarjan-account-panel__head">
                <h5 className="title mb_0">Business information</h5>
                <p className="text-secondary text-caption-1 mb_0">
                  Used for GST invoices, order confirmation, and dispatch.
                </p>
              </div>
              <div className="cols mb_20">
                <fieldset className="sarjan-field">
                  <label className="sarjan-field__label" htmlFor="acct-company">
                    Company / trade name
                  </label>
                  <input
                    id="acct-company"
                    type="text"
                    placeholder="Company name"
                    value={form.companyName}
                    onChange={(e) => updateForm("companyName", e.target.value)}
                    required
                  />
                </fieldset>
                <fieldset className="sarjan-field">
                  <label className="sarjan-field__label" htmlFor="acct-email">
                    Email
                  </label>
                  <input
                    id="acct-email"
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    readOnly
                  />
                </fieldset>
              </div>
              <div className="cols mb_20">
                <fieldset className="sarjan-field">
                  <label className="sarjan-field__label" htmlFor="acct-legal">
                    Legal / proprietor name
                  </label>
                  <input
                    id="acct-legal"
                    type="text"
                    placeholder="As on GST registration"
                    value={form.ownerLegalName}
                    onChange={(e) =>
                      updateForm("ownerLegalName", e.target.value)
                    }
                  />
                </fieldset>
                <fieldset className="sarjan-field">
                  <label className="sarjan-field__label" htmlFor="acct-phone">
                    Phone
                  </label>
                  <input
                    id="acct-phone"
                    type="text"
                    placeholder="Mobile number"
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                  />
                </fieldset>
              </div>
              <div className="mb_20 sarjan-profile-gst-block">
                <GstVerificationFields
                  gst={form.gst}
                  savedGst={savedGst}
                  allowGstEditWhenVerified
                  onGstChange={(value) => updateForm("gst", value)}
                  companyName={form.companyName}
                  onCompanyNameChange={(value) =>
                    updateForm("companyName", value)
                  }
                  ownerLegalName={form.ownerLegalName}
                  onOwnerLegalNameChange={(value) =>
                    updateForm("ownerLegalName", value)
                  }
                  onVerifiedChange={onGstVerifiedChange}
                  hideNameFields
                />
              </div>
              <IndiaStateCitySelect
                layout="stack"
                state={form.state}
                city={form.city}
                onStateChange={(value) => updateForm("state", value)}
                onCityChange={(value) => updateForm("city", value)}
                stateRequired
                cityRequired
              />
            </div>

            <div className="sarjan-account-panel mb_24">
              <div className="sarjan-account-panel__head">
                <h5 className="title mb_0">Quick actions</h5>
                <p className="text-secondary text-caption-1 mb_0">
                  Common tasks for your wholesale account.
                </p>
              </div>
              <div className="sarjan-account-quick-grid">
                <a
                  href="/my-account-address"
                  className="sarjan-account-quick-card"
                >
                  <span className="sarjan-account-quick-card__icon" aria-hidden>
                    <i className="icon icon-map-pin" />
                  </span>
                  <span className="sarjan-account-quick-card__body">
                    <strong>Address</strong>
                    <span>Add or edit dispatch locations</span>
                  </span>
                  <i className="icon icon-arrRight sarjan-account-quick-card__arrow" />
                </a>
                <a
                  href="/my-account-orders"
                  className="sarjan-account-quick-card"
                >
                  <span className="sarjan-account-quick-card__icon" aria-hidden>
                    <i className="icon icon-ShoppingBagOpen" />
                  </span>
                  <span className="sarjan-account-quick-card__body">
                    <strong>Orders</strong>
                    <span>View history and order status</span>
                  </span>
                  <i className="icon icon-arrRight sarjan-account-quick-card__arrow" />
                </a>
                <a href="/order-tracking" className="sarjan-account-quick-card">
                  <span className="sarjan-account-quick-card__icon" aria-hidden>
                    <i className="icon icon-shipping" />
                  </span>
                  <span className="sarjan-account-quick-card__body">
                    <strong>Tracking</strong>
                    <span>Follow dispatch and delivery</span>
                  </span>
                  <i className="icon icon-arrRight sarjan-account-quick-card__arrow" />
                </a>
                <a
                  href="/my-account-testimonials"
                  className="sarjan-account-quick-card"
                >
                  <span className="sarjan-account-quick-card__icon" aria-hidden>
                    <i className="icon icon-star" />
                  </span>
                  <span className="sarjan-account-quick-card__body">
                    <strong>Testimonial</strong>
                    <span>Share your experience with us</span>
                  </span>
                  <i className="icon icon-arrRight sarjan-account-quick-card__arrow" />
                </a>
              </div>
            </div>
            {message ? (
              <p
                className={
                  message.includes("failed") ||
                  message.includes("incorrect") ||
                  message.includes("match") ||
                  message.includes("required")
                    ? "text-danger mt_16"
                    : "text-success mt_16"
                }
              >
                {message}
              </p>
            ) : null}
            <div className="sarjan-account-panel sarjan-account-panel--actions">
              <div className="button-submit sarjan-account-submit-actions mb_0">
                <button
                  className={withBtnIcon("tf-btn btn-fill radius-4 w-100")}
                  type="submit"
                >
                  <TfButtonIcon
                    icon="icon-checkCircle"
                    textClassName="text text-button"
                  >
                    Update Account
                  </TfButtonIcon>
                </button>
                <button
                  className={withBtnIcon(
                    "tf-btn btn-white has-border radius-4 w-100",
                  )}
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(true);
                    setPasswordMessage("");
                    setShowCurrentPassword(false);
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                  }}
                >
                  <TfButtonIcon
                    icon="icon-security"
                    textClassName="text text-button"
                  >
                    Change Password
                  </TfButtonIcon>
                </button>
              </div>
            </div>
          </form>
          {passwordModalOpen ? (
            <div
              className="sarjan-password-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Change Password"
            >
              <button
                type="button"
                className="sarjan-password-modal-backdrop"
                onClick={closePasswordModal}
                aria-label="Close password modal"
              />
              <form
                className="sarjan-password-modal-card form-has-password"
                onSubmit={savePassword}
              >
                <div className="flex justify-between gap12 items-center mb_20">
                  <div>
                    <h5 className="title mb_4">Change Password</h5>
                    <p className="text-secondary">
                      Password update is separate from account profile update.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="icon-close icon-close-popup sarjan-password-modal-close"
                    onClick={closePasswordModal}
                    aria-label="Close change password"
                  />
                </div>
                <fieldset className="position-relative password-item mb_20">
                  <input
                    className="input-password"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Current Password*"
                    value={password.currentPassword}
                    onChange={(e) =>
                      updatePassword("currentPassword", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className={`toggle-password ${showCurrentPassword ? "" : "unshow"}`}
                    aria-label={
                      showCurrentPassword ? "Hide password" : "Show password"
                    }
                    onClick={() =>
                      setShowCurrentPassword((visible) => !visible)
                    }
                  >
                    <i className="icon-eye-hide-line" />
                  </button>
                </fieldset>
                <fieldset className="position-relative password-item mb_20">
                  <input
                    className="input-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New Password*"
                    value={password.newPassword}
                    minLength={MIN_CLIENT_PASSWORD_LENGTH}
                    onChange={(e) =>
                      updatePassword("newPassword", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className={`toggle-password ${showNewPassword ? "" : "unshow"}`}
                    aria-label={
                      showNewPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowNewPassword((visible) => !visible)}
                  >
                    <i className="icon-eye-hide-line" />
                  </button>
                </fieldset>
                <fieldset className="position-relative password-item">
                  <input
                    className="input-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password*"
                    value={password.confirmPassword}
                    minLength={MIN_CLIENT_PASSWORD_LENGTH}
                    onChange={(e) =>
                      updatePassword("confirmPassword", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className={`toggle-password ${showConfirmPassword ? "" : "unshow"}`}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    onClick={() =>
                      setShowConfirmPassword((visible) => !visible)
                    }
                  >
                    <i className="icon-eye-hide-line" />
                  </button>
                </fieldset>
                <p className="text-caption-1 text-secondary mt_12">
                  {minClientPasswordMessage("New password")}
                </p>
                {passwordMessage ? (
                  <p
                    className={
                      passwordMessage.includes("failed") ||
                      passwordMessage.includes("incorrect") ||
                      passwordMessage.includes("match") ||
                      passwordMessage.includes("required")
                        ? "text-danger mt_16"
                        : "text-success mt_16"
                    }
                  >
                    {passwordMessage}
                  </p>
                ) : null}
                <div className="button-submit d-flex gap-12 flex-wrap mt_24">
                  <button
                    className={withBtnIcon("tf-btn btn-fill")}
                    type="submit"
                  >
                    <TfButtonIcon
                      icon="icon-checkCircle"
                      textClassName="text text-button"
                    >
                      Update Password
                    </TfButtonIcon>
                  </button>
                  <button
                    className={withBtnIcon("tf-btn btn-white has-border")}
                    type="button"
                    onClick={closePasswordModal}
                  >
                    <TfButtonIcon
                      icon="icon-close"
                      textClassName="text text-button"
                    >
                      Cancel
                    </TfButtonIcon>
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </>
      ) : (
        <div>
          <p className="text-secondary">Login to view B2B account.</p>
          <a
            href="/login"
            className={withBtnIcon("tf-btn btn-fill radius-4 mt_16")}
          >
            <TfButtonIcon icon="icon-user">Login</TfButtonIcon>
          </a>
        </div>
      )}
    </div>
  );
}

function formatOrderStatus(status: string) {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AccountOrdersPage() {
  return (
    <AccountFrame
      active="/my-account-orders"
      title="Your Orders"
      sectionClass="sarjan-account-page--orders"
    >
      <AccountOrdersContent />
    </AccountFrame>
  );
}

function orderPricing(order: Order) {
  return enrichOrderPricing(order);
}

function AccountOrdersContent() {
  const { orders, loading } = useAccountSession();
  const searchParams = useSearchParams();
  const celebrationStarted = useRef(false);
  const [placedOrderId, setPlacedOrderId] = useState("");

  useEffect(() => {
    if (searchParams.get("celebrate") !== "1" || celebrationStarted.current) {
      return;
    }
    celebrationStarted.current = true;
    const orderId = searchParams.get("orderId")?.trim() ?? "";
    if (orderId) setPlacedOrderId(orderId);
    const cleanup = celebrateOrderPlaced();
    const url = new URL(window.location.href);
    url.searchParams.delete("celebrate");
    url.searchParams.delete("orderId");
    window.history.replaceState({}, "", url.pathname + url.search);
    return cleanup;
  }, [searchParams]);

  return (
    <>
      {placedOrderId ? (
        <div className="sarjan-account-order-placed-banner mb_20" role="status">
          <p className="mb_6 fw-6">{B2B_ORDER_SUCCESS_TITLE}</p>
          <p className="mb_6 text-caption-1">
            Order <strong>{placedOrderId}</strong>
          </p>
          {B2B_ORDER_SUCCESS_BODY.map((line) => (
            <p key={line} className="text-caption-1 text-secondary mb_6">
              {line}
            </p>
          ))}
          <a
            href={`/my-account-orders-details?orderId=${encodeURIComponent(placedOrderId)}`}
            className={withBtnIcon("tf-btn btn-fill radius-4 mt_12")}
          >
            <TfButtonIcon icon="icon-eye">View order details</TfButtonIcon>
          </a>
        </div>
      ) : null}
      <ReviewRequestBanner />
      <div className="account-orders sarjan-account-orders">
        <div className="wrap-account-order sarjan-account-orders-table-wrap">
          <table className="sarjan-account-orders-table">
            <thead>
              <tr>
                <th className="fw-6">Order</th>
                <th className="fw-6">Source</th>
                <th className="fw-6">Date</th>
                <th className="fw-6">Status</th>
                <th className="fw-6">Total</th>
                <th className="fw-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="sarjan-account-orders-message">
                  <td colSpan={6}>Loading orders...</td>
                </tr>
              ) : orders.length ? (
                orders.map((order) => (
                  <tr
                    className="tf-order-item sarjan-account-orders-row"
                    key={order.id}
                  >
                    <td
                      data-label="Order"
                      className="sarjan-account-orders__id"
                    >
                      {order.id}
                    </td>
                    <td
                      data-label="Source"
                      className="sarjan-account-orders__source"
                    >
                      <OrderPlacedViaBadge placedVia={order.placedVia} />
                      {!order.placedVia || order.placedVia === "storefront" ? (
                        <span className="sarjan-account-orders__source-label text-caption-1 text-secondary">
                          Website
                        </span>
                      ) : null}
                    </td>
                    <td data-label="Date">
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td
                      data-label="Status"
                      className="sarjan-account-orders__status"
                    >
                      <span className="sarjan-order-status-pill">
                        {formatOrderStatus(order.status)}
                      </span>
                    </td>
                    <td
                      data-label="Total"
                      className="sarjan-account-orders__total"
                    >
                      {money(order.subtotal)}
                    </td>
                    <td
                      data-label="Actions"
                      className="sarjan-account-orders__actions"
                    >
                      <div className="sarjan-account-orders__action-btns">
                        <a
                          href={`/my-account-orders-details?orderId=${encodeURIComponent(order.id)}`}
                          className="tf-btn btn-fill btn-sm radius-4 sarjan-has-btn-icon sarjan-account-order-action-btn"
                        >
                          <TfButtonIcon icon="icon-eye">View</TfButtonIcon>
                        </a>
                        {isOrderInvoiceAvailable(order.status) ? (
                          <a
                            href={`/api/orders/${encodeURIComponent(order.id)}/invoice`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tf-btn btn-line btn-sm radius-4 sarjan-has-btn-icon sarjan-account-order-action-btn sarjan-account-order-action-btn--secondary"
                          >
                            <TfButtonIcon icon="icon-arrowUpRight">
                              Invoice
                            </TfButtonIcon>
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="sarjan-account-orders-message">
                  <td colSpan={6}>No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function AccountAddressPage() {
  return (
    <AccountFrame active="/my-account-address" title="My Address">
      <AccountAddressContent />
    </AccountFrame>
  );
}

function AccountAddressContent() {
  const { client, orders, loading, setClient } = useAccountSession();
  return (
    <AccountAddressManager
      client={client}
      orders={orders}
      loading={loading}
      setClient={setClient}
    />
  );
}

function OrderView({
  order,
  client,
}: {
  order: Order;
  client?: Client | null;
}) {
  const dispatchText = client
    ? resolveDispatchAddress(order.dispatchAddress, {
        companyName: client.companyName,
        gst: client.gst,
        city: client.city,
        phone: client.phone,
        address: client.address,
      })
    : order.dispatchAddress;
  const steps = [
    "Pending approval",
    "Approved",
    "In Production",
    "Packed",
    "Ready for Dispatch",
    "Dispatched",
    "Delivered",
    "Rejected",
  ];
  const current = Math.max(0, steps.indexOf(order.status));
  const dispatchNotes = (order.dispatchHistory ?? []).slice().reverse();
  const priced = orderPricing(order);

  return (
    <div className="account-order-details">
      <div className="wd-form-order">
        <div className="order-head">
          <div className="content">
            <div className="sarjan-order-details-meta">
              <span className="sarjan-order-details-id">Order {order.id}</span>
              <OrderPlacedViaBadge placedVia={order.placedVia} />
            </div>
            <h6 className="sarjan-order-details-lead mb_0">
              Thank you. Your B2B order request has been received.
            </h6>
            <p className="mt_12 mb_0">
              {isOrderInvoiceAvailable(order.status) ? (
                <a
                  className="tf-btn btn-fill btn-sm"
                  href={`/api/orders/${encodeURIComponent(order.id)}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View tax invoice
                </a>
              ) : null}
            </p>
          </div>
          <div className="text-end sarjan-order-pricing-summary">
            <p className="text-secondary mb_4">Order total (incl. GST)</p>
            <h5 className="mb_0">{money(priced.total)}</h5>
          </div>
        </div>
        <div className="account-order-item">
          {order.items.map((item) => (
            <div
              className="item-order"
              key={`${order.id}-${item.slug}-${item.color}`}
            >
              <div className="content">
                <h6>{item.name}</h6>
                <p className="text-secondary">
                  {item.color} / {item.sizes.join(" / ")} / {item.setQuantity}{" "}
                  set
                </p>
                {item.slug ? (
                  <OrderLineReviewCta
                    orderId={order.id}
                    productSlug={item.slug}
                    orderStatus={order.status}
                  />
                ) : null}
              </div>
              <div className="text-button">{money(item.lineTotal)}</div>
            </div>
          ))}
        </div>
        <div className="sarjan-order-totals-card mt_24">
          {buildPricingDisplayLines(priced).map((line) => (
            <div key={line.key} className="sarjan-order-totals-row">
              <span>{line.label}</span>
              <span>{formatInrPricingLine(line.amount)}</span>
            </div>
          ))}
          <div className="sarjan-order-totals-row sarjan-order-totals-row--total">
            <span>Total payable</span>
            <strong>{money(priced.total)}</strong>
          </div>
        </div>
        <div className="widget-tabs style-3 widget-order-tab mt_32">
          <ul className="widget-menu-tab">
            <li className="item-title active">
              <span className="inner">Tracking</span>
            </li>
          </ul>
          <div className="widget-content-tab">
            <div className="widget-content-inner active">
              <div className="order-timeline">
                {steps.map((step, index) => (
                  <div
                    className={
                      index <= current
                        ? "timeline-step active"
                        : "timeline-step"
                    }
                    key={step}
                  >
                    {step}
                  </div>
                ))}
              </div>
              <p className="text-secondary mt_24">
                Dispatch Address:{" "}
                {dispatchText || "Will be confirmed by admin."}
              </p>
              {order.lrNumber ? (
                <p className="text-secondary">LR Number: {order.lrNumber}</p>
              ) : null}
              {order.vehicleDetails ? (
                <p className="text-secondary">
                  Vehicle: {order.vehicleDetails}
                </p>
              ) : null}
              {order.transportDetails ? (
                <p className="text-secondary">
                  Transport: {order.transportDetails}
                </p>
              ) : null}
              {order.courierDetails ? (
                <p className="text-secondary">
                  Courier: {order.courierDetails}
                </p>
              ) : null}
              {order.trackingNotes ? (
                <p className="text-secondary">
                  Tracking notes: {order.trackingNotes}
                </p>
              ) : null}
              {order.dispatchDate ? (
                <p className="text-secondary">
                  Dispatch date: {order.dispatchDate}
                </p>
              ) : null}
              {dispatchNotes.length ? (
                <ul className="text-secondary mt_16 mb-0 ps-3">
                  {dispatchNotes.map((entry) => (
                    <li key={`${entry.createdAt}-${entry.status}`}>
                      {entry.status}
                      {entry.note ? ` — ${entry.note}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-secondary">
                Payment terms will be confirmed by accounts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountOrderDetailsPage({ orderId }: { orderId?: string }) {
  return (
    <AccountFrame active="/my-account-orders" title="Order Details">
      <AccountOrderDetailsContent orderId={orderId} />
    </AccountFrame>
  );
}

function AccountOrderDetailsContent({ orderId }: { orderId?: string }) {
  const { client, orders, loading } = useAccountSession();
  const order = useMemo(
    () => (orderId ? orders.find((item) => item.id === orderId) : orders[0]),
    [orderId, orders],
  );

  return loading ? (
    <p>Loading order...</p>
  ) : order ? (
    <OrderView order={order} client={client} />
  ) : (
    <p className="text-secondary">No order found.</p>
  );
}

export function OrderTrackingPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [orderId, setOrderId] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState("");
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    void (async () => {
      let stored = readStoredClient() as Client | null;
      if (!stored?.id || !stored?.email) {
        const restored = await restoreClientSessionFromCookie();
        if (restored.ok) stored = restored.client as Client;
      }
      setClient(stored);
      setBillingEmail(stored?.email ?? "");
    })();
  }, []);

  const track = async () => {
    const id = orderId.trim();
    if (!id) {
      setMessage("Please enter order number.");
      return;
    }
    setTracking(true);
    const params = new URLSearchParams({ orderId: id });
    if (billingEmail.trim()) params.set("email", billingEmail.trim());
    const data = await fetch(`/api/orders?${params.toString()}`)
      .then((res) => res.json())
      .catch(() => ({ orders: [] }));
    const found = data.orders?.[0] ?? null;
    setOrder(found);
    setMessage(found ? "" : "No order found.");
    setTracking(false);
  };

  return (
    <>
      <PageTitle
        title="Order Tracking"
        crumbs={["Homepage", "Order Tracking"]}
      />
      <section className="flat-spacing">
        <div className="container">
          <div className="login-wrap tracking-wrap">
            <div className="left">
              <div className="heading">
                <h4 className="mb_8">Order Tracking</h4>
                <p>
                  To track your order please enter your Order ID in the box
                  below and press the Track button.
                </p>
              </div>
              <form
                className="form-login"
                onSubmit={(event) => {
                  event.preventDefault();
                  void track();
                }}
              >
                <div className="wrap">
                  <fieldset>
                    <input
                      className="sarjan-tracking-input"
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="Order ID*"
                      autoComplete="off"
                    />
                  </fieldset>
                  <fieldset>
                    <input
                      className="sarjan-tracking-input"
                      type="email"
                      value={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.value)}
                      placeholder="Billing Email*"
                      autoComplete="email"
                    />
                  </fieldset>
                </div>
                <div className="button-submit">
                  <button
                    className={withBtnIcon("tf-btn btn-fill")}
                    type="submit"
                    disabled={tracking}
                  >
                    <TfButtonIcon icon="icon-shipping">
                      {tracking ? "Tracking..." : "Tracking Orders"}
                    </TfButtonIcon>
                  </button>
                </div>
              </form>
              {message ? <p className="text-danger mt_16">{message}</p> : null}
            </div>
            <div className="right">
              {client?.id ? (
                <>
                  <h4 className="mb_8">Track from your account</h4>
                  <p className="text-secondary">
                    Open your order history for all saved B2B orders, approvals,
                    and dispatch status.
                  </p>
                  <a
                    href="/my-account-orders"
                    className={withBtnIcon("tf-btn btn-fill")}
                  >
                    <TfButtonIcon icon="icon-ShoppingBagOpen">
                      My Orders
                    </TfButtonIcon>
                  </a>
                </>
              ) : (
                <>
                  <h4 className="mb_8">Already have an account?</h4>
                  <p className="text-secondary">
                    Sign in to access order history, saved address, and B2B
                    credit workflow.
                  </p>
                  <a href="/login" className={withBtnIcon("tf-btn btn-fill")}>
                    <TfButtonIcon icon="icon-user">Login</TfButtonIcon>
                  </a>
                </>
              )}
            </div>
          </div>
          {order ? (
            <div className="mt_32">
              <OrderView order={order} client={client} />
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

export function AccountTestimonialsPage() {
  return (
    <AccountFrame active="/my-account-testimonials" title="Share Testimonial">
      <AccountTestimonialsContent />
    </AccountFrame>
  );
}

function AccountTestimonialsContent() {
  const { client, loading } = useAccountSession();

  return (
    <div className="account-details">
      {loading ? (
        <p>Loading…</p>
      ) : client ? (
        <>
          <h5 className="title mb_8">Submit a testimonial</h5>
          <p className="text-secondary text-caption-1 mb_24">
            Tell other wholesale buyers about your experience with Sarjan
            Textiles. Your quote is saved as <strong>pending</strong> until an
            admin approves it; only then it appears in the homepage carousel.
          </p>
          <TestimonialSubmitForm
            defaultAuthor={client.companyName}
            defaultEmail={client.email}
          />
        </>
      ) : null}
    </div>
  );
}
