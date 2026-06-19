import { isValidGstin, normalizeGstin } from "@/lib/gstin-form";
import { normalizeClientPhone } from "@/lib/client-duplicate-check";
import type { AiLanguage } from "@/lib/ai-chat/types";
import {
  REGISTRATION_FIELDS,
  type AuthFlowMode,
  type AuthFlowResult,
  type AuthFlowState,
  type RegistrationField,
} from "@/lib/ai-auth/types";

const SKIP_GST = /^(skip|no|none|n\/a|na|without|no gst)$/i;
const CANCEL = /^(cancel|stop|exit|quit|back)$/i;

const REGISTER_INTENT =
  /\b(register|registration|sign\s*up|create\s*(an?\s*)?account|wholesale\s*account|new\s*account)\b/i;
const LOGIN_INTENT =
  /\b(login|log\s*in|sign\s*in|signin|existing\s*account)\b/i;

const FIELD_QUESTIONS: Record<RegistrationField, Record<AiLanguage, string>> = {
  companyName: {
    en: "What is your **company / trade name**?",
    hi: "आपकी **company / trade name** क्या है?",
    hinglish: "Aapki **company / trade name** kya hai?",
  },
  gst: {
    en: "What is your **GST number**? (Type **skip** if you don't have one)",
    hi: "आपका **GST number** क्या है? (नहीं है तो **skip** लिखें)",
    hinglish: "Aapka **GST number** kya hai? (Nahi hai to **skip** likhein)",
  },
  contactPerson: {
    en: "Who is the **contact person** for this account?",
    hi: "**Contact person** का नाम बताएं?",
    hinglish: "**Contact person** ka naam batayein?",
  },
  mobile: {
    en: "What is your **10-digit mobile number**?",
    hi: "आपका **10-digit mobile number** बताएं?",
    hinglish: "Aapka **10-digit mobile number** batayein?",
  },
  email: {
    en: "What is your **business email**?",
    hi: "आपका **business email** क्या है?",
    hinglish: "Aapka **business email** kya hai?",
  },
  city: {
    en: "Which **city** is your business in?",
    hi: "आपका business किस **city** में है?",
    hinglish: "Aapka business kis **city** mein hai?",
  },
  state: {
    en: "Which **state** is your business in?",
    hi: "आपका business किस **state** में है?",
    hinglish: "Aapka business kis **state** mein hai?",
  },
};

const START_REGISTER: Record<AiLanguage, string> = {
  en: "Great — I'll register your wholesale account step by step. One question at a time.",
  hi: "ठीक है — मैं step by step wholesale account register karunga. Ek ek question.",
  hinglish: "Theek hai — main step by step wholesale account register karunga.",
};

const START_LOGIN: Record<AiLanguage, string> = {
  en: "Sure — enter your **registered business email** to sign in.",
  hi: "ठीक है — sign in ke liye apna **registered business email** batayein.",
  hinglish:
    "Theek hai — sign in ke liye apna **registered business email** batayein.",
};

const OTP_PROMPT: Record<AiLanguage, string> = {
  en: "I've sent a **6-digit OTP** to your email. Enter it below to verify.",
  hi: "Maine aapke email par **6-digit OTP** bheja hai. Neeche enter karein.",
  hinglish:
    "Maine aapke email par **6-digit OTP** bheja hai. Neeche enter karein.",
};

const GST_VERIFY_PROMPT: Record<AiLanguage, string> = {
  en: "Verify your GST with the **official portal captcha** below (same as our registration page). Enter the 6-digit code from the image, then tap **Verify GST**.",
  hi: "Neeche **official GST portal captcha** se apna GST verify karein. Image ka 6-digit code enter karke **Verify GST** dabayein.",
  hinglish:
    "Neeche **official GST portal captcha** se apna GST verify karein. Image ka 6-digit code enter karke **Verify GST** dabayein.",
};

const GST_VERIFIED: Record<AiLanguage, string> = {
  en: "GST verified successfully.",
  hi: "GST verify ho gaya.",
  hinglish: "GST verify ho gaya.",
};

