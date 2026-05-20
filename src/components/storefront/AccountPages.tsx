"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GstVerificationFields } from "./GstVerificationFields";
import {
  bumpClientAvatarCache,
  clientAvatarSrc,
  hasCustomClientAvatar,
} from "@/lib/client-avatar-display";
import { resolveDispatchAddress } from "@/lib/dispatch-address";
import {
  isGstVerifiedOnFile,
  isValidGstin,
  normalizeGstin,
} from "@/lib/gstin-form";
import { PageTitle } from "./PageTitle";
import { TestimonialSubmitForm } from "./TestimonialSubmitForm";

type Client = {
  id: string;
  email: string;
  companyName: string;
  gst?: string;
  city?: string;
  phone?: string;
  address?: Address;
  avatarUrl?: string;
};

type Address = {
  contactName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst?: string;
  transport?: string;
};

type Order = {
  id: string;
  clientId: string;
  clientEmail: string;
  status: string;
  paymentMode: "cheque";
  creditDays: number;
  subtotal: number;
  dispatchAddress: string;
  note?: string;
  createdAt: string;
  items: Array<{
    slug: string;
    name: string;
    color: string;
    sizes: string[];
    setQuantity: number;
    piecesPerSet: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

const nav = [
  { href: "/my-account", label: "Dashboard", icon: "icon-user" },
  { href: "/my-account-orders", label: "Orders", icon: "icon-bag" },
  { href: "/my-account-address", label: "Address", icon: "icon-mapPin" },
  {
    href: "/my-account-testimonials",
    label: "Share Testimonial",
    icon: "icon-star",
  },
  { href: "/order-tracking", label: "Order Tracking", icon: "icon-truck" },
  { href: "/login", label: "Logout", icon: "icon-log-out" },
];

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function readClient() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(
      localStorage.getItem("sarjan-client") ?? "null",
    ) as Client | null;
  } catch {
    return null;
  }
}

function clientAuthToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("sarjan-client-token")?.trim()
    : "";
}

function clientAuthHeaders(): HeadersInit {
  const token = clientAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clientAuthJsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...clientAuthHeaders(),
  };
}

function stripAvatarCacheQuery(url?: string) {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  const index = trimmed.indexOf("?");
  return index === -1 ? trimmed : trimmed.slice(0, index);
}

function persistClient(client: Client) {
  const stored: Client = {
    ...client,
    avatarUrl: stripAvatarCacheQuery(client.avatarUrl),
  };
  localStorage.setItem("sarjan-client", JSON.stringify(stored));
  window.dispatchEvent(new CustomEvent("sarjan-auth-updated"));
  return stored;
}

