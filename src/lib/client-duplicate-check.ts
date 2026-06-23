import { isValidGstin, normalizeGstin } from "@/lib/gstin-form";

type ClientLike = {
  id: string;
  email: string;
  gst?: string;
  phone?: string;
  address?: {
    gst?: string;
    phone?: string;
  };
};

export type ClientDuplicateField = "email" | "phone" | "gst";

export type ClientUniqueFields = {
  email?: string;
  phone?: string;
  gst?: string;
};

export function normalizeClientEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Compare Indian mobiles on last 10 digits (handles +91 / leading 0). */
export function normalizeClientPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

export function isValidClientPhone(phone: string) {
  return INDIAN_MOBILE_PATTERN.test(normalizeClientPhone(phone));
}

function clientGstValues(client: ClientLike): string[] {
  const values = new Set<string>();
  for (const raw of [client.gst, client.address?.gst]) {
    if (!raw?.trim()) continue;
    const normalized = normalizeGstin(raw);
    if (isValidGstin(normalized)) values.add(normalized);
  }
  return [...values];
}

function clientPhoneValues(client: ClientLike): string[] {
  const values = new Set<string>();
  for (const raw of [client.phone, client.address?.phone]) {
    if (!raw?.trim()) continue;
    const normalized = normalizeClientPhone(raw);
    if (normalized.length >= 10) values.add(normalized);
  }
  return [...values];
}

export function findClientFieldDuplicate(
  clients: ClientLike[],
  fields: ClientUniqueFields,
  excludeClientId?: string,
): { field: ClientDuplicateField; message: string } | null {
  const email = fields.email?.trim() ? normalizeClientEmail(fields.email) : "";
  const phone = fields.phone?.trim() ? normalizeClientPhone(fields.phone) : "";
  const gstRaw = fields.gst?.trim() ? normalizeGstin(fields.gst) : "";
  const gst = isValidGstin(gstRaw) ? gstRaw : "";

  for (const client of clients) {
    if (excludeClientId && client.id === excludeClientId) continue;

    if (email && normalizeClientEmail(client.email) === email) {
      return {
        field: "email",
        message:
          "This email is already registered. Sign in or use a different email address.",
      };
    }

    if (phone.length >= 10) {
      for (const existing of clientPhoneValues(client)) {
        if (existing === phone) {
          return {
            field: "phone",
            message:
              "This mobile number is already linked to another wholesale account.",
          };
        }
      }
    }

    if (gst) {
      for (const existing of clientGstValues(client)) {
        if (existing === gst) {
          return {
            field: "gst",
            message:
              "This GST number is already registered to another account.",
          };
        }
      }
    }
  }

  return null;
}

export function assertUniqueAmongClients(
  clients: ClientLike[],
  fields: ClientUniqueFields,
  excludeClientId?: string,
) {
  const duplicate = findClientFieldDuplicate(clients, fields, excludeClientId);
  if (duplicate) throw new Error(duplicate.message);
}

export function findClientByPhone<T extends ClientLike>(
  clients: T[],
  phoneInput: string,
): T | null {
  const phone = normalizeClientPhone(phoneInput);
  if (phone.length !== 10) return null;
  return (
    clients.find((client) => clientPhoneValues(client).includes(phone)) ?? null
  );
}
