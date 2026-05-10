import { createEmailOtpToken, generateEmailOtp, normalizeEmail } from "@/lib/email-otp";
import { readLocalDb } from "@/lib/local-db";
import { sendDomainMail } from "@/lib/mailer";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(String(body.email ?? ""));
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }
    const limit = rateLimit(rateLimitKey(request, "email-otp", email), 3, 60_000);
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const db = await readLocalDb();
    if (db.clients.some((client) => client.email === email)) {
      return Response.json({ error: "Email already registered" }, { status: 400 });
    }

    const otp = generateEmailOtp();
    const otpToken = createEmailOtpToken(email, otp);
    await sendDomainMail({
      to: email,
      subject: "Sarjan Textiles email verification OTP",
      text: [
        `Your Sarjan Textiles verification OTP is ${otp}.`,
        "",
        "This OTP is valid for 10 minutes.",
        "If you did not request this registration, please ignore this email.",
      ].join("\n"),
    });

    return Response.json({ otpToken, message: "OTP sent to email" });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "OTP send failed" }, { status: 500 });
  }
}
