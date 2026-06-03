import { normalizeMobilePhone } from "@/lib/mobile-otp";

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

  const message = `Your Sarjan Textiles login OTP is ${otp}. Valid for 10 minutes.`;

  if (devConsole) {
    console.warn(
      `[sarjan-dev] Mobile OTP for +91${phone} (not sent — SMS_DEV_CONSOLE_OTP): ${otp}`,
    );
    return;
  }

  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const sender = process.env.MSG91_SENDER_ID?.trim() || "SARJAN";

  if (authKey) {
    const params = new URLSearchParams({
      authkey: authKey,
      mobiles: `91${phone}`,
      message,
      sender,
      route: "4",
      country: "91",
    });
    const response = await fetch(
      `https://control.msg91.com/api/sendhttp.php?${params.toString()}`,
      { method: "GET" },
    );
    const body = await response.text();
    if (!response.ok || /error/i.test(body)) {
      throw new Error("SMS delivery failed. Try again later.");
    }
    return;
  }

  throw new Error(
    "SMS is not configured on the server. Set MSG91_AUTH_KEY or SMS_DEV_CONSOLE_OTP for development.",
  );
}
