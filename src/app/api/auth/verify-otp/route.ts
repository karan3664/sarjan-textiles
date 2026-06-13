import { verifyEmailOtpGuarded } from "@/lib/email-otp";
import { rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const verified = await verifyEmailOtpGuarded(
      request,
      String(body.otpToken ?? ""),
      String(body.email ?? ""),
      String(body.otp ?? ""),
    );
    if (!verified.ok) {
      if (verified.status === 429 && verified.resetAt) {
        return rateLimitResponse(verified.resetAt);
      }
      return Response.json(
        { error: verified.error },
        { status: verified.status },
      );
    }
    return Response.json({ verified: true, email: verified.email });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 },
    );
  }
}
