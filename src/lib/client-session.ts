export type StoredClient = {
  id?: string;
  gst?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: {
    contactName?: string;
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gst?: string;
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
