import { authenticateAdmin } from "@/lib/admin-auth";
import {
  createAdminLoginChallenge,
  maskAdminEmail,
} from "@/lib/admin-login-challenge";
import { sendAdminLoginOtp } from "@/lib/admin-login-otp";
import { rateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "").trim();
    if (!email || !password) {
      return Response.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    }

    const limit = await rateLimit(
      rateLimitKey(request, "admin-login", email),
      6,
      60_000,
    );
    if (!limit.allowed) return rateLimitResponse(limit.resetAt);

    const admin = await authenticateAdmin(email, password);
    if (!admin) {
      return Response.json(
        { error: "Invalid admin credentials" },
        { status: 401 },
      );
    }

    const otp = await sendAdminLoginOtp(admin.email);
    const challengeToken = createAdminLoginChallenge(admin);

    return Response.json({
      requiresOtp: true,
      challengeToken,
      otpToken: otp.otpToken,
      email: admin.email,
      maskedEmail: maskAdminEmail(admin.email),
      message: otp.message,
      ...(otp.devOtp ? { devOtp: otp.devOtp } : {}),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Admin login failed" },
      { status: 400 },
    );
  }
}
