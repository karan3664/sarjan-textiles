import type { LocalClient } from "@/lib/local-db";
import {
  getDefaultSavedAddress,
  listSavedAddresses,
  type ClientAddressBook,
} from "@/lib/client-saved-addresses";
import {
  hasMeaningfulDispatchAddress,
  resolveDispatchAddress,
} from "@/lib/dispatch-address";
import { findStateForCity } from "@/lib/india-locations";

export type ClientAddressFields = {
  contactName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst?: string;
  transport?: string;
  ownerLegalName?: string;
};

export type ClientAddressSource = Pick<
  LocalClient,
  "companyName" | "gst" | "city" | "phone" | "address"
>;

function mergeLegacyClientAddressBook(
  client: ClientAddressSource,
): ClientAddressFields {
  const book = client.address ?? {};
  const city = book.city?.trim() || client.city?.trim();
  const state =
    book.state?.trim() || (city ? findStateForCity(city) : "") || "";
  return {
    contactName: book.contactName?.trim() || client.companyName?.trim(),
    phone: book.phone?.trim() || client.phone?.trim(),
    gst: book.gst?.trim() || client.gst?.trim(),
    city,
    line1: book.line1?.trim() ?? "",
    line2: book.line2?.trim(),
    state,
    pincode: book.pincode?.trim(),
    transport: book.transport?.trim(),
    ownerLegalName: book.ownerLegalName?.trim(),
  };
}

/** Merge top-level client fields into the address book shape. */
export function mergeClientAddressBook(
  client: ClientAddressSource,
): ClientAddressFields {
  const legacy = mergeLegacyClientAddressBook(client);
  const book = (client.address ?? {}) as ClientAddressBook;
  const savedDefault = getDefaultSavedAddress(book, legacy);
  if (savedDefault) {
    return {
      contactName:
        savedDefault.contactName?.trim() || client.companyName?.trim(),
      phone: savedDefault.phone?.trim() || client.phone?.trim(),
      gst: savedDefault.gst?.trim() || client.gst?.trim(),
      city: savedDefault.city?.trim() || client.city?.trim(),
      line1: savedDefault.line1?.trim() ?? "",
      line2: savedDefault.line2?.trim(),
      state:
        savedDefault.state?.trim() ||
        findStateForCity(savedDefault.city ?? client.city ?? "") ||
        "",
      pincode: savedDefault.pincode?.trim(),
      transport: savedDefault.transport?.trim(),
      ownerLegalName: savedDefault.ownerLegalName?.trim(),
    };
  }
  return legacy;
}

export { listSavedAddresses, getDefaultSavedAddress };
export type {
  ClientAddressBook,
  SavedClientAddress,
} from "@/lib/client-saved-addresses";

/** Pick the first line that looks like a street address from dispatch text. */
export function streetLineFromDispatch(dispatch: string) {
  const lines = dispatch
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  if (lines.length === 1) return lines[0];

  const streetIdx = lines.findIndex((line) =>
    /unit|road|near|plot|flat|floor|swagat|residency|palanpur|parpad|surat|gujarat|\d/i.test(
      line,
    ),
  );
  if (streetIdx >= 0) return lines[streetIdx];
  return (
    lines.find((line) => !/^gst:/i.test(line) && !/^\d{10}$/.test(line)) ??
    lines[0]
  );
}

export function latestOrderDispatchAddress(
  orders: Array<{ dispatchAddress?: string; createdAt?: string }>,
  client: ClientAddressSource,
) {
  const sorted = [...orders].sort(
    (a, b) =>
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime(),
  );
  for (const order of sorted) {
    const text = resolveDispatchAddress(order.dispatchAddress, client);
    if (hasMeaningfulDispatchAddress(text)) return text;
  }
  return "";
}

/** Profile address with street line from the latest order when line1 was never saved. */
export function resolveAccountAddress(
  client: ClientAddressSource,
  orders: Array<{ dispatchAddress?: string; createdAt?: string }> = [],
) {
  const merged = mergeClientAddressBook(client);
  if (merged.line1?.trim()) {
    return { address: merged, dispatchFallback: "", fromOrder: false };
  }

  const dispatchFallback = latestOrderDispatchAddress(orders, client);
  const inferredLine = streetLineFromDispatch(dispatchFallback);
  if (!inferredLine) {
    return { address: merged, dispatchFallback: "", fromOrder: false };
  }

  return {
    address: { ...merged, line1: inferredLine },
    dispatchFallback,
    fromOrder: true,
  };
}
