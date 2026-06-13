import type { ClientAddressFields } from "@/lib/client-address";

export type SavedClientAddress = ClientAddressFields & {
  id: string;
  label?: string;
};

export type ClientAddressBook = ClientAddressFields & {
  saved?: SavedClientAddress[];
  defaultAddressId?: string;
};

export function createSavedAddressId() {
  return `addr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function hasSavedAddressContent(
  address: Partial<ClientAddressFields> | undefined,
) {
  return Boolean(
    address?.line1?.trim() &&
    address?.city?.trim() &&
    address?.state?.trim() &&
    address?.pincode?.trim(),
  );
}

function pickAddressFields(
  source: Partial<ClientAddressFields>,
): ClientAddressFields {
  return {
    contactName: source.contactName?.trim() || undefined,
    phone: source.phone?.trim() || undefined,
    line1: source.line1?.trim() || undefined,
    line2: source.line2?.trim() || undefined,
    city: source.city?.trim() || undefined,
    state: source.state?.trim() || undefined,
    pincode: source.pincode?.trim() || undefined,
    transport: source.transport?.trim() || undefined,
    ownerLegalName: source.ownerLegalName?.trim() || undefined,
  };
}

export type SavedAddressSummaryLine = {
  key: string;
  text: string;
};

export function savedAddressSummary(
  address: SavedClientAddress,
): SavedAddressSummaryLine[] {
  const lines: SavedAddressSummaryLine[] = [];
  if (address.contactName?.trim()) {
    lines.push({ key: "contact", text: address.contactName.trim() });
  }
  if (address.line1?.trim()) {
    lines.push({ key: "line1", text: address.line1.trim() });
  }
  if (address.line2?.trim()) {
    lines.push({ key: "line2", text: address.line2.trim() });
  }
  const locality = [address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");
  if (locality) {
    lines.push({ key: "locality", text: locality });
  }
  lines.push({
    key: "phone",
    text: address.phone?.trim() || "Phone not saved",
  });
  return lines;
}

/** Read saved addresses; migrate legacy single `address` object when needed. */
export function listSavedAddresses(
  book: ClientAddressBook | undefined,
  legacy?: ClientAddressFields,
): { saved: SavedClientAddress[]; defaultAddressId: string } {
  const stored = Array.isArray(book?.saved)
    ? book!.saved!.filter(
        (item): item is SavedClientAddress =>
          Boolean(item?.id?.trim()) && hasSavedAddressContent(item),
      )
    : [];

  if (stored.length > 0) {
    const defaultAddressId =
      book?.defaultAddressId &&
      stored.some((item) => item.id === book.defaultAddressId)
        ? book.defaultAddressId
        : stored[0].id;
    return { saved: stored, defaultAddressId };
  }

  const legacyFields = pickAddressFields({
    ...(legacy ?? {}),
    ...(book ?? {}),
  });
  if (!hasSavedAddressContent(legacyFields)) {
    return { saved: [], defaultAddressId: "" };
  }

  const migrated: SavedClientAddress = {
    id: book?.defaultAddressId?.trim() || "legacy-default",
    ...legacyFields,
  };
  return { saved: [migrated], defaultAddressId: migrated.id };
}

export function getDefaultSavedAddress(
  book: ClientAddressBook | undefined,
  legacy?: ClientAddressFields,
) {
  const { saved, defaultAddressId } = listSavedAddresses(book, legacy);
  return saved.find((item) => item.id === defaultAddressId) ?? saved[0];
}

/** Mirror default saved address onto flat `address` fields for legacy consumers. */
export function syncAddressBookFlatFields(
  book: ClientAddressBook,
): ClientAddressBook {
  const { saved, defaultAddressId } = listSavedAddresses(book);
  const fallback = getDefaultSavedAddress(book);
  const next: ClientAddressBook = {
    ...book,
    saved,
    defaultAddressId: defaultAddressId || fallback?.id,
  };

  if (fallback) {
    Object.assign(next, pickAddressFields(fallback));
  }

  return next;
}

export function upsertSavedAddress(
  book: ClientAddressBook,
  fields: ClientAddressFields,
  editingId?: string | null,
  setAsDefault = false,
): ClientAddressBook {
  const { saved, defaultAddressId } = listSavedAddresses(book);
  const payload = pickAddressFields(fields);
  if (!hasSavedAddressContent(payload)) {
    throw new Error("Complete address required.");
  }

  let nextSaved: SavedClientAddress[];
  let nextDefaultId = defaultAddressId;

  if (editingId) {
    nextSaved = saved.map((item) =>
      item.id === editingId ? { ...item, ...payload, id: item.id } : item,
    );
    if (!nextSaved.some((item) => item.id === editingId)) {
      nextSaved = [...saved, { id: editingId, ...payload }];
    }
    if (setAsDefault) nextDefaultId = editingId;
  } else {
    const id = createSavedAddressId();
    nextSaved = [...saved, { id, ...payload }];
    if (!nextDefaultId || setAsDefault || saved.length === 0) {
      nextDefaultId = id;
    }
  }

  return syncAddressBookFlatFields({
    ...book,
    saved: nextSaved,
    defaultAddressId: nextDefaultId,
  });
}

export function removeSavedAddress(
  book: ClientAddressBook,
  addressId: string,
): ClientAddressBook {
  const { saved, defaultAddressId } = listSavedAddresses(book);
  const nextSaved = saved.filter((item) => item.id !== addressId);
  let nextDefaultId = defaultAddressId;
  if (defaultAddressId === addressId) {
    nextDefaultId = nextSaved[0]?.id ?? "";
  }
  return syncAddressBookFlatFields({
    ...book,
    saved: nextSaved,
    defaultAddressId: nextDefaultId,
  });
}

export function setDefaultSavedAddressId(
  book: ClientAddressBook,
  addressId: string,
): ClientAddressBook {
  const { saved } = listSavedAddresses(book);
  if (!saved.some((item) => item.id === addressId)) {
    throw new Error("Address not found.");
  }
  return syncAddressBookFlatFields({
    ...book,
    saved,
    defaultAddressId: addressId,
  });
}
