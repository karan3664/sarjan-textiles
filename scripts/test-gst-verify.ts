import {
  fetchGstPortalCaptchaPng,
  postGstTaxpayerDetailsWithSession,
} from "../src/lib/gst-portal-http";

async function main() {
  try {
    const { cookieHeader } = await fetchGstPortalCaptchaPng();
    console.log("captcha ok");

    const verify = await postGstTaxpayerDetailsWithSession(cookieHeader, {
      gstin: "24JXPPK2159M2ZQ",
      captcha: "000000",
    });
    console.log("verify status", verify.status);
    console.log("body", verify.body.toString("utf8").slice(0, 200));
  } catch (e) {
    const err = e as Error;
    console.error("ERR", err.message);
    process.exitCode = 1;
  }
}

void main();
