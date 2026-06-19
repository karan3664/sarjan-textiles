import type { RegistrationDraft } from "@/lib/ai-auth/types";

export async function checkRegistrationEmailAvailable(email: string) {
  const res = await fetch("/api/clients/check-unique", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (res.ok && data.ok) return { ok: true as const };
  return {
    ok: false as const,
    error:
      data.error ??
      "This email is already registered. Sign in or use a different email address.",
  };
}

export async function sendEmailAuthOtp(input: {
  email: string;
  mode: "login" | "register";
}) {
  const res = await fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      mode: input.mode,
    }),
  });
  const data = await res.json();
  return {
    res,
    data: data as {
      otpToken?: string;
      message?: string;
      error?: string;
      devOtp?: string;
    },
  };
}

export async function loginWithEmailOtp(input: {
  email: string;
  otp: string;
  otpToken: string;
}) {
  const res = await fetch("/api/auth/login-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      otp: input.otp,
      otpToken: input.otpToken,
    }),
  });
  const data = await res.json();
  return {
    res,
    data: data as {
      client?: import("@/lib/client-session").StoredClient;
      error?: string;
      code?: string;
    },
  };
}

export async function registerViaAgent(input: {
  draft: RegistrationDraft;
  otpEmail: string;
  otp: string;
  otpToken: string;
  ownerLegalName?: string;
  gstPortalVerified?: boolean;
}) {
  const res = await fetch("/api/auth/agent-register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyName: input.draft.companyName,
      gst: input.draft.gst || undefined,
      contactName: input.draft.contactPerson,
      mobile: input.draft.mobile,
      email: input.draft.email ?? input.otpEmail,
      city: input.draft.city,
      state: input.draft.state,
      ownerLegalName: input.ownerLegalName,
      gstPortalVerified: input.gstPortalVerified ?? false,
      otp: input.otp,
      otpToken: input.otpToken,
    }),
  });
  const data = await res.json();
  return {
    res,
    data: data as {
      ok?: boolean;
      pendingApproval?: boolean;
      message?: string;
      error?: string;
    },
  };
}

/** @deprecated Use sendEmailAuthOtp — kept for any stale imports */
export async function sendMobileAuthOtp(input: {
  email: string;
  mode: "login" | "register";
}) {
  return sendEmailAuthOtp(input);
}

/** @deprecated Use loginWithEmailOtp */
export async function loginWithMobileOtp(input: {
  email: string;
  otp: string;
  otpToken: string;
}) {
  return loginWithEmailOtp(input);
}
