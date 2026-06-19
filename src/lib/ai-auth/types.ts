export const REGISTRATION_FIELDS = [
  "companyName",
  "gst",
  "contactPerson",
  "mobile",
  "email",
  "city",
  "state",
] as const;

export type RegistrationField = (typeof REGISTRATION_FIELDS)[number];

export type AuthFlowMode = "register" | "login";

export type AuthFlowPhase = "collecting" | "gst_verify" | "otp" | "done";

export type RegistrationDraft = Partial<Record<RegistrationField, string>>;

export type AuthFlowState = {
  mode: AuthFlowMode;
  phase: AuthFlowPhase;
  fieldIndex: number;
  data: RegistrationDraft;
  /** Email address OTP is sent to (login or registration) */
  otpEmail?: string;
  /** GST verified via official portal captcha */
  gstVerified?: boolean;
  ownerLegalName?: string;
};

export type AuthFlowResult = {
  state: AuthFlowState;
  reply: string;
  readyForOtp?: boolean;
  readyForGstVerify?: boolean;
  otpEmail?: string;
  quickReplies?: string[];
  cancelled?: boolean;
};
