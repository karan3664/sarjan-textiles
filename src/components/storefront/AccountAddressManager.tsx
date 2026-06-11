"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  persistAccountClient,
  type AccountClient,
} from "@/components/storefront/AccountSessionContext";
import { clientAuthJsonHeaders } from "@/lib/client-auth-browser";
import { IndiaStateCitySelect } from "@/components/shared/IndiaStateCitySelect";
import {
  TfButtonIcon,
  withBtnIcon,
} from "@/components/storefront/TfButtonIcon";
import { resolveAccountAddress } from "@/lib/client-address";
import {
  listSavedAddresses,
  removeSavedAddress,
  savedAddressSummary,
  setDefaultSavedAddressId,
  syncAddressBookFlatFields,
  upsertSavedAddress,
  type ClientAddressBook,
  type SavedClientAddress,
} from "@/lib/client-saved-addresses";
import {
  normalizeIndianPincode,
  verifyIndianPincode,
} from "@/lib/india-pincode";

type AddressFields = Omit<SavedClientAddress, "id" | "label">;

const EMPTY_FORM: AddressFields = {
  contactName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  transport: "",
};

type Props = {
  client: AccountClient | null;
  orders: Array<{ dispatchAddress?: string; createdAt?: string }>;
  loading: boolean;
  setClient: (client: AccountClient) => void;
};

