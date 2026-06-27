export const dynamic = "force-dynamic";

import { AdminLoginClient } from "@/components/admin/AdminLoginClient";

const LOGIN_ERRORS: Record<string, string> = {
  invalid: "Invalid admin credentials",
  missing: "Enter email and password",
  otp: "Email verification required. Sign in again.",
};

const DEFAULT_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() || "info@sarjantextiles.com";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    next?: string;
    step?: string;
    challenge?: string;
    otpToken?: string;
    masked?: string;
  }>;
}) {
  const params = await searchParams;
  const errorCode = params.error?.trim() ?? "";
  const message = errorCode ? (LOGIN_ERRORS[errorCode] ?? "Login failed") : "";
  const nextPath = params.next?.startsWith("/admin") ? params.next : "/admin";
  const otpStep = params.step === "otp" && params.challenge && params.otpToken;

  return (
    <main className="sarjan-admin-login">
      <AdminLoginClient
        defaultEmail={DEFAULT_EMAIL}
        nextPath={nextPath}
        initialError={message}
        initialStep={otpStep ? "otp" : "credentials"}
        initialChallengeToken={params.challenge ?? ""}
        initialOtpToken={params.otpToken ?? ""}
        initialMaskedEmail={params.masked ?? ""}
      />
    </main>
  );
}
