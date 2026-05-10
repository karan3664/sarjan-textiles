import { verifyEmailOtpToken } from "@/lib/email-otp";

export async function POST(request: Request) {
  const body = await request.json();
  const verified = verifyEmailOtpToken(String(body.otpToken ?? ""), String(body.email ?? ""), String(body.otp ?? ""));
  if (!verified.ok) return Response.json({ error: verified.error }, { status: 400 });
  return Response.json({ verified: true, email: verified.email });
}