function copy(language: AiLanguage) {
  return language === "hi" || language === "hinglish" ? language : "en";
}

function question(field: RegistrationField, language: AiLanguage) {
  return FIELD_QUESTIONS[field][copy(language)];
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
}

function isValidMobile(value: string) {
  const digits = normalizeClientPhone(value);
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
}

function normalizeMobile(value: string) {
  return normalizeClientPhone(value);
}

export function getOtpPromptMessage(language: AiLanguage) {
  return OTP_PROMPT[copy(language)];
}

export function registrationFieldQuestion(
  field: RegistrationField,
  language: AiLanguage,
) {
  return question(field, language);
}

export function detectAuthIntent(
  message: string,
): AuthFlowMode | "cancel" | null {
  const trimmed = message.trim();
  if (!trimmed) return null;
  if (CANCEL.test(trimmed)) return "cancel";
  if (REGISTER_INTENT.test(trimmed)) return "register";
  if (LOGIN_INTENT.test(trimmed)) return "login";
  return null;
}

export function createAuthFlow(mode: AuthFlowMode): AuthFlowState {
  return {
    mode,
    phase: "collecting",
    fieldIndex: 0,
    data: {},
  };
}

function validateField(
  field: RegistrationField,
  raw: string,
  language: AiLanguage,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (field === "companyName") {
    if (value.length < 2) {
      return {
        ok: false,
        error:
          copy(language) === "en"
            ? "Please enter a valid company name (at least 2 characters)."
            : "Valid company name enter karein (kam se kam 2 characters).",
      };
    }
    return { ok: true, value };
  }
  if (field === "gst") {
    if (!value || SKIP_GST.test(value)) return { ok: true, value: "" };
    const gst = normalizeGstin(value);
    if (!isValidGstin(gst)) {
      return {
        ok: false,
        error:
          copy(language) === "en"
            ? "Invalid GST format. Enter a valid 15-character GSTIN or type **skip**."
            : "Invalid GST. Valid GSTIN ya **skip** likhein.",
      };
    }
    return { ok: true, value: gst };
  }
  if (field === "contactPerson") {
    if (value.length < 2) {
      return {
        ok: false,
        error:
          copy(language) === "en"
            ? "Please enter the contact person's name."
            : "Contact person ka naam enter karein.",
      };
    }
    return { ok: true, value };
  }
  if (field === "mobile") {
    if (!isValidMobile(value)) {
      return {
        ok: false,
        error:
          copy(language) === "en"
            ? "Enter a valid 10-digit Indian mobile number."
            : "Valid 10-digit mobile number enter karein.",
      };
    }
    return { ok: true, value: normalizeMobile(value) };
  }
  if (field === "email") {
    if (!isValidEmail(value)) {
      return {
        ok: false,
        error:
          copy(language) === "en"
            ? "Enter a valid email address."
            : "Valid email address enter karein.",
      };
    }
    return { ok: true, value: value.trim().toLowerCase() };
  }
  if (field === "city" || field === "state") {
    if (value.length < 2) {
      return {
        ok: false,
        error:
          copy(language) === "en"
            ? `Please enter a valid ${field === "city" ? "city" : "state"}.`
            : `Valid ${field} enter karein.`,
      };
    }
    return { ok: true, value };
  }
  return { ok: true, value };
}

