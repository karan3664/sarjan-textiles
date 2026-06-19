"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  clientAuthJsonHeaders,
  hasLocalClientSession,
  clearExpiredClientSession,
  isClientApproved,
  isClientTokenExpired,
  readStoredClientId,
  restoreClientSessionFromCookie,
  validateAndRefreshClientSession,
  persistClientSession,
} from "@/lib/client-auth-browser";
import { clientStatusAuthError } from "@/lib/client-status-auth";
import { readStoredClient } from "@/lib/client-session";
import {
  playOrderBotOpenSound,
  playOrderBotSendSound,
  unlockOrderBotAudio,
} from "@/lib/order-bot-sound";
import { runOrderConfetti } from "@/lib/order-celebration";
import {
  clearOrderBotAutoOpenSuppress,
  isOrderBotAutoOpenSuppressed,
  orderDetailsHref,
  suppressOrderBotAutoOpen,
} from "@/lib/order-bot/order-placed-ui";
import {
  OrderBotCartCards,
  OrderBotCategoryCards,
  OrderBotLanguagePicker,
  OrderBotOrderCards,
  OrderBotProductCards,
  OrderBotRatingPanel,
  OrderBotSalesSuggestions,
  OrderBotCartOptimizationBanner,
  OrderBotAuthOtpPanel,
  OrderBotGstCaptchaPanel,
  type OrderBotProductAction,
} from "@/components/storefront/OrderBotVisuals";
import type {
  BotCartOptimization,
  BotSalesSuggestion,
} from "@/lib/ai-sales/types";
import type { AiLanguage } from "@/lib/ai-chat/types";
import { AI_INACTIVITY_MS } from "@/lib/ai-chat/types";
import {
  readWebAiSessionId,
  writeWebAiSessionId,
} from "@/lib/ai-memory/web-session";
import {
  mapQuickActionToMessage,
  filterQuickActionsForApproved,
} from "@/lib/ai-chat/welcome";
import {
  closeOrderBotSession,
  fetchOrderBotPreferences,
  postOrderBotAction,
  postOrderBotChat,
  postOrderBotVisualSearch,
  saveOrderBotLanguage,
  startOrderBotSession,
} from "@/lib/order-bot-client";
import {
  clearStorefrontCartAfterOrder,
  mirrorStorefrontCartFromBot,
  syncCartWithApi,
} from "@/lib/cart-client";
import type { BotChatResponse, BotNavAction } from "@/lib/order-bot/types";
import {
  authFlowActive,
  authFlowNeedsGstPanel,
  completeGstVerification,
  detectAuthIntent,
  getOtpPromptMessage,
  processAuthMessage,
  registrationFieldQuestion,
  startAuthFlow,
} from "@/lib/ai-auth/flow";
import type { AuthFlowState } from "@/lib/ai-auth/types";
import { REGISTRATION_FIELDS } from "@/lib/ai-auth/types";
import {
  checkRegistrationEmailAvailable,
  loginWithEmailOtp,
  registerViaAgent,
  sendEmailAuthOtp,
} from "@/lib/ai-auth/browser";
import { useOrderBotPageContext } from "@/hooks/useOrderBotPageContext";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  products?: BotChatResponse["products"];
  categoryPreviews?: BotChatResponse["categoryPreviews"];
  cart?: BotChatResponse["cart"];
  cartTotal?: number;
  orders?: BotChatResponse["orders"];
  salesSuggestions?: BotSalesSuggestion[];
  cartOptimization?: BotCartOptimization;
};

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const ASSISTANT_NAME = "Sarjan AI";
const ASSISTANT_TAGLINE = "Products · Orders · Tracking · Help";

const WELCOME_GUEST =
  "Hi! I'm **Sarjan AI**. Say **Register** for a wholesale account or **Login** with your email — one question at a time, no long forms.";

const GUEST_QUICK_REPLIES = ["Register", "Login"];

const LOGIN_REQUIRED_MESSAGE =
  "You are not signed in, or your session expired. Please **sign in** first, then try again.";

type BotAccess =
  | "loading"
  | "guest"
  | "pending"
  | "rejected"
  | "inactive"
  | "approved";

function isOrderBotLoginRequired(res: Response, error?: string) {
  const msg = (error ?? "").toLowerCase();
  return (
    res.status === 401 ||
    (res.status === 404 && msg.includes("client not found")) ||
    msg.includes("valid client token required") ||
    msg.includes("please sign in again")
  );
}

function resolveBotAccess(): BotAccess {
  const client = readStoredClient();
  const clientId = readStoredClientId();
  if (!clientId && !hasLocalClientSession()) return "guest";
  const status = client?.status;
  if (!status || status === "pending") return "pending";
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "inactive";
}

