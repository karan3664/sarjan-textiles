import { normalizeMobilePhone } from "@/lib/mobile-otp";

const OTP_MESSAGE = (otp: string) =>
  `Your Sarjan Textiles login OTP is ${otp}. Valid for 10 minutes.`;

function msg91TemplateId() {
  return process.env.MSG91_TEMPLATE_ID?.trim() || "";
}

function dltTemplateId() {
  return process.env.MSG91_DLT_TEMPLATE_ID?.trim() || "";
}

/** MSG91 Flow API — uses MSG91 template id + ##otp## variable. */
async function sendViaMsg91Template(
  authKey: string,
  phone: string,
  otp: string,
): Promise<void> {
  const id = msg91TemplateId();
  const response = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      authkey: authKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      template_id: id,
      short_url: "0",
      recipients: [{ mobiles: `91${phone}`, otp }],
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error("SMS delivery failed. Try again later.");
  }
  try {
    const json = JSON.parse(body) as { type?: string; message?: string };
    if (json.type === "error") {
      throw new Error(json.message || "SMS delivery failed. Try again later.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("SMS delivery")) {
      throw error;
    }
    if (/error/i.test(body)) {
      throw new Error("SMS delivery failed. Try again later.");
    }
  }
}

/** Legacy HTTP API with DLT portal template id (DLT_TE_ID). */
async function sendViaMsg91Http(
  authKey: string,
  sender: string,
  phone: string,
  otp: string,
): Promise<void> {
  const params = new URLSearchParams({
    authkey: authKey,
    mobiles: `91${phone}`,
    message: OTP_MESSAGE(otp),
    sender,
    route: "4",
    country: "91",
  });
  const dltId = dltTemplateId();
  if (dltId) {
    params.set("DLT_TE_ID", dltId);
  }
  const response = await fetch(
    `https://control.msg91.com/api/sendhttp.php?${params.toString()}`,
    { method: "GET" },
  );
  const body = await response.text();
  if (!response.ok || /error/i.test(body)) {
    throw new Error("SMS delivery failed. Try again later.");
  }
}

/** Sends a transactional OTP SMS. Dev: logs to console when SMS_DEV_CONSOLE_OTP is set. */
export async function sendOtpSms(
  phoneInput: string,
  otp: string,
): Promise<void> {
  const phone = normalizeMobilePhone(phoneInput);
  if (phone.length !== 10) {
    throw new Error("Valid 10-digit mobile required");
  }

  const devConsole =
    process.env.NODE_ENV === "development" &&
    (process.env.SMS_DEV_CONSOLE_OTP === "1" ||
      process.env.SMS_DEV_CONSOLE_OTP === "true" ||
      process.env.SMTP_DEV_CONSOLE_OTP === "1" ||
      process.env.SMTP_DEV_CONSOLE_OTP === "true");

  if (devConsole) {
    console.warn(
      `[sarjan-dev] Mobile OTP for +91${phone} (not sent — SMS_DEV_CONSOLE_OTP): ${otp}`,
    );
    return;
  }

  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const sender = process.env.MSG91_SENDER_ID?.trim() || "SARJANTEXTILES";

  if (!authKey) {
    throw new Error(
      "SMS is not configured on the server. Set MSG91_AUTH_KEY or SMS_DEV_CONSOLE_OTP for development.",
    );
  }

  if (msg91TemplateId()) {
    await sendViaMsg91Template(authKey, phone, otp);
    return;
  }

  await sendViaMsg91Http(authKey, sender, phone, otp);
}
