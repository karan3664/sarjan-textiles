import {
  isValidIndianPincodeFormat,
  lookupIndianPincode,
  normalizeIndianPincode,
  verifyPincodeAgainstLocation,
} from "@/lib/india-pincode";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pincode = normalizeIndianPincode(searchParams.get("pincode") ?? "");
    const state = searchParams.get("state")?.trim() ?? "";
    const city = searchParams.get("city")?.trim() ?? "";

    if (!pincode) {
      return Response.json(
        {
          valid: false,
          formatValid: false,
          locationMatch: false,
          message: "PIN code is required.",
          pincode: "",
        },
        { status: 400 },
      );
    }

    if (!isValidIndianPincodeFormat(pincode)) {
      return Response.json({
        valid: false,
        formatValid: false,
        locationMatch: false,
        message: "Enter a valid 6-digit Indian PIN code.",
        pincode,
      });
    }

    if (!state || !city) {
      return Response.json({
        valid: false,
        formatValid: true,
        locationMatch: false,
        message: "Select state and city before validating PIN code.",
        pincode,
      });
    }

    const offices = await lookupIndianPincode(pincode);
    const result = verifyPincodeAgainstLocation(pincode, state, city, offices);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        valid: false,
        formatValid: false,
        locationMatch: false,
        message:
          error instanceof Error ? error.message : "PIN verification failed.",
        pincode: "",
      },
      { status: 502 },
    );
  }
}