function useClientAndOrders() {
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readClient();
    const token = localStorage.getItem("sarjan-client-token")?.trim();
    if (!stored?.id || !token) {
      setClient(null);
      setLoading(false);
      window.location.assign("/login");
      return;
    }

    setClient(stored);

    Promise.all([
      fetch(`/api/clients/${encodeURIComponent(stored.id)}`)
        .then((res) => res.json())
        .catch(() => null),
      fetch(`/api/orders?clientId=${encodeURIComponent(stored.id)}`)
        .then((res) => res.json())
        .catch(() => ({ orders: [] })),
    ])
      .then(([clientData, orderData]) => {
        const freshClient = clientData?.client ?? stored;
        const normalized: Client = {
          ...freshClient,
          avatarUrl: stripAvatarCacheQuery(freshClient?.avatarUrl),
        };
        setClient(normalized);
        localStorage.setItem("sarjan-client", JSON.stringify(normalized));
        setOrders(orderData.orders ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return { client, orders, loading, setClient };
}

function AccountFrame({
  active,
  title,
  children,
}: {
  active: string;
  title: string;
  children: React.ReactNode;
}) {
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    const syncClient = () => setClient(readClient());
    syncClient();
    window.addEventListener("storage", syncClient);
    window.addEventListener("sarjan-auth-updated", syncClient);
    return () => {
      window.removeEventListener("storage", syncClient);
      window.removeEventListener("sarjan-auth-updated", syncClient);
    };
  }, []);

  return (
    <>
      <PageTitle title={title} crumbs={["Homepage", title]} />
      <div className="btn-sidebar-account">
        <button
          data-bs-toggle="offcanvas"
          data-bs-target="#mbAccount"
          aria-controls="mbAccount"
        >
          <i className="icon icon-sidebar" />
        </button>
      </div>
      <section className="flat-spacing">
        <div className="container">
          <div className="my-account-wrap">
            <div className="wrap-sidebar-account">
              <div className="sidebar-account">
                <div className="account-avatar">
                  <div className="image">
                    <img src={clientAvatarSrc(client?.avatarUrl)} alt="" />
                  </div>
                  <h6 className="mb_4">
                    {client?.companyName ?? "Sarjan Client"}
                  </h6>
                  <div className="body-text-1 text-secondary">
                    {client?.email ?? "Login required"}
                  </div>
                </div>
                <ul className="my-account-nav">
                  {nav.map((item) => (
                    <li key={item.href}>
                      {item.href === active ? (
                        <span className="my-account-nav-item active">
                          <i className={`icon ${item.icon}`} />
                          {item.label}
                        </span>
                      ) : (
                        <a href={item.href} className="my-account-nav-item">
                          <i className={`icon ${item.icon}`} />
                          {item.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="my-account-content">{children}</div>
          </div>
        </div>
      </section>
    </>
  );
}

export function AccountDashboardPage() {
  const { client, orders, loading, setClient } = useClientAndOrders();
  const [form, setForm] = useState({
    companyName: "",
    email: "",
    phone: "",
    gst: "",
    ownerLegalName: "",
    city: "",
  });
  const [savedGst, setSavedGst] = useState("");
  const [gstVerified, setGstVerified] = useState(false);
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
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
          ownerLegalName: form.ownerLegalName.trim(),
        },
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setClient(persistClient(data.client));
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
      setPasswordModalOpen(false);
      setPasswordMessage("");
    }, 700);
  };

  const applyAvatarClient = useCallback(
    (next: Client, message: string) => {
      const stored = persistClient(next);
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
    if (!clientAuthToken()) {
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
    if (!clientAuthToken()) {
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
        const stored = persistClient(data.client);
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

  return (
    <AccountFrame active="/my-account" title="My Account">
      <div className="account-details">
        {loading ? (
          <p>Loading account...</p>
        ) : client ? (
          <>
            <form className="form-account-details" onSubmit={saveProfile}>
              <div className="account-info">
                <h5 className="title">Information</h5>
                <div className="sarjan-profile-avatar-block mb_24">
                  <div className="text-title mb_8">Profile photo</div>
                  <p className="text-secondary text-caption-1 mb_16">
                    JPG, PNG, or WebP · max 4MB. Use a professional headshot
                    (with shirt) or company logo only — nudity, shirtless, and
                    suggestive photos are blocked automatically.
                  </p>
                  <div className="d-flex align-items-center gap-20 flex-wrap">
                    <div className="sarjan-profile-avatar-thumb">
                      <img
                        key={avatarPreviewKey}
                        src={clientAvatarSrc(client.avatarUrl)}
                        alt=""
                        width={100}
                        height={100}
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
                        className="tf-btn btn-white has-border radius-4"
                        disabled={avatarUploading || avatarRemoving}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <span className="text">
                          {avatarUploading ? "Uploading…" : "Choose photo"}
                        </span>
                      </button>
                      {hasCustomClientAvatar(client.avatarUrl) ? (
                        <button
                          type="button"
                          className="tf-btn btn-white has-border radius-4 sarjan-profile-avatar-remove"
                          disabled={avatarUploading || avatarRemoving}
                          onClick={() => void removeAvatar()}
                        >
                          <span className="text">
                            {avatarRemoving
                              ? "Removing…"
                              : "Remove profile photo"}
                          </span>
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
                <div className="cols mb_20">
                  <fieldset>
                    <input
                      type="text"
                      placeholder="Company Name*"
                      value={form.companyName}
                      onChange={(e) =>
                        updateForm("companyName", e.target.value)
                      }
                      required
                    />
                  </fieldset>
                  <fieldset>
                    <input
                      type="email"
                      placeholder="Username or email address*"
                      value={form.email}
                      readOnly
                    />
                  </fieldset>
                </div>
                <div className="cols mb_20">
                  <fieldset>
                    <input
                      type="text"
                      placeholder="Legal name / proprietor (as on GST)"
                      value={form.ownerLegalName}
                      onChange={(e) =>
                        updateForm("ownerLegalName", e.target.value)
                      }
                    />
                  </fieldset>
                  <fieldset>
                    <input
                      type="text"
                      placeholder="Phone*"
                      value={form.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                    />
                  </fieldset>
                </div>
                <div className="mb_20">
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
                <div className="tf-select mb_20">
                  <select
                    className="text-title"
                    value={form.city}
                    onChange={(e) => updateForm("city", e.target.value)}
                  >
                    <option value="">Select city</option>
                    <option value="Surat">Surat</option>
                    <option value="Ahmedabad">Ahmedabad</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Jaipur">Jaipur</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="row mb_32">
                  <div className="col-md-4">
                    <p className="text-secondary">Orders</p>
                    <h5>{orders.length}</h5>
                  </div>
                </div>
                <div className="d-flex gap-12 flex-wrap mb_32">
                  <a
                    href="/my-account-address"
                    className="tf-btn btn-white has-border radius-4"
                  >
                    <span className="text">Add / Edit Address</span>
                  </a>
                  <a
                    href="/my-account-orders"
                    className="tf-btn btn-white has-border radius-4"
                  >
                    <span className="text">View Orders</span>
                  </a>
                  <a
                    href="/order-tracking"
                    className="tf-btn btn-white has-border radius-4"
                  >
                    <span className="text">Track Order</span>
                  </a>
                  <a
                    href="/my-account-testimonials"
                    className="tf-btn btn-white has-border radius-4"
                  >
                    <span className="text">Share Testimonial</span>
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
              <div className="button-submit d-flex gap-12 flex-wrap">
                <button className="tf-btn btn-fill" type="submit">
                  <span className="text text-button">Update Account</span>
                </button>
                <button
                  className="tf-btn btn-white has-border"
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(true);
                    setPasswordMessage("");
                  }}
                >
                  <span className="text text-button">Change Password</span>
                </button>
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
                  onClick={() => setPasswordModalOpen(false)}
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
                      className="sarjan-password-modal-close"
                      onClick={() => setPasswordModalOpen(false)}
                      aria-label="Close"
                    >
                      <i className="icon-close" />
                    </button>
                  </div>
                  <fieldset className="position-relative password-item mb_20">
                    <input
                      className="input-password"
                      type="password"
                      placeholder="Current Password*"
                      value={password.currentPassword}
                      onChange={(e) =>
                        updatePassword("currentPassword", e.target.value)
                      }
                    />
                    <span className="toggle-password unshow">
                      <i className="icon-eye-hide-line" />
                    </span>
                  </fieldset>
                  <fieldset className="position-relative password-item mb_20">
                    <input
                      className="input-password"
                      type="password"
                      placeholder="New Password*"
                      value={password.newPassword}
                      onChange={(e) =>
                        updatePassword("newPassword", e.target.value)
                      }
                    />
                    <span className="toggle-password unshow">
                      <i className="icon-eye-hide-line" />
                    </span>
                  </fieldset>
                  <fieldset className="position-relative password-item">
                    <input
                      className="input-password"
                      type="password"
                      placeholder="Confirm Password*"
                      value={password.confirmPassword}
                      onChange={(e) =>
                        updatePassword("confirmPassword", e.target.value)
                      }
                    />
                    <span className="toggle-password unshow">
                      <i className="icon-eye-hide-line" />
                    </span>
                  </fieldset>
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
                    <button className="tf-btn btn-fill" type="submit">
                      <span className="text text-button">Update Password</span>
                    </button>
                    <button
                      className="tf-btn btn-white has-border"
                      type="button"
                      onClick={() => setPasswordModalOpen(false)}
                    >
                      <span className="text text-button">Cancel</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </>
        ) : (
          <div>
            <p className="text-secondary">Login to view B2B account.</p>
            <a href="/login" className="tf-btn btn-fill radius-4 mt_16">
              <span className="text">Login</span>
            </a>
          </div>
        )}
      </div>
    </AccountFrame>
  );
}

export function AccountOrdersPage() {
  const { orders, loading } = useClientAndOrders();

  return (
    <AccountFrame active="/my-account-orders" title="Your Orders">
      <div className="account-orders">
        <div className="wrap-account-order">
          <table>
            <thead>
              <tr>
                <th className="fw-6">Order</th>
                <th className="fw-6">Date</th>
                <th className="fw-6">Status</th>
                <th className="fw-6">Total</th>
                <th className="fw-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>Loading orders...</td>
                </tr>
              ) : orders.length ? (
                orders.map((order) => (
                  <tr className="tf-order-item" key={order.id}>
                    <td>{order.id}</td>
                    <td>
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td>{order.status}</td>
                    <td>{money(order.subtotal)}</td>
                    <td>
                      <a
                        href={`/my-account-orders-details?orderId=${encodeURIComponent(order.id)}`}
                        className="tf-btn btn-fill radius-4"
                      >
                        <span className="text">View</span>
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No order yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AccountFrame>
  );
}

export function AccountAddressPage() {
  const { client, loading, setClient } = useClientAndOrders();
  const [address, setAddress] = useState<Address>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (client?.address) setAddress(client.address);
  }, [client]);

  const update = (key: keyof Address, value: string) =>
    setAddress((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!client?.id) {
      setMessage("Login required.");
      return;
    }
    const res = await fetch(`/api/clients/${encodeURIComponent(client.id)}`, {
      method: "PATCH",
      headers: clientAuthJsonHeaders(),
      body: JSON.stringify({
        address,
        city: address.city,
        gst: address.gst,
        phone: address.phone,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setClient(data.client);
      localStorage.setItem("sarjan-client", JSON.stringify(data.client));
      setMessage("Address saved.");
    } else {
      setMessage(data.error ?? "Address save failed.");
    }
  };

  const remove = async () => {
    if (!client?.id) {
      setMessage("Login required.");
      return;
    }
    const emptyAddress = {};
    const res = await fetch(`/api/clients/${encodeURIComponent(client.id)}`, {
      method: "PATCH",
      headers: clientAuthJsonHeaders(),
      body: JSON.stringify({ address: emptyAddress }),
    });
    const data = await res.json();
    if (res.ok) {
      setAddress(emptyAddress);
      setClient(data.client);
      localStorage.setItem("sarjan-client", JSON.stringify(data.client));
      setMessage("Address removed.");
    } else {
      setMessage(data.error ?? "Address remove failed.");
    }
  };

  return (
    <AccountFrame active="/my-account-address" title="My Address">
      <div className="account-address">
        {loading ? (
          <p>Loading address...</p>
        ) : (
          <div className="text-center widget-inner-address">
            <button
              type="button"
              className="tf-btn btn-fill radius-4 mb_20 btn-address"
            >
              <span className="text text-caption-1">Add / Edit address</span>
            </button>
            <form
              className="show-form-address wd-form-address sarjan-address-form"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="title">Add a new address</div>
              <div className="cols mb_20">
                <fieldset>
                  <input
                    type="text"
                    placeholder="Contact Name*"
                    value={address.contactName ?? ""}
                    onChange={(e) => update("contactName", e.target.value)}
                  />
                </fieldset>
                <fieldset>
                  <input
                    type="text"
                    placeholder="Phone*"
                    value={address.phone ?? ""}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </fieldset>
              </div>
              <div className="cols mb_20">
                <fieldset>
                  <input
                    type="text"
                    placeholder="GST Number"
                    value={address.gst ?? ""}
                    onChange={(e) => update("gst", e.target.value)}
                  />
                </fieldset>
                <fieldset>
                  <input
                    type="text"
                    placeholder="Transport"
                    value={address.transport ?? ""}
                    onChange={(e) => update("transport", e.target.value)}
                  />
                </fieldset>
              </div>
              <fieldset className="mb_20">
                <input
                  type="text"
                  placeholder="Address"
                  value={address.line1 ?? ""}
                  onChange={(e) => update("line1", e.target.value)}
                />
              </fieldset>
              <fieldset className="mb_20">
                <input
                  type="text"
                  placeholder="Address line 2"
                  value={address.line2 ?? ""}
                  onChange={(e) => update("line2", e.target.value)}
                />
              </fieldset>
              <div className="cols mb_20">
                <fieldset>
                  <input
                    type="text"
                    placeholder="City"
                    value={address.city ?? ""}
                    onChange={(e) => update("city", e.target.value)}
                  />
                </fieldset>
                <fieldset>
                  <input
                    type="text"
                    placeholder="State"
                    value={address.state ?? ""}
                    onChange={(e) => update("state", e.target.value)}
                  />
                </fieldset>
              </div>
              <fieldset className="mb_20">
                <input
                  type="text"
                  placeholder="Postal Code"
                  value={address.pincode ?? ""}
                  onChange={(e) => update("pincode", e.target.value)}
                />
              </fieldset>
              <div className="tf-cart-checkbox mb_20">
                <div className="tf-checkbox-wrapp">
                  <input defaultChecked type="checkbox" id="address-default" />
                  <div>
                    <i className="icon-check" />
                  </div>
                </div>
                <label htmlFor="address-default">Set as default address.</label>
              </div>
              <div className="d-flex align-items-center justify-content-center gap-20">
                <button type="submit" className="tf-btn btn-fill radius-4">
                  <span className="text">Save address</span>
                </button>
                <button
                  type="button"
                  className="tf-btn btn-white has-border radius-4"
                  onClick={() => setAddress(client?.address ?? {})}
                >
                  <span className="text">Cancel</span>
                </button>
              </div>
              {message ? (
                <p
                  className={
                    message.includes("failed") || message.includes("required")
                      ? "text-danger mt_16"
                      : "text-success mt_16"
                  }
                >
                  {message}
                </p>
              ) : null}
            </form>
            <div className="list-account-address">
              <div className="account-address-item">
                <h6 className="mb_20">Default</h6>
                <p>
                  {address.contactName ||
                    client?.companyName ||
                    "Sarjan Client"}
                </p>
                <p>{address.line1 || "No address saved"}</p>
                {address.line2 ? <p>{address.line2}</p> : null}
                <p>
                  {[address.city, address.state, address.pincode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p>{address.gst ? `GST: ${address.gst}` : "GST not saved"}</p>
                <p className="mb_10">{address.phone || "Phone not saved"}</p>
                <div className="d-flex gap-10 justify-content-center">
                  <button
                    type="button"
                    className="tf-btn radius-4 btn-fill justify-content-center"
                    onClick={() =>
                      document
                        .querySelector<HTMLInputElement>(
                          ".sarjan-address-form input",
                        )
                        ?.focus()
                    }
                  >
                    <span className="text">Edit</span>
                  </button>
                  <button
                    type="button"
                    className="tf-btn radius-4 btn-white has-border justify-content-center"
                    onClick={remove}
                  >
                    <span className="text">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AccountFrame>
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
  ];
  const current = Math.max(0, steps.indexOf(order.status));

  return (
    <div className="account-order-details">
      <div className="wd-form-order">
        <div className="order-head">
          <div className="content">
            <div className="badge text-btn-uppercase">Order {order.id}</div>
            <h6 className="mt_8">
              Thank you. Your B2B order request has been received.
            </h6>
          </div>
          <div className="text-end">
            <p className="text-secondary">Total</p>
            <h5>{money(order.subtotal)}</h5>
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
              </div>
              <div className="text-button">{money(item.lineTotal)}</div>
            </div>
          ))}
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
  const { client, orders, loading } = useClientAndOrders();
  const order = useMemo(
    () => (orderId ? orders.find((item) => item.id === orderId) : orders[0]),
    [orderId, orders],
  );

  return (
    <AccountFrame active="/my-account-orders" title="Order Details">
      {loading ? (
        <p>Loading order...</p>
      ) : order ? (
        <OrderView order={order} client={client} />
      ) : (
        <p className="text-secondary">No order found.</p>
      )}
    </AccountFrame>
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
    const stored = readClient();
    setClient(stored);
    setBillingEmail(stored?.email ?? "");
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
                    className="tf-btn btn-fill"
                    type="submit"
                    disabled={tracking}
                  >
                    <span className="text">
                      {tracking ? "Tracking..." : "Tracking Orders"}
                    </span>
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
                  <a href="/my-account-orders" className="tf-btn btn-fill">
                    <span className="text">My Orders</span>
                  </a>
                </>
              ) : (
                <>
                  <h4 className="mb_8">Already have an account?</h4>
                  <p className="text-secondary">
                    Sign in to access order history, saved address, and B2B
                    credit workflow.
                  </p>
                  <a href="/login" className="tf-btn btn-fill">
                    <span className="text">Login</span>
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
  const { client, loading } = useClientAndOrders();

  return (
    <AccountFrame active="/my-account-testimonials" title="Share Testimonial">
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
    </AccountFrame>
  );
}
