import {
  isValidIndianPincodeFormat,
  normalizeIndianPincode,
  type PincodePostOffice,
} from "./india-pincode";
import { lookupIndianPincodeBundled } from "./india-pincode-server";

function titleCaseLocation(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

async function lookupIndianPincodeFromPostalApi(
  pincode: string,
): Promise<PincodePostOffice[]> {
  const response = await fetch(
    `https://api.postalpincode.in/pincode/${pincode}`,
    { cache: "no-store", signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) {
    throw new Error("PIN lookup service unavailable. Try again.");
  }

  const raw = (await response.json()) as
    | {
        Status?: string;
        PostOffice?: PincodePostOffice[];
      }
    | Array<{
        Status?: string;
        PostOffice?: PincodePostOffice[];
      }>;

  const data = Array.isArray(raw) ? raw[0] : raw;
  if (data?.Status !== "Success" || !Array.isArray(data.PostOffice)) {
    return [];
  }

  return data.PostOffice.filter((office) => office?.Pincode);
}

async function lookupIndianPincodeFromZippopotam(
  pincode: string,
): Promise<PincodePostOffice[]> {
  const response = await fetch(`https://api.zippopotam.us/in/${pincode}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    places?: Array<{
      "place name"?: string;
      state?: string;
    }>;
  };

  return (data.places ?? []).map((place) => ({
    Name: titleCaseLocation(place["place name"] ?? ""),
    District: titleCaseLocation(place["place name"] ?? ""),
    State: titleCaseLocation(place.state ?? ""),
    Pincode: pincode,
  }));
}

/** Resolve PIN → post offices (bundled DB first, then network fallbacks). Server-only. */
export async function lookupIndianPincode(
  pincode: string,
): Promise<PincodePostOffice[]> {
  const normalized = normalizeIndianPincode(pincode);
  if (!isValidIndianPincodeFormat(normalized)) {
    return [];
  }

  const bundled = lookupIndianPincodeBundled(normalized);
  if (bundled.length) {
    return bundled;
  }

  try {
    const fromPostal = await lookupIndianPincodeFromPostalApi(normalized);
    if (fromPostal.length) {
      return fromPostal;
    }
  } catch {
    // postalpincode.in often fails (expired TLS cert) — try next provider
  }

  return lookupIndianPincodeFromZippopotam(normalized);
}
