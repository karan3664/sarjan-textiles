import type { AiLanguage } from "@/lib/ai-chat/types";

export const WELCOME_QUICK_ACTIONS = [
  "Browse Products",
  "Track Orders",
  "Place Order",
  "Registration",
  "Login",
  "Contact Team",
] as const;

export type WelcomeQuickAction = (typeof WELCOME_QUICK_ACTIONS)[number];

const GUEST_ONLY_QUICK_ACTIONS = new Set<WelcomeQuickAction>([
  "Registration",
  "Login",
]);

/** Hide register/login chips once the client is already approved. */
export function filterQuickActionsForApproved(actions: string[]): string[] {
  return actions.filter(
    (action) => !GUEST_ONLY_QUICK_ACTIONS.has(action as WelcomeQuickAction),
  );
}

export function mapQuickActionToMessage(action: string): string {
  switch (action) {
    case "Browse Products":
      return "Browse products";
    case "Track Orders":
      return "Track my orders";
    case "Place Order":
      return "Place order";
    case "Registration":
      return "Register";
    case "Login":
      return "Login";
    case "Contact Team":
      return "Contact team";
    default:
      return action;
  }
}

const WELCOME_COPY: Record<
  AiLanguage,
  {
    greeting: (name: string) => string;
    intro: string;
    prompt: string;
    quickActions: WelcomeQuickAction[];
    closingPrompt: string;
    ratingPrompt: string;
    feedbackPlaceholder: string;
    languagePrompt: string;
  }
> = {
  en: {
    greeting: (name) => `Hello ${name || "there"}`,
    intro: "I am **Sarjan AI**, your wholesale textile assistant.",
    prompt: "How may I help you today?",
    quickActions: [...WELCOME_QUICK_ACTIONS],
    closingPrompt: "Is there anything else I can help you with?",
    ratingPrompt: "Rate your experience",
    feedbackPlaceholder: "Optional feedback (optional)",
    languagePrompt: "Choose your language",
  },
  hi: {
    greeting: (name) => `नमस्ते ${name || "जी"}`,
    intro: "मैं **Sarjan AI** हूँ, आपका wholesale textile assistant.",
    prompt: "आज मैं आपकी कैसे मदद कर सकता हूँ?",
    quickActions: [
      "Browse Products",
      "Track Orders",
      "Place Order",
      "Registration",
      "Login",
      "Contact Team",
    ],
    closingPrompt: "क्या मैं और कुछ मदद कर सकता हूँ?",
    ratingPrompt: "अपना अनुभव रेट करें",
    feedbackPlaceholder: "वैकल्पिक फीडबैक",
    languagePrompt: "अपनी भाषा चुनें",
  },
  hinglish: {
    greeting: (name) => `Hello ${name || "ji"}`,
    intro: "Main **Sarjan AI** hoon, aapka wholesale textile assistant.",
    prompt: "Aaj main aapki kaise madad kar sakta hoon?",
    quickActions: [...WELCOME_QUICK_ACTIONS],
    closingPrompt: "Kya main aur kuch help kar sakta hoon?",
    ratingPrompt: "Apna experience rate karein",
    feedbackPlaceholder: "Optional feedback",
    languagePrompt: "Apni language choose karein",
  },
};

export function buildWelcomeMessage(
  language: AiLanguage,
  clientName?: string,
): { text: string; quickActions: WelcomeQuickAction[] } {
  const copy = WELCOME_COPY[language] ?? WELCOME_COPY.en;
  const name = clientName?.trim() || "";
  const text = [copy.greeting(name), copy.intro, copy.prompt].join("\n\n");
  return { text, quickActions: copy.quickActions };
}

export function welcomeCopy(language: AiLanguage) {
  return WELCOME_COPY[language] ?? WELCOME_COPY.en;
}

export function productsCardsIntro(
  language: AiLanguage,
  count: number,
): string {
  if (language === "hi") {
    return count
      ? `नीचे **${count}** product(s) हैं। **View Details** या quantity buttons से cart में add करें।`
      : "कोई product नहीं मिला। Categories browse करें।";
  }
  if (language === "hinglish") {
    return count
      ? `Neeche **${count}** product(s) hain. **View Details** ya quantity buttons se cart mein add karein.`
      : "Koi product nahi mila. Categories browse karein.";
  }
  return count
    ? `**${count}** product(s) below. Use **View Details** or the quantity buttons to add to cart.`
    : "No products found. Try browsing categories.";
}
