export type StoredClient = {
  id?: string;
  status?: "pending" | "approved" | "rejected" | "inactive";
  clientTier?: "standard" | "premium" | "dealer";
  gst?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  city?: string;
  avatarUrl?: string;
  address?: {
    contactName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gst?: string;
    transport?: string;
    defaultAddressId?: string;
    saved?: Array<{
      id: string;
      label?: string;
      contactName?: string;
      phone?: string;
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      transport?: string;
    }>;
  };
};

export function readStoredClient(): StoredClient | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("sarjan-client");
    if (!raw) return null;
    return JSON.parse(raw) as StoredClient;
  } catch {
    return null;
  }
}

export function storedClientGstNumber(client: StoredClient | null) {
  return client?.gst?.trim() || client?.address?.gst?.trim() || "";
}
