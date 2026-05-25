import fs from "fs";
import path from "path";
import zlib from "zlib";
import {
  IndiaPincode,
  type PostOffice as IndiaPincodeOffice,
} from "india-pincode";
import type { PincodePostOffice } from "./india-pincode";

let cachedApi: IndiaPincode | null = null;

function titleCaseLocation(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function mapBundledOffice(office: IndiaPincodeOffice): PincodePostOffice {
  return {
    Name: titleCaseLocation(office.area),
    District: titleCaseLocation(office.district),
    State: titleCaseLocation(office.state),
    Block: office.division ? titleCaseLocation(office.division) : undefined,
    Division: office.division ? titleCaseLocation(office.division) : undefined,
    Pincode: office.pincode,
  };
}

function getBundledPincodeApi() {
  if (cachedApi) {
    return cachedApi;
  }

  const candidates = [
    path.join(
      process.cwd(),
      "node_modules/india-pincode/data/pincodes.json.gz",
    ),
    path.join(process.cwd(), "data/pincodes.json.gz"),
  ];

  for (const gzPath of candidates) {
    try {
      if (!fs.existsSync(gzPath)) continue;
      const raw = zlib.gunzipSync(fs.readFileSync(gzPath));
      const records = JSON.parse(raw.toString()) as IndiaPincodeOffice[];
      if (!Array.isArray(records) || !records.length) continue;
      cachedApi = new IndiaPincode(records);
      return cachedApi;
    } catch {
      continue;
    }
  }

  return null;
}

export function lookupIndianPincodeBundled(
  pincode: string,
): PincodePostOffice[] {
  const api = getBundledPincodeApi();
  if (!api) {
    return [];
  }

  const response = api.getByPincode(pincode, { limit: 100 });
  if (!response.success || !response.data?.data?.length) {
    return [];
  }

  return response.data.data.map(mapBundledOffice);
}