export function processAuthMessage(
  state: AuthFlowState,
  message: string,
  language: AiLanguage,
): AuthFlowResult {
  const lang = copy(language);

  if (CANCEL.test(message.trim())) {
    return {
      state: { ...state, phase: "done" },
      reply:
        lang === "en"
          ? "Cancelled. Say **Register** or **Login** anytime to continue."
          : "Cancel ho gaya. **Register** ya **Login** likh kar dubara shuru karein.",
      cancelled: true,
      quickReplies: ["Register", "Login"],
    };
  }

  if (state.mode === "login") {
    if (!isValidEmail(message)) {
      return {
        state,
        reply:
          lang === "en"
            ? "Enter your **registered business email address**."
            : "Apna **registered business email** enter karein.",
        quickReplies: ["Cancel"],
      };
    }
    const otpEmail = message.trim().toLowerCase();
    return {
      state: { ...state, phase: "otp", otpEmail },
      reply: OTP_PROMPT[lang],
      readyForOtp: true,
      otpEmail,
      quickReplies: ["Cancel"],
    };
  }

  if (state.phase === "gst_verify") {
    return {
      state,
      reply:
        lang === "en"
          ? "Please complete GST verification using the captcha panel below."
          : "Neeche captcha panel se GST verify karein.",
      readyForGstVerify: true,
      quickReplies: ["Cancel"],
    };
  }

  const field = REGISTRATION_FIELDS[state.fieldIndex];
  if (!field) {
    return {
      state,
      reply: OTP_PROMPT[lang],
      readyForOtp: true,
      otpEmail: state.data.email,
    };
  }

  const validated = validateField(field, message, language);
  if (!validated.ok) {
    return {
      state,
      reply: validated.error,
      quickReplies: ["Cancel"],
    };
  }

  const nextData = { ...state.data, [field]: validated.value };

  if (field === "gst" && validated.value) {
    return {
      state: {
        ...state,
        data: nextData,
        phase: "gst_verify",
      },
      reply: GST_VERIFY_PROMPT[lang],
      readyForGstVerify: true,
      quickReplies: ["Cancel"],
    };
  }

  const nextIndex = state.fieldIndex + 1;
  const nextState: AuthFlowState = {
    ...state,
    data: nextData,
    fieldIndex: nextIndex,
  };

  if (nextIndex >= REGISTRATION_FIELDS.length) {
    return {
      state: { ...nextState, phase: "otp", otpEmail: nextData.email },
      reply: OTP_PROMPT[lang],
      readyForOtp: true,
      otpEmail: nextData.email,
      quickReplies: ["Cancel"],
    };
  }

  const nextField = REGISTRATION_FIELDS[nextIndex];
  return {
    state: nextState,
    reply: question(nextField, language),
    quickReplies: nextField === "gst" ? ["Skip", "Cancel"] : ["Cancel"],
  };
}

export function completeGstVerification(
  state: AuthFlowState,
  input: {
    gst: string;
    tradeName: string;
    legalName: string;
  },
  language: AiLanguage,
): AuthFlowResult {
  const lang = copy(language);
  const gstIndex = REGISTRATION_FIELDS.indexOf("gst");
  const nextIndex = gstIndex + 1;
  const nextField = REGISTRATION_FIELDS[nextIndex]!;
  const trade = input.tradeName.trim() || state.data.companyName?.trim() || "";
  const legal = input.legalName.trim();

  return {
    state: {
      ...state,
      phase: "collecting",
      fieldIndex: nextIndex,
      gstVerified: true,
      ownerLegalName: legal || undefined,
      data: {
        ...state.data,
        gst: normalizeGstin(input.gst),
        companyName: trade || legal || state.data.companyName,
      },
    },
    reply: `${GST_VERIFIED[lang]}\n\n${question(nextField, language)}`,
    quickReplies: ["Cancel"],
  };
}

export function startAuthFlow(
  mode: AuthFlowMode,
  language: AiLanguage,
): AuthFlowResult {
  const lang = copy(language);
  const state = createAuthFlow(mode);

  if (mode === "login") {
    return {
      state,
      reply: `${START_LOGIN[lang]}\n\n${FIELD_QUESTIONS.email[lang]}`,
      quickReplies: ["Cancel"],
    };
  }

  return {
    state,
    reply: `${START_REGISTER[lang]}\n\n${question("companyName", language)}`,
    quickReplies: ["Cancel"],
  };
}

export function authFlowActive(state: AuthFlowState | null | undefined) {
  return Boolean(state && state.phase !== "done");
}

export function authFlowNeedsGstPanel(state: AuthFlowState | null | undefined) {
  return Boolean(state && state.phase === "gst_verify" && state.data.gst);
}
