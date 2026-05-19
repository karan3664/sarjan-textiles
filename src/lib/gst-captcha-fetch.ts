const GST_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const GST_REFERER = "https://services.gst.gov.in/services/searchtp";

export function cookieHeaderFromGstResponse(res: Response): string {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  const parts =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers.get("set-cookie")
        ? [headers.get("set-cookie") as string]
        : [];
  return parts
    .map((line) => line.split(";")[0]?.trim())
    .filter((line) => line.includes("="))
    .join("; ");
}

export async function fetchGstPortalCaptchaPng(): Promise<{
  png: Buffer;
  cookieHeader: string;
  contentType: string;
}> {
  const rnd = Math.random().toString();
  const capRes = await fetch(
    `https://services.gst.gov.in/services/captcha?rnd=${encodeURIComponent(rnd)}`,
    {
      headers: {
        Referer: GST_REFERER,
        "User-Agent": GST_UA,
      },
      cache: "no-store",
    },
  );

  if (!capRes.ok) {
    throw new Error(`GST captcha HTTP ${capRes.status}`);
  }

  const cookieHeader = cookieHeaderFromGstResponse(capRes);
  if (!cookieHeader.includes("CaptchaCookie=")) {
    throw new Error("GST captcha did not return CaptchaCookie");
  }

  const png = Buffer.from(await capRes.arrayBuffer());
  const contentType = capRes.headers.get("content-type") ?? "image/png";
  return { png, cookieHeader, contentType };
}

export { GST_REFERER, GST_UA };
