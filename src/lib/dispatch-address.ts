import type { LocalClient } from "@/lib/local-db";

export type DispatchAddressClient = Pick<
  LocalClient,
  "companyName" | "gst" | "city" | "phone" | "address"
>;

/** Multi-line dispatch text from the client's saved default address. */
export function formatClientDispatchAddress(
  client: DispatchAddressClient,
): string {
  const address = client.address;
  if (!address?.line1?.trim()) return "";

  const lines: string[] = [];
  const name = address.contactName?.trim() || client.companyName?.trim();
  if (name) lines.push(name);
  lines.push(address.line1.trim());
  if (address.line2?.trim()) lines.push(address.line2.trim());

  const cityLine = [address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");
  if (cityLine) lines.push(cityLine);
  else if (client.city?.trim()) lines.push(client.city.trim());

  const gst = address.gst?.trim() || client.gst?.trim();
  if (gst) lines.push(`GST: ${gst}`);

  const phone = address.phone?.trim() || client.phone?.trim();
  if (phone) lines.push(phone);

  if (address.transport?.trim()) {
    lines.push(`Transport: ${address.transport.trim()}`);
  }

  return lines.join("\n");
}

export function hasMeaningfulDispatchAddress(value?: string | null) {
  const text = value?.trim() ?? "";
  if (!text) return false;
  if (text.includes("\n")) return true;
  if (text.length >= 28) return true;
  if (/,\s*\S/.test(text)) return true;
  if (/\b\d{6}\b/.test(text)) return true;
  if (/unit|road|near|plot|flat|floor|swagat|residency|palanpur/i.test(text)) {
    return true;
  }
  return text.split(/\s+/).filter(Boolean).length >= 4;
}

/** Order field first; fall back to client default address book entry. */
export function resolveDispatchAddress(
  orderDispatch: string | undefined,
  client: DispatchAddressClient,
) {
  if (hasMeaningfulDispatchAddress(orderDispatch)) {
    return orderDispatch!.trim();
  }
  return formatClientDispatchAddress(client);
}
