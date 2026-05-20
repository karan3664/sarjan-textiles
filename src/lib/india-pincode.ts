export type PincodePostOffice = {
  Name: string;
  District: string;
  State: string;
  Block?: string;
  Division?: string;
  Pincode: string;
};

export type PincodeVerifyResult = {
  valid: boolean;
  formatValid: boolean;
  locationMatch: boolean;
  message: string;
  pincode: string;
  resolvedState?: string;
  resolvedDistrict?: string;
  resolvedAreas?: string[];
};

export function normalizeIndianPincode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

/** Indian PIN: 6 digits, first digit 1–9. */
export function isValidIndianPincodeFormat(pincode: string) {
  return /^[1-9]\d{5}$/.test(normalizeIndianPincode(pincode));
}

function normalizeLocationToken(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function locationTokensMatch(selected: string, candidate: string) {
  const a = normalizeLocationToken(selected);
  const b = normalizeLocationToken(candidate);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4) {
    return a.includes(b) || b.includes(a);
  }
  return false;
}

export function pincodeMatchesStateAndCity(
  offices: PincodePostOffice[],
  state: string,
  city: string,
) {
  const wantState = state.trim();
  const wantCity = city.trim();
  if (!wantState || !wantCity) {
    return {
      match: false,
      message: "Select state and city before validating PIN code.",
    };
  }

  const matched = offices.filter((office) => {
    if (!locationTokensMatch(wantState, office.State)) return false;
    const cityCandidates = [office.District, office.Name, office.Block].filter(
      Boolean,
    ) as string[];
    return cityCandidates.some((candidate) =>
      locationTokensMatch(wantCity, candidate),
    );
  });

  if (!matched.length) {
    const sample = offices[0];
    const hint = sample
      ? `${sample.District}, ${sample.State}`
      : "another area";
    return {
      match: false,
      message: `PIN code does not match ${wantCity}, ${wantState}. It belongs to ${hint}.`,
    };
  }

  return { match: true, message: "PIN code matches selected state and city." };
}

export async function lookupIndianPincode(
  pincode: string,
): Promise<PincodePostOffice[]> {
  const normalized = normalizeIndianPincode(pincode);
  const response = await fetch(
    `https://api.postalpincode.in/pincode/${normalized}`,
    { cache: "no-store" },
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

export function verifyPincodeAgainstLocation(
  pincode: string,
  state: string,
  city: string,
  offices: PincodePostOffice[],
): PincodeVerifyResult {
  const normalized = normalizeIndianPincode(pincode);
  const formatValid = isValidIndianPincodeFormat(normalized);

  if (!formatValid) {
    return {
      valid: false,
      formatValid: false,
      locationMatch: false,
      message: "Enter a valid 6-digit Indian PIN code.",
      pincode: normalized,
    };
  }

  if (!offices.length) {
    return {
      valid: false,
      formatValid: true,
      locationMatch: false,
      message: "PIN code not found in India Post records.",
      pincode: normalized,
    };
  }

  const location = pincodeMatchesStateAndCity(offices, state, city);
  const primary = offices[0];
  const resolvedAreas = Array.from(
    new Set(
      offices.flatMap((office) =>
        [office.District, office.Name].filter(Boolean),
      ),
    ),
  ).slice(0, 4) as string[];

  return {
    valid: location.match,
    formatValid: true,
    locationMatch: location.match,
    message: location.message,
    pincode: normalized,
    resolvedState: primary?.State,
    resolvedDistrict: primary?.District,
    resolvedAreas,
  };
}

export async function verifyIndianPincode(
  pincode: string,
  state: string,
  city: string,
): Promise<PincodeVerifyResult> {
  const normalized = normalizeIndianPincode(pincode);
  const formatValid = isValidIndianPincodeFormat(normalized);
  if (!formatValid) {
    return {
      valid: false,
      formatValid: false,
      locationMatch: false,
      message: "Enter a valid 6-digit Indian PIN code.",
      pincode: normalized,
    };
  }

  const params = new URLSearchParams({
    pincode: normalized,
    state: state.trim(),
    city: city.trim(),
  });
  const response = await fetch(`/api/pincode/verify?${params.toString()}`);
  const data = (await response.json()) as PincodeVerifyResult & {
    error?: string;
  };
  if (!response.ok) {
    return {
      valid: false,
      formatValid,
      locationMatch: false,
      message: data.error ?? data.message ?? "PIN verification failed.",
      pincode: normalized,
    };
  }
  return data;
}