function gateMessage(access: BotAccess): string {
  switch (access) {
    case "guest":
      return "To use Sarjan AI, please **sign in** first (or **register** for a wholesale account). After admin approval you can browse products, cart, and track orders here.";
    case "pending":
      return (
        clientStatusAuthError("pending") ??
        "Your account is under review. You can use Sarjan AI after approval."
      );
    case "rejected":
      return (
        clientStatusAuthError("rejected") ??
        "Your registration could not be approved. Please contact Sarjan Textiles."
      );
    case "inactive":
      return (
        clientStatusAuthError("inactive") ??
        "Your account is not active. Please contact Sarjan Textiles."
      );
    default:
      return "Please sign in from **My Account** to continue.";
  }
}

function renderBotText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

function languageLabel(language: AiLanguage) {
  if (language === "hi") return "हिंदी";
  if (language === "hinglish") return "Hinglish";
  return "English";
}

function languageShortLabel(language: AiLanguage) {
  if (language === "hi") return "HI";
  if (language === "hinglish") return "HIN";
  return "EN";
}

export function OrderBotWidget() {
  const [portalReady, setPortalReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [access, setAccess] = useState<BotAccess>("loading");
  const [canChat, setCanChat] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [language, setLanguage] = useState<AiLanguage>("en");
  const [languageReady, setLanguageReady] = useState(false);
  const [needsLanguagePick, setNeedsLanguagePick] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: WELCOME_GUEST },
  ]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [navActions, setNavActions] = useState<BotNavAction[]>([]);
  const [orderPlacedToastId, setOrderPlacedToastId] = useState("");
  const [authFlow, setAuthFlow] = useState<AuthFlowState | null>(null);
  const [showAuthOtp, setShowAuthOtp] = useState(false);
  const [authOtpToken, setAuthOtpToken] = useState("");
  const [authOtpEmail, setAuthOtpEmail] = useState("");
  const [authOtpLoading, setAuthOtpLoading] = useState(false);
  const [guestQuickReplies, setGuestQuickReplies] =
    useState<string[]>(GUEST_QUICK_REPLIES);
  const scrollRef = useRef<HTMLDivElement>(null);
  const visualSearchInputRef = useRef<HTMLInputElement | null>(null);
  const pageContext = useOrderBotPageContext();
  const autoOpenedRef = useRef(false);
  const orderToastTimerRef = useRef<number | null>(null);
  const inactivityTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef(Date.now());

  const persistSessionId = useCallback((id: string) => {
    setSessionId(id);
    writeWebAiSessionId(id);
  }, []);

  useEffect(() => {
    const saved = readWebAiSessionId();
    if (saved) setSessionId(saved);
  }, []);

  useLayoutEffect(() => {
    setPortalReady(true);
    document.body.classList.add("sarjan-has-order-bot");
    return () => document.body.classList.remove("sarjan-has-order-bot");
  }, []);

  const applyAccessFromLocal = useCallback(() => {
    const nextAccess = resolveBotAccess();
    setAccess(nextAccess);

    if (nextAccess === "approved") {
      setCanChat(hasLocalClientSession());
      setAuthFlow(null);
      setShowAuthOtp(false);
      setAuthOtpToken("");
      setGuestQuickReplies(GUEST_QUICK_REPLIES);
    } else {
      setCanChat(false);
      setQuickReplies([]);
      setNavActions([]);
      setGuestQuickReplies(GUEST_QUICK_REPLIES);
      setMessages((prev) => {
        if (prev.length !== 1 || prev[0]?.id !== "welcome") return prev;
        return [{ id: "welcome", role: "assistant", text: WELCOME_GUEST }];
      });
    }

    setAuthReady(true);
  }, []);

  const syncAccessFromServer = useCallback(async () => {
    try {
      if (hasLocalClientSession()) {
        await validateAndRefreshClientSession();
      } else {
        await restoreClientSessionFromCookie();
      }
    } catch {
      /* keep cached profile when network is unavailable */
    }
    applyAccessFromLocal();
  }, [applyAccessFromLocal]);

  useEffect(() => {
    let cancelled = false;
    const fallback = window.setTimeout(() => {
      if (!cancelled) setAuthReady(true);
    }, 400);
    void syncAccessFromServer().finally(() => {
      if (!cancelled) setAuthReady(true);
      window.clearTimeout(fallback);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, [syncAccessFromServer]);

  useEffect(() => {
    let authTimer: ReturnType<typeof setTimeout> | null = null;
    const onStorage = () => {
      applyAccessFromLocal();
    };
    const onAuth = () => {
      if (authTimer) clearTimeout(authTimer);
      authTimer = setTimeout(() => {
        authTimer = null;
        void syncAccessFromServer();
      }, 0);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("sarjan-auth-updated", onAuth);
    return () => {
      if (authTimer) clearTimeout(authTimer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sarjan-auth-updated", onAuth);
    };
  }, [applyAccessFromLocal, syncAccessFromServer]);

  const accessUi = authReady ? access : "guest";
  const inAuthFlow = authFlowActive(authFlow);
  const showGstVerify = authFlowNeedsGstPanel(authFlow);

  const inputPlaceholder =
    accessUi === "approved"
      ? "Ask about products, orders, or tracking…"
      : accessUi === "guest" && inAuthFlow
        ? "Type your answer…"
        : accessUi === "guest"
          ? "Say Register or Login to start…"
          : "Available after account approval…";

  useEffect(() => {
    return () => {
      if (orderToastTimerRef.current) {
        window.clearTimeout(orderToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (access !== "approved" || !canChat) {
      autoOpenedRef.current = false;
      return;
    }
    if (isOrderBotAutoOpenSuppressed()) return;
    /* Phone / large phone / tablet: keep launcher visible; user opens chat manually */
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 991px)").matches
    ) {
      return;
    }
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    setVisible(true);
    const played = playOrderBotOpenSound();
    if (played) return;

    const retryAfterGesture = () => {
      unlockOrderBotAudio();
      playOrderBotOpenSound();
      document.removeEventListener("pointerdown", retryAfterGesture);
      document.removeEventListener("keydown", retryAfterGesture);
    };
    document.addEventListener("pointerdown", retryAfterGesture);
    document.addEventListener("keydown", retryAfterGesture);
    return () => {
      document.removeEventListener("pointerdown", retryAfterGesture);
      document.removeEventListener("keydown", retryAfterGesture);
    };
  }, [access, canChat]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, visible]);

  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
    }
    if (!visible || access !== "approved" || showRating) return;
    inactivityTimerRef.current = window.setTimeout(() => {
      void sendMessageRef.current?.("__SARJAN_INACTIVITY__");
    }, AI_INACTIVITY_MS);
  }, [visible, access, showRating]);

  const sendMessageRef = useRef<
    ((raw: string, options?: { silent?: boolean }) => Promise<void>) | null
  >(null);

  const bootstrapApprovedSession = useCallback(
    async (options?: { preserveMessages?: boolean }) => {
      if (!hasLocalClientSession()) return;
      try {
        const prefs = await fetchOrderBotPreferences();
        const lang = prefs.language ?? "en";
        setLanguage(lang);
        setNeedsLanguagePick(!prefs.hasPreference);
        setLanguageReady(true);

        if (prefs.hasPreference) {
          const started = await startOrderBotSession({
            language: lang,
            source: "web",
            resumeSessionId: sessionId || readWebAiSessionId() || undefined,
          });
          persistSessionId(started.sessionId);
          setLanguage(started.language ?? lang);
          setSessionReady(true);
          if (started.welcome && !options?.preserveMessages) {
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                text: started.welcome,
              },
            ]);
            setQuickReplies(
              filterQuickActionsForApproved(started.quickActions ?? []),
            );
          } else if (started.quickActions?.length) {
            setQuickReplies(
              filterQuickActionsForApproved(started.quickActions),
            );
          }
        } else {
          setSessionReady(true);
        }
      } catch {
        setLanguageReady(true);
        setSessionReady(true);
      }
    },
    [sessionId, persistSessionId],
  );

  const bootstrapSession = useCallback(
    async (nextLanguage: AiLanguage) => {
      if (!hasLocalClientSession()) return;
      try {
        const started = await startOrderBotSession({
          language: nextLanguage,
          source: "web",
          resumeSessionId: sessionId || undefined,
        });
        persistSessionId(started.sessionId);
        setLanguage(started.language ?? nextLanguage);
        setNeedsLanguagePick(false);
        setSessionReady(true);
        if (started.welcome) {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              text: started.welcome,
            },
          ]);
          setQuickReplies(
            filterQuickActionsForApproved(started.quickActions ?? []),
          );
        }
      } catch {
        setSessionReady(true);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    if (access !== "approved" || !canChat) return;
    let cancelled = false;
    void bootstrapApprovedSession().finally(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [access, canChat, bootstrapApprovedSession]);

  const applyResponse = useCallback((data: BotChatResponse) => {
    if (data.sessionPhase === "awaiting_rating" || data.showRating) {
      setShowRating(true);
    }
    if (data.orderPlaced) {
      clearStorefrontCartAfterOrder();
      void syncCartWithApi();
    } else if (data.cart !== undefined) {
      mirrorStorefrontCartFromBot(data.cart);
    }

    persistSessionId(data.sessionId);
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "assistant",
        text: data.reply,
        products: data.products,
        categoryPreviews: data.categoryPreviews,
        cart: data.cart,
        cartTotal: data.cartTotal,
        orders: data.placedOrder
          ? [data.placedOrder, ...(data.orders ?? [])].filter(
              (order, index, list) =>
                list.findIndex((item) => item.id === order.id) === index,
            )
          : data.orders,
        salesSuggestions: data.salesSuggestions,
        cartOptimization: data.cartOptimization,
      },
    ]);
    setQuickReplies(
      filterQuickActionsForApproved(
        data.quickReplies ?? ["Categories", "My cart", "Place order"],
      ),
    );
    setNavActions(data.navActions ?? []);
  }, []);

  const triggerAuthOtp = useCallback(
    async (flow: AuthFlowState, email: string) => {
      setAuthOtpLoading(true);
      try {
        const { res, data } = await sendEmailAuthOtp({
          email,
          mode: flow.mode,
        });
        if (!res.ok || !data.otpToken) {
          const errorText =
            data.error ??
            (flow.mode === "login"
              ? "If an account exists with this email, a verification code has been sent. Otherwise check the email or register."
              : "Could not send OTP. Please try again.");
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              text: errorText,
            },
          ]);
          setShowAuthOtp(false);
          if (
            flow.mode === "register" &&
            typeof data.error === "string" &&
            /already registered/i.test(data.error)
          ) {
            setAuthFlow(null);
            setAuthOtpToken("");
            setGuestQuickReplies(["Login", "Register"]);
          }
          return;
        }
        setAuthFlow(flow);
        setAuthOtpToken(data.otpToken);
        setAuthOtpEmail(email.trim().toLowerCase());
        setShowAuthOtp(true);
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text: getOtpPromptMessage(language),
          },
        ]);
      } finally {
        setAuthOtpLoading(false);
      }
    },
    [language],
  );

  const handleAuthOtpSubmit = useCallback(
    async (otp: string) => {
      if (!authFlow || !authOtpToken || !authOtpEmail) return;
      setAuthOtpLoading(true);
      try {
        if (authFlow.mode === "login") {
          const { res, data } = await loginWithEmailOtp({
            email: authOtpEmail,
            otp,
            otpToken: authOtpToken,
          });
          if (!res.ok || !data.client) {
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: "assistant",
                text:
                  data.error ?? "Login failed. Check the OTP and try again.",
              },
            ]);
            return;
          }
          persistClientSession("", data.client);
          setShowAuthOtp(false);
          setAuthFlow(null);
          setAuthOtpToken("");
          applyAccessFromLocal();
          await syncAccessFromServer();
          const name = data.client.companyName?.trim() || "there";
          if (data.client.status === "approved") {
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: "assistant",
                text: `Welcome back, **${name}**! You're signed in — ask me about products, cart, or orders.`,
              },
            ]);
            await bootstrapApprovedSession({ preserveMessages: true });
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: nextId(),
                role: "assistant",
                text: `Signed in as **${name}**. ${gateMessage("pending")}`,
              },
            ]);
          }
          setGuestQuickReplies(GUEST_QUICK_REPLIES);
          return;
        }

        const { res, data } = await registerViaAgent({
          draft: authFlow.data,
          otpEmail: authOtpEmail,
          otp,
          otpToken: authOtpToken,
          ownerLegalName: authFlow.ownerLegalName,
          gstPortalVerified: authFlow.gstVerified ?? !authFlow.data.gst,
        });
        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              text: data.error ?? "Registration failed. Please try again.",
            },
          ]);
          return;
        }
        setShowAuthOtp(false);
        setAuthFlow(null);
        setAuthOtpToken("");
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text:
              data.message ??
              "Registration submitted. Your wholesale account is under admin review.",
          },
        ]);
        setGuestQuickReplies(["Login"]);
      } finally {
        setAuthOtpLoading(false);
      }
    },
    [
      bootstrapApprovedSession,
      applyAccessFromLocal,
      authFlow,
      authOtpEmail,
      authOtpToken,
      syncAccessFromServer,
    ],
  );

  const handleAuthOtpResend = useCallback(async () => {
    if (!authFlow || !authOtpEmail) return;
    await triggerAuthOtp(authFlow, authOtpEmail);
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "assistant",
        text: "A fresh OTP has been sent to your email.",
      },
    ]);
  }, [authFlow, authOtpEmail, triggerAuthOtp]);

  const handleGstVerified = useCallback(
    (result: { gst: string; tradeName: string; legalName: string }) => {
      if (!authFlow) return;
      const completed = completeGstVerification(authFlow, result, language);
      setAuthFlow(completed.state);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", text: completed.reply },
      ]);
      setGuestQuickReplies(completed.quickReplies ?? ["Cancel"]);
    },
    [authFlow, language],
  );

  const sendMessage = useCallback(
    async (raw: string, options?: { silent?: boolean }) => {
      const message = raw.trim();
      if (!message || sending) return;

      if (message !== "__SARJAN_INACTIVITY__") {
        resetInactivityTimer();
      }

      if (access !== "approved") {
        setVisible(true);
        unlockOrderBotAudio();

        const normalizedMessage =
          message === "__SARJAN_AUTH_REGISTER__" || message === "Registration"
            ? "Register"
            : message === "__SARJAN_AUTH_LOGIN__"
              ? "Login"
              : message === "Skip"
                ? "skip"
                : message;

        if (
          !options?.silent &&
          message !== "__SARJAN_INACTIVITY__" &&
          message !== "__SARJAN_AUTH_REGISTER__" &&
          message !== "__SARJAN_AUTH_LOGIN__"
        ) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "user",
              text: normalizedMessage === "skip" ? "Skip" : normalizedMessage,
            },
          ]);
        }
        setInput("");

        if (authFlowActive(authFlow)) {
          const prevFlow = authFlow!;
          const emailFieldIndex = REGISTRATION_FIELDS.indexOf("email");
          const result = processAuthMessage(
            prevFlow,
            normalizedMessage,
            language,
          );
          setAuthFlow(result.cancelled ? null : result.state);
          if (result.cancelled) {
            setShowAuthOtp(false);
            setAuthOtpToken("");
          }

          if (result.readyForOtp && result.otpEmail) {
            setGuestQuickReplies(result.quickReplies ?? GUEST_QUICK_REPLIES);
            await triggerAuthOtp(result.state, result.otpEmail);
            return;
          }

          const justCollectedEmail =
            prevFlow.mode === "register" &&
            prevFlow.fieldIndex === emailFieldIndex &&
            !result.cancelled &&
            Boolean(result.state.data.email);

          if (justCollectedEmail && result.state.data.email) {
            const availability = await checkRegistrationEmailAvailable(
              result.state.data.email,
            );
            if (!availability.ok) {
              setAuthFlow({
                ...result.state,
                fieldIndex: emailFieldIndex,
              });
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  role: "assistant",
                  text: availability.error,
                },
                {
                  id: nextId(),
                  role: "assistant",
                  text: registrationFieldQuestion("email", language),
                },
              ]);
              setGuestQuickReplies(["Cancel"]);
              return;
            }
          }

          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", text: result.reply },
          ]);
          setGuestQuickReplies(result.quickReplies ?? GUEST_QUICK_REPLIES);
          return;
        }

        const intent =
          normalizedMessage === "Register"
            ? ("register" as const)
            : normalizedMessage === "Login"
              ? ("login" as const)
              : detectAuthIntent(normalizedMessage);

        if (intent === "register" || intent === "login") {
          const started = startAuthFlow(intent, language);
          setAuthFlow(started.state);
          setShowAuthOtp(false);
          setAuthOtpToken("");
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", text: started.reply },
          ]);
          setGuestQuickReplies(started.quickReplies ?? ["Cancel"]);
          return;
        }

        if (intent === "cancel") {
          setAuthFlow(null);
          setShowAuthOtp(false);
          setAuthOtpToken("");
          setGuestQuickReplies(GUEST_QUICK_REPLIES);
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              text: "Cancelled. Say **Register** or **Login** anytime.",
            },
          ]);
          return;
        }

        if (access !== "guest") {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              text: gateMessage(access === "loading" ? "guest" : access),
            },
          ]);
          return;
        }

        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", text: WELCOME_GUEST },
        ]);
        setGuestQuickReplies(GUEST_QUICK_REPLIES);
        return;
      }

      if (!canChat) {
        const restored = await restoreClientSessionFromCookie();
        if (!restored.ok || !isClientApproved()) {
          const next = resolveBotAccess();
          setAccess(next);
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              text: gateMessage(next === "loading" ? "guest" : next),
            },
          ]);
          setVisible(true);
          return;
        }
        setAccess("approved");
        setCanChat(true);
      }
      unlockOrderBotAudio();
      if (message !== "__SARJAN_INACTIVITY__") {
        playOrderBotSendSound();
      }
      setVisible(true);

      const authChipMessage =
        message === "__SARJAN_AUTH_REGISTER__" || message === "Registration"
          ? "Register"
          : message === "__SARJAN_AUTH_LOGIN__"
            ? "Login"
            : null;

      if (authChipMessage) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "user", text: authChipMessage },
          {
            id: nextId(),
            role: "assistant",
            text: "You're already signed in. Ask me about **products**, **cart**, or **orders**.",
          },
        ]);
        setInput("");
        return;
      }

      if (!options?.silent && message !== "__SARJAN_INACTIVITY__") {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "user", text: message },
        ]);
      }
      setInput("");
      setSending(true);
      try {
        let { res, data } = await postOrderBotChat({
          message,
          sessionId,
          language,
          source: "web",
          pageContext,
        });

        if (res.status === 401) {
          const restored = await restoreClientSessionFromCookie();
          if (restored.ok) {
            ({ res, data } = await postOrderBotChat({
              message,
              sessionId,
              language,
              source: "web",
              pageContext,
            }));
          }
        }

        if (!res.ok) {
          if (isOrderBotLoginRequired(res, data.error)) {
            clearExpiredClientSession();
            setAccess("guest");
            setCanChat(false);
            setNavActions([]);
            setQuickReplies([]);
          }
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              text: isOrderBotLoginRequired(res, data.error)
                ? LOGIN_REQUIRED_MESSAGE
                : (data.error ??
                  (res.status === 401
                    ? LOGIN_REQUIRED_MESSAGE
                    : "Something went wrong. Please try again.")),
            },
          ]);
          return;
        }
        if (data.orderPlaced && data.orderId) {
          applyResponse(data);
          suppressOrderBotAutoOpen();
          autoOpenedRef.current = true;
          setVisible(false);
          setOrderPlacedToastId(data.orderId);
          runOrderConfetti();
          if (orderToastTimerRef.current) {
            window.clearTimeout(orderToastTimerRef.current);
          }
          orderToastTimerRef.current = window.setTimeout(() => {
            setOrderPlacedToastId("");
            orderToastTimerRef.current = null;
          }, 20000);
          return;
        }
        applyResponse(data);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "";
        const isOffline =
          detail.includes("Failed to fetch") ||
          detail.includes("NetworkError") ||
          detail.includes("Load failed");
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text: isOffline
              ? "Network error. Check your connection and try again."
              : detail || "Something went wrong. Please try again.",
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [
      access,
      applyResponse,
      authFlow,
      canChat,
      language,
      resetInactivityTimer,
      sending,
      sessionId,
      triggerAuthOtp,
    ],
  );

  sendMessageRef.current = sendMessage;

  const handleVisualSearchUpload = useCallback(
    async (file: File) => {
      if (!file || sending || access !== "approved" || !sessionReady) return;
      if (!sessionId) return;

      resetInactivityTimer();
      unlockOrderBotAudio();
      playOrderBotSendSound();
      setVisible(true);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "user",
          text: `📷 Photo: ${file.name}`,
        },
      ]);
      setSending(true);
      try {
        let { res, data } = await postOrderBotVisualSearch({
          file,
          sessionId,
          language,
          source: "web",
        });

        if (res.status === 401) {
          const restored = await restoreClientSessionFromCookie();
          if (restored.ok) {
            ({ res, data } = await postOrderBotVisualSearch({
              file,
              sessionId,
              language,
              source: "web",
            }));
          }
        }

        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              text:
                data.error ??
                "Could not search by photo. Try a clearer image under 6MB.",
            },
          ]);
          return;
        }
        applyResponse(data);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text: "Could not search by photo. Please try again.",
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [
      access,
      applyResponse,
      language,
      resetInactivityTimer,
      sending,
      sessionId,
      sessionReady,
    ],
  );

  const handleProductAction = useCallback(
    async (payload: OrderBotProductAction) => {
      if (!sessionId || sending) return;
      setSending(true);
      resetInactivityTimer();
      try {
        const { res, data } = await postOrderBotAction({
          sessionId,
          ...payload,
          language,
          source: "web",
          pageContext,
        });
        if (!res.ok) {
          const errorText =
            "error" in data && typeof data.error === "string"
              ? data.error
              : "Could not update cart.";
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              text: errorText,
            },
          ]);
          return;
        }
        applyResponse(data as BotChatResponse);
      } finally {
        setSending(false);
      }
    },
    [
      applyResponse,
      language,
      pageContext,
      resetInactivityTimer,
      sending,
      sessionId,
    ],
  );

  const handleLanguageSelect = useCallback(
    async (nextLanguage: AiLanguage) => {
      const isInitialPick = needsLanguagePick;
      setLanguage(nextLanguage);
      setShowLanguageMenu(false);
      try {
        await saveOrderBotLanguage(nextLanguage);
      } catch {
        /* keep local selection */
      }
      setLanguageReady(true);
      setNeedsLanguagePick(false);

      if (isInitialPick || !sessionReady || !sessionId) {
        await bootstrapSession(nextLanguage);
        return;
      }

      try {
        const started = await startOrderBotSession({
          language: nextLanguage,
          source: "web",
        });
        persistSessionId(started.sessionId);
        setLanguage(started.language ?? nextLanguage);
        setSessionReady(true);
        const label = languageLabel(nextLanguage);
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text: started.welcome
              ? `Language switched to **${label}**.\n\n${started.welcome}`
              : `Language switched to **${label}**. Continue chatting in your preferred language.`,
          },
        ]);
        if (started.quickActions?.length) {
          setQuickReplies(filterQuickActionsForApproved(started.quickActions));
        }
      } catch {
        setSessionReady(true);
      }
    },
    [bootstrapSession, needsLanguagePick, sessionId, sessionReady],
  );

  const handleRatingSubmit = useCallback(
    async (rating: number, feedback: string) => {
      if (!sessionId) return;
      setSending(true);
      try {
        await closeOrderBotSession({
          sessionId,
          action: "rate",
          rating,
          feedback,
        });
        setShowRating(false);
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            text: "Thank you for your feedback. Session closed.",
          },
        ]);
        setQuickReplies([]);
      } finally {
        setSending(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    if (visible && sessionReady) resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [visible, sessionReady, resetInactivityTimer]);

  if (!portalReady) return null;

  return createPortal(
    <div
      className="sarjan-order-bot"
      data-open={visible ? "true" : undefined}
      data-access={accessUi}
      aria-live="polite"
    >
      {visible ? (
        <button
          type="button"
          className="sarjan-order-bot-backdrop"
          aria-label="Close chat"
          tabIndex={-1}
          onClick={() => setVisible(false)}
        />
      ) : null}
      {visible ? (
        <div
          className="sarjan-order-bot-panel"
          role="dialog"
          aria-label={ASSISTANT_NAME}
        >
          <header className="sarjan-order-bot-header">
            <div className="sarjan-order-bot-header-text">
              <strong>{ASSISTANT_NAME}</strong>
              <p className="text-caption-1 mb_0 sarjan-order-bot-tagline">
                {ASSISTANT_TAGLINE}
              </p>
            </div>
            <div className="sarjan-order-bot-header-actions">
              {accessUi === "approved" &&
              canChat &&
              sessionReady &&
              !needsLanguagePick ? (
                <button
                  type="button"
                  className={`sarjan-order-bot-lang-toggle${
                    showLanguageMenu ? " is-open" : ""
                  }`}
                  aria-label="Change language"
                  aria-expanded={showLanguageMenu}
                  onClick={() => setShowLanguageMenu((open) => !open)}
                >
                  {languageShortLabel(language)}
                </button>
              ) : null}
              <button
                type="button"
                className="sarjan-order-bot-close"
                aria-label="Close chat"
                onClick={() => {
                  suppressOrderBotAutoOpen();
                  setShowLanguageMenu(false);
                  setVisible(false);
                }}
              >
                ×
              </button>
            </div>
          </header>
          {showLanguageMenu &&
          accessUi === "approved" &&
          canChat &&
          sessionReady &&
          !needsLanguagePick ? (
            <div className="sarjan-order-bot-lang-menu">
              <p className="sarjan-order-bot-lang-menu__label">
                Change language
              </p>
              <OrderBotLanguagePicker
                value={language}
                disabled={sending || authOtpLoading}
                onSelect={(next) => void handleLanguageSelect(next)}
              />
            </div>
          ) : null}
          <div className="sarjan-order-bot-scroll">
            <div className="sarjan-order-bot-messages" ref={scrollRef}>
              {accessUi !== "approved" &&
              accessUi !== "loading" &&
              accessUi !== "guest" ? (
                <div className="sarjan-order-bot-bubble sarjan-order-bot-bubble--assistant sarjan-order-bot-gate">
                  {renderBotText(gateMessage(accessUi))}
                </div>
              ) : null}
              {accessUi === "approved" && !canChat ? (
                <div className="sarjan-order-bot-bubble sarjan-order-bot-bubble--assistant">
                  Connecting your session… If this stays, refresh the page or
                  open **My Account** once.
                </div>
              ) : null}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`sarjan-order-bot-bubble sarjan-order-bot-bubble--${msg.role}${
                    msg.role === "assistant" &&
                    (msg.products?.length ||
                      msg.salesSuggestions?.length ||
                      msg.cartOptimization ||
                      msg.categoryPreviews?.length ||
                      msg.cart?.length ||
                      msg.orders?.length)
                      ? " sarjan-order-bot-bubble--rich"
                      : ""
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <>
                      {renderBotText(msg.text)}
                      {msg.categoryPreviews?.length ? (
                        <OrderBotCategoryCards
                          categories={msg.categoryPreviews}
                        />
                      ) : null}
                      {msg.products?.length ? (
                        <OrderBotProductCards
                          products={msg.products}
                          disabled={sending || !sessionReady}
                          onAction={(payload) =>
                            void handleProductAction(payload)
                          }
                        />
                      ) : null}
                      {msg.salesSuggestions?.length ? (
                        <OrderBotSalesSuggestions
                          suggestions={msg.salesSuggestions}
                          disabled={sending || !sessionReady}
                          onAction={(payload) =>
                            void handleProductAction(payload)
                          }
                        />
                      ) : null}
                      {msg.cartOptimization ? (
                        <OrderBotCartOptimizationBanner
                          optimization={msg.cartOptimization}
                        />
                      ) : null}
                      {msg.cart?.length ? (
                        <OrderBotCartCards
                          cart={msg.cart}
                          cartTotal={msg.cartTotal}
                        />
                      ) : null}
                      {msg.orders?.length ? (
                        <OrderBotOrderCards orders={msg.orders} />
                      ) : null}
                    </>
                  ) : (
                    msg.text
                  )}
                </div>
              ))}
              {showRating ? (
                <div className="sarjan-order-bot-bubble sarjan-order-bot-bubble--assistant">
                  <OrderBotRatingPanel
                    disabled={sending}
                    onSubmit={(rating, feedback) =>
                      void handleRatingSubmit(rating, feedback)
                    }
                  />
                </div>
              ) : null}
              {showAuthOtp && authOtpEmail ? (
                <div className="sarjan-order-bot-bubble sarjan-order-bot-bubble--assistant">
                  <OrderBotAuthOtpPanel
                    email={authOtpEmail}
                    disabled={sending}
                    loading={authOtpLoading}
                    onSubmit={(otp) => void handleAuthOtpSubmit(otp)}
                    onResend={() => void handleAuthOtpResend()}
                  />
                </div>
              ) : null}
              {authFlowNeedsGstPanel(authFlow) && authFlow?.data.gst ? (
                <div className="sarjan-order-bot-bubble sarjan-order-bot-bubble--assistant">
                  <OrderBotGstCaptchaPanel
                    gstin={authFlow.data.gst}
                    disabled={sending || authOtpLoading}
                    onVerified={handleGstVerified}
                  />
                </div>
              ) : null}
              {sending ? (
                <div className="sarjan-order-bot-bubble sarjan-order-bot-bubble--assistant">
                  Thinking…
                </div>
              ) : null}
            </div>
          </div>
          {navActions.length ? (
            <div
              className="sarjan-order-bot-nav"
              data-order-placed={orderPlacedToastId ? "true" : undefined}
            >
              {navActions.map((action) => (
                <a
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  className={`sarjan-order-bot-nav-link${
                    orderPlacedToastId &&
                    action.href.includes(orderPlacedToastId)
                      ? " sarjan-order-bot-nav-link--primary"
                      : ""
                  }`}
                >
                  {action.label}
                </a>
              ))}
            </div>
          ) : null}
          {accessUi === "guest" &&
          guestQuickReplies.length &&
          !showAuthOtp &&
          !showGstVerify ? (
            <div className="sarjan-order-bot-quick">
              {guestQuickReplies.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="sarjan-order-bot-chip"
                  disabled={sending || authOtpLoading}
                  onClick={() =>
                    void sendMessage(mapQuickActionToMessage(chip))
                  }
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}
          {accessUi === "approved" &&
          canChat &&
          quickReplies.length &&
          sessionReady ? (
            <div className="sarjan-order-bot-quick">
              {quickReplies.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="sarjan-order-bot-chip"
                  disabled={sending || !canChat || access !== "approved"}
                  onClick={() =>
                    void sendMessage(mapQuickActionToMessage(chip))
                  }
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}
          {accessUi === "approved" && canChat && needsLanguagePick ? (
            <div className="sarjan-order-bot-lang-footer">
              <p className="sarjan-order-bot-lang-footer__label">
                Choose your language to start chatting
              </p>
              <OrderBotLanguagePicker
                value={language}
                disabled={sending || authOtpLoading}
                onSelect={(next) => void handleLanguageSelect(next)}
              />
            </div>
          ) : null}
          {!(accessUi === "approved" && canChat && needsLanguagePick) ? (
            <form
              className="sarjan-order-bot-form"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(input);
              }}
            >
              <input
                ref={visualSearchInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                disabled={
                  sending ||
                  authOtpLoading ||
                  showAuthOtp ||
                  showGstVerify ||
                  accessUi !== "approved" ||
                  !canChat ||
                  !sessionReady ||
                  needsLanguagePick
                }
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void handleVisualSearchUpload(file);
                }}
              />
              {accessUi === "approved" && sessionReady && !needsLanguagePick ? (
                <button
                  type="button"
                  className="sarjan-order-bot-photo"
                  title="Search by photo"
                  aria-label="Search by photo"
                  disabled={
                    sending ||
                    authOtpLoading ||
                    showAuthOtp ||
                    showGstVerify ||
                    !canChat ||
                    !sessionReady
                  }
                  onClick={() => visualSearchInputRef.current?.click()}
                >
                  📷
                </button>
              ) : null}
              <input
                type="text"
                placeholder={inputPlaceholder}
                value={input}
                disabled={
                  sending ||
                  authOtpLoading ||
                  showAuthOtp ||
                  showGstVerify ||
                  (accessUi === "approved"
                    ? !canChat || !sessionReady || needsLanguagePick
                    : accessUi !== "guest")
                }
                onChange={(event) => setInput(event.target.value)}
                autoComplete="off"
              />
              <button
                type="submit"
                className="sarjan-order-bot-send"
                disabled={
                  sending ||
                  authOtpLoading ||
                  showAuthOtp ||
                  showGstVerify ||
                  (accessUi === "approved"
                    ? !canChat || !sessionReady || needsLanguagePick
                    : accessUi !== "guest")
                }
              >
                Send
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
      {orderPlacedToastId && !visible ? (
        <div
          className="sarjan-order-bot-order-toast"
          role="status"
          aria-live="polite"
        >
          <p className="sarjan-order-bot-order-toast__text mb_0">
            Order <strong>{orderPlacedToastId}</strong> placed successfully.
          </p>
          <a
            href={orderDetailsHref(orderPlacedToastId)}
            className="sarjan-order-bot-order-toast__cta"
            onClick={() => {
              setOrderPlacedToastId("");
              if (orderToastTimerRef.current) {
                window.clearTimeout(orderToastTimerRef.current);
                orderToastTimerRef.current = null;
              }
            }}
          >
            View order details
          </a>
          <button
            type="button"
            className="sarjan-order-bot-order-toast__dismiss"
            aria-label="Dismiss"
            onClick={() => {
              setOrderPlacedToastId("");
              if (orderToastTimerRef.current) {
                window.clearTimeout(orderToastTimerRef.current);
                orderToastTimerRef.current = null;
              }
            }}
          >
            ×
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className="sarjan-order-bot-launcher"
        aria-expanded={visible}
        onClick={() => {
          setVisible((open) => {
            const next = !open;
            if (next) {
              clearOrderBotAutoOpenSuppress();
              unlockOrderBotAudio();
              playOrderBotOpenSound();
            } else {
              suppressOrderBotAutoOpen();
            }
            return next;
          });
        }}
      >
        {visible ? "Close" : ASSISTANT_NAME}
      </button>
    </div>,
    document.body,
  );
}