export function AccountAddressManager({
  client,
  orders,
  loading,
  setClient,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFields>(EMPTY_FORM);
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [message, setMessage] = useState("");
  const [addressFromOrder, setAddressFromOrder] = useState(false);
  const [pincodeChecking, setPincodeChecking] = useState(false);
  const [pincodeFeedback, setPincodeFeedback] = useState<{
    tone: "muted" | "success" | "error";
    text: string;
  }>({ tone: "muted", text: "" });
  const [saving, setSaving] = useState(false);

  const addressBook = (client?.address ?? {}) as ClientAddressBook;
  const { saved: savedAddresses, defaultAddressId } = useMemo(
    () => listSavedAddresses(addressBook),
    [addressBook],
  );

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSetAsDefault(savedAddresses.length === 0);
    setFormOpen(false);
    setPincodeFeedback({ tone: "muted", text: "" });
  }, [savedAddresses.length]);

  const openAddForm = () => {
    const resolved =
      client && !savedAddresses.length
        ? resolveAccountAddress(client, orders)
        : null;
    const seed = resolved?.address;
    setForm({
      ...EMPTY_FORM,
      contactName: seed?.contactName || client?.companyName || "",
      phone: seed?.phone || client?.phone || "",
      line1: seed?.line1 || "",
      line2: seed?.line2 || "",
      city: seed?.city || "",
      state: seed?.state || "",
      pincode: seed?.pincode || "",
      transport: seed?.transport || "",
    });
    if (resolved?.fromOrder) setAddressFromOrder(true);
    setEditingId(null);
    setSetAsDefault(savedAddresses.length === 0);
    setFormOpen(true);
    setMessage("");
  };

  const openEditForm = (item: SavedClientAddress) => {
    setForm({
      contactName: item.contactName ?? "",
      phone: item.phone ?? "",
      line1: item.line1 ?? "",
      line2: item.line2 ?? "",
      city: item.city ?? "",
      state: item.state ?? "",
      pincode: item.pincode ?? "",
      transport: item.transport ?? "",
    });
    setEditingId(item.id);
    setSetAsDefault(item.id === defaultAddressId);
    setFormOpen(true);
    setMessage("");
  };

  useEffect(() => {
    if (!client || formOpen) return;
    const resolved = resolveAccountAddress(client, orders);
    if (!savedAddresses.length && resolved.address.line1?.trim()) {
      setAddressFromOrder(resolved.fromOrder);
    }
  }, [client, formOpen, orders, savedAddresses.length]);

  const update = (key: keyof AddressFields, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const validatePincode = useCallback(async () => {
    const pincode = normalizeIndianPincode(form.pincode ?? "");
    if (!pincode) {
      const text = "Postal code is required.";
      setPincodeFeedback({ tone: "error", text });
      return { ok: false, message: text };
    }
    if (!form.state?.trim() || !form.city?.trim()) {
      const text = "Select state and city before validating PIN code.";
      setPincodeFeedback({ tone: "error", text });
      return { ok: false, message: text };
    }

    setPincodeChecking(true);
    try {
      const result = await verifyIndianPincode(
        pincode,
        form.state ?? "",
        form.city ?? "",
      );
      setPincodeFeedback({
        tone: result.valid ? "success" : "error",
        text: result.message,
      });
      if (result.valid && result.pincode !== form.pincode) {
        setForm((current) => ({ ...current, pincode: result.pincode }));
      }
      return { ok: result.valid, message: result.message };
    } catch {
      const text = "Could not verify PIN code. Try again.";
      setPincodeFeedback({ tone: "error", text });
      return { ok: false, message: text };
    } finally {
      setPincodeChecking(false);
    }
  }, [form.pincode, form.state, form.city]);

  useEffect(() => {
    if (!formOpen) return;
    const pincode = normalizeIndianPincode(form.pincode ?? "");
    if (pincode.length !== 6 || !form.state?.trim() || !form.city?.trim()) {
      return;
    }
    const timer = window.setTimeout(() => {
      void validatePincode();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form.pincode, form.state, form.city, formOpen, validatePincode]);

  const patchAddressBook = async (nextBook: ClientAddressBook) => {
    if (!client?.id) {
      setMessage("Login required.");
      return false;
    }
    setSaving(true);
    try {
      const synced = syncAddressBookFlatFields(nextBook);
      const res = await fetch(`/api/clients/${encodeURIComponent(client.id)}`, {
        method: "PATCH",
        headers: clientAuthJsonHeaders(),
        body: JSON.stringify({
          address: synced,
          city: synced.city,
          phone: synced.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Address update failed.");
        return false;
      }
      setClient(persistAccountClient(data.client));
      setAddressFromOrder(false);
      return true;
    } catch {
      setMessage("Address update failed.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveForm = async () => {
    if (!client?.id) {
      setMessage("Login required.");
      return;
    }
    if (
      !form.contactName?.trim() ||
      !form.phone?.trim() ||
      !form.line1?.trim()
    ) {
      setMessage("Name, phone, and address line are required.");
      return;
    }
    const pinCheck = await validatePincode();
    if (!pinCheck.ok) {
      setMessage(pinCheck.message);
      return;
    }

    try {
      const nextBook = upsertSavedAddress(
        addressBook,
        form,
        editingId,
        setAsDefault || savedAddresses.length === 0,
      );
      const ok = await patchAddressBook(nextBook);
      if (ok) {
        setMessage(editingId ? "Address updated." : "Address added.");
        resetForm();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Address save failed.",
      );
    }
  };

  const chooseDefault = async (addressId: string) => {
    if (addressId === defaultAddressId) return;
    try {
      const nextBook = setDefaultSavedAddressId(addressBook, addressId);
      const ok = await patchAddressBook(nextBook);
      if (ok) setMessage("Default address updated.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update default.",
      );
    }
  };

  const deleteAddress = async (addressId: string) => {
    try {
      const nextBook = removeSavedAddress(addressBook, addressId);
      const ok = await patchAddressBook(nextBook);
      if (ok) {
        if (editingId === addressId) resetForm();
        setMessage("Address removed.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Address remove failed.",
      );
    }
  };

  if (loading) {
    return <p>Loading address...</p>;
  }

  return (
    <div className="account-address">
      <div className="widget-inner-address sarjan-address-manager">
        <div className="sarjan-address-manager__toolbar">
          <h5 className="sarjan-address-manager__title mb_0">
            Saved addresses
          </h5>
          <button
            type="button"
            className={withBtnIcon(
              "tf-btn btn-fill radius-4 btn-address sarjan-address-manager__add",
            )}
            onClick={openAddForm}
          >
            <TfButtonIcon
              icon="icon-map-pin"
              textClassName="text text-caption-1"
            >
              Add new address
            </TfButtonIcon>
          </button>
        </div>

        {savedAddresses.length > 0 ? (
          <div
            className="list-account-address sarjan-saved-address-list"
            role="radiogroup"
            aria-label="Choose default address"
          >
            {savedAddresses.map((item) => {
              const isDefault = item.id === defaultAddressId;
              return (
                <div
                  key={item.id}
                  className={`account-address-item sarjan-saved-address-card${isDefault ? " is-default" : ""}`}
                >
                  <label className="sarjan-saved-address-card__select">
                    <input
                      type="radio"
                      name="sarjan-default-address"
                      value={item.id}
                      checked={isDefault}
                      disabled={saving}
                      onChange={() => void chooseDefault(item.id)}
                    />
                    <span className="sarjan-saved-address-card__radio" />
                    <span className="sarjan-saved-address-card__badge">
                      {isDefault ? "Default address" : "Other address"}
                    </span>
                  </label>
                  <div className="sarjan-saved-address-card__body">
                    {savedAddressSummary(item).map((line) => (
                      <p key={line} className="mb_6">
                        {line}
                      </p>
                    ))}
                    {item.transport ? (
                      <p className="mb_6 text-secondary text-caption-1">
                        Transport: {item.transport}
                      </p>
                    ) : null}
                  </div>
                  <div className="sarjan-saved-address-card__actions d-flex gap-10">
                    <button
                      type="button"
                      className={withBtnIcon(
                        "tf-btn radius-4 btn-fill justify-content-center",
                      )}
                      disabled={saving}
                      onClick={() => openEditForm(item)}
                    >
                      <TfButtonIcon icon="icon-arrowUpRight">Edit</TfButtonIcon>
                    </button>
                    <button
                      type="button"
                      className={withBtnIcon(
                        "tf-btn radius-4 btn-white has-border justify-content-center",
                      )}
                      disabled={saving}
                      onClick={() => void deleteAddress(item.id)}
                    >
                      <TfButtonIcon icon="icon-close">Delete</TfButtonIcon>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="sarjan-address-manager__empty text-secondary text-center">
            No saved addresses yet. Add your shop or dispatch address for faster
            checkout.
            {addressFromOrder ? (
              <>
                {" "}
                We found a street line from your latest order — add it below to
                save on your profile.
              </>
            ) : null}
          </p>
        )}

        {formOpen ? (
          <form
            className="show-form-address wd-form-address sarjan-address-form sarjan-address-form--panel"
            onSubmit={(event) => {
              event.preventDefault();
              void saveForm();
            }}
          >
            <div className="sarjan-address-form__header">
              <div className="title mb_0">
                {editingId ? "Edit address" : "Add a new address"}
              </div>
              <button
                type="button"
                className="sarjan-address-form__close icon-close"
                aria-label="Close address form"
                onClick={resetForm}
              />
            </div>
            <div className="cols mb_20">
              <fieldset>
                <input
                  type="text"
                  placeholder="Contact Name*"
                  value={form.contactName}
                  onChange={(e) => update("contactName", e.target.value)}
                  required
                />
              </fieldset>
              <fieldset>
                <input
                  type="text"
                  placeholder="Phone*"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  required
                />
              </fieldset>
            </div>
            <fieldset className="mb_20">
              <input
                type="text"
                placeholder="Transport"
                value={form.transport ?? ""}
                onChange={(e) => update("transport", e.target.value)}
              />
            </fieldset>
            <fieldset className="mb_20">
              <input
                type="text"
                placeholder="Address line 1*"
                value={form.line1}
                onChange={(e) => update("line1", e.target.value)}
                required
              />
            </fieldset>
            <fieldset className="mb_20">
              <input
                type="text"
                placeholder="Address line 2"
                value={form.line2 ?? ""}
                onChange={(e) => update("line2", e.target.value)}
              />
            </fieldset>
            <IndiaStateCitySelect
              state={form.state ?? ""}
              city={form.city ?? ""}
              onStateChange={(value) => update("state", value)}
              onCityChange={(value) => update("city", value)}
              stateRequired
              cityRequired
            />
            <fieldset className="mb_20">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                placeholder="Postal Code*"
                value={form.pincode ?? ""}
                onChange={(e) => {
                  update("pincode", normalizeIndianPincode(e.target.value));
                  if (pincodeFeedback.tone !== "muted") {
                    setPincodeFeedback({ tone: "muted", text: "" });
                  }
                }}
                onBlur={() => void validatePincode()}
                required
              />
              {pincodeChecking || pincodeFeedback.text ? (
                <p
                  className={`text-caption-1 mt_8 mb_0 sarjan-pincode-feedback sarjan-pincode-feedback--${pincodeChecking ? "muted" : pincodeFeedback.tone}`}
                >
                  {pincodeChecking
                    ? "Checking PIN code against India Post…"
                    : pincodeFeedback.text}
                </p>
              ) : null}
            </fieldset>
            {savedAddresses.length > 0 ? (
              <div className="tf-cart-checkbox mb_20 sarjan-address-default-check">
                <div className="tf-checkbox-wrapp">
                  <input
                    id="address-default"
                    type="checkbox"
                    checked={setAsDefault}
                    onChange={(event) => setSetAsDefault(event.target.checked)}
                  />
                  <div>
                    <i className="icon-check" />
                  </div>
                </div>
                <label htmlFor="address-default">
                  Set as default address after saving
                </label>
              </div>
            ) : null}
            <div className="d-flex align-items-center justify-content-center gap-20 flex-wrap">
              <button
                type="submit"
                className={withBtnIcon("tf-btn btn-fill radius-4")}
                disabled={saving}
              >
                <TfButtonIcon icon="icon-checkCircle">
                  {saving ? "Saving…" : "Save address"}
                </TfButtonIcon>
              </button>
              <button
                type="button"
                className={withBtnIcon("tf-btn btn-white has-border radius-4")}
                disabled={saving}
                onClick={resetForm}
              >
                <TfButtonIcon icon="icon-close">Cancel</TfButtonIcon>
              </button>
            </div>
          </form>
        ) : null}

        {message ? (
          <p
            className={
              message.includes("failed") || message.includes("required")
                ? "text-danger mt_16 text-center"
                : "text-success mt_16 text-center"
            }
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
