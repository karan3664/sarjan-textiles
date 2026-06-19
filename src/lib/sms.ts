import { normalizeMobilePhone } from "@/lib/mobile-otp";

const OTP_MESSAGE = (otp: string) =>
  `Your Sarjan Textile password reset code is ${otp}. Valid for 10 minutes.`;

function msg91TemplateId() {
  return process.env.MSG91_TEMPLATE_ID?.trim() || "";
}

function dltTemplateId() {
  return process.env.MSG91_DLT_TEMPLATE_ID?.trim() || "";
}

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
  if (dltId) params.set("DLT_TE_ID", dltId);
  const response = await fetch(
    `https://control.msg91.com/api/sendhttp.php?${params.toString()}`,
    { method: "GET" },
  );
  const body = await response.text();
  if (!response.ok || /error/i.test(body)) {
    throw new Error("SMS delivery failed. Try again later.");
  }
}

/** Password-reset mobile OTP only (website). App uses Firebase Phone Auth. */
export async function sendPasswordResetSms(
  phoneInput: string,
  otp: string,
): Promise<void> {
  await sendAuthMobileSms(phoneInput, otp, "reset");
}

const AUTH_OTP_MESSAGE = (
  otp: string,
  purpose: "login" | "register" | "reset",
) => {
  if (purpose === "login") {
    return `Your Sarjan Textiles login code is ${otp}. Valid for 10 minutes.`;
  }
  if (purpose === "register") {
    return `Your Sarjan Textiles registration code is ${otp}. Valid for 10 minutes.`;
  }
  return `Your Sarjan Textile password reset code is ${otp}. Valid for 10 minutes.`;
};

/** Login / registration mobile OTP (website). */
export async function sendAuthMobileSms(
  phoneInput: string,
  otp: string,
  purpose: "login" | "register" | "reset" = "login",
): Promise<void> {
  const phone = normalizeMobilePhone(phoneInput);
  if (phone.length !== 10) {
    throw new Error("Valid 10-digit mobile required");
  }

  const devConsole =
    process.env.NODE_ENV === "development" &&
    (process.env.SMS_DEV_CONSOLE_OTP === "1" ||
      process.env.SMS_DEV_CONSOLE_OTP === "true");

  if (devConsole) {
    console.warn(
      `[sarjan-dev] ${purpose} mobile OTP for +91${phone} (not sent): ${otp}`,
    );
    return;
  }

  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const sender = process.env.MSG91_SENDER_ID?.trim() || "SARJANTEXTILES";

  if (!authKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[sarjan-dev] ${purpose} mobile OTP for +91${phone} (MSG91 not configured): ${otp}`,
      );
      return;
    }
    throw new Error(
      "Mobile OTP is not configured. Contact Sarjan Textiles support.",
    );
  }

  const message = AUTH_OTP_MESSAGE(otp, purpose);

  if (msg91TemplateId()) {
    await sendViaMsg91Template(authKey, phone, otp);
    return;
  }

  const params = new URLSearchParams({
    authkey: authKey,
    mobiles: `91${phone}`,
    message,
    sender,
    route: "4",
    country: "91",
  });
  const dltId = dltTemplateId();
  if (dltId) params.set("DLT_TE_ID", dltId);
  const response = await fetch(
    `https://control.msg91.com/api/sendhttp.php?${params.toString()}`,
    { method: "GET" },
  );
  const body = await response.text();
  if (!response.ok || /error/i.test(body)) {
    throw new Error("SMS delivery failed. Try again later.");
  }
}
