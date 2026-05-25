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
  clientAuthToken,
  isClientApproved,
  readStoredClientId,
  restoreClientSessionFromCookie,
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
  OrderBotOrderCards,
  OrderBotProductCards,
} from "@/components/storefront/OrderBotVisuals";
import type { BotChatResponse, BotNavAction } from "@/lib/order-bot/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  products?: BotChatResponse["products"];
  categoryPreviews?: BotChatResponse["categoryPreviews"];
  cart?: BotChatResponse["cart"];
  cartTotal?: number;
  orders?: BotChatResponse["orders"];
};

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const ASSISTANT_NAME = "Sarjan AI";
const ASSISTANT_TAGLINE = "Products · Orders · Tracking · Help";

const WELCOME_APPROVED =
  "Hi! I'm your Sarjan assistant — ask anything about products, bulk orders, or **track my order ST-…** in plain Hindi or English.";

const WELCOME_GUEST =
  "Hi! I'm **Sarjan AI**. Sign in or register as a wholesale client to browse catalog, manage cart, and track orders.";

const GUEST_NAV: BotNavAction[] = [
  { label: "Sign in", href: "/login" },
  { label: "Register", href: "/register" },
];

type BotAccess =
  | "loading"
  | "guest"
  | "pending"
  | "rejected"
  | "inactive"
  | "approved";

function resolveBotAccess(): BotAccess {
  const client = readStoredClient();
  const clientId = readStoredClientId();
  if (!clientId && !clientAuthToken()) return "guest";
  const status = client?.status;
  if (!status || status === "pending") return "pending";
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "inactive";
}

function gateMessage(access: BotAccess): string {
  switch (access) {
    case "guest":
      return "To use Sarjan AI, **sign in** or **register** for a wholesale account. After admin approval you can chat here for products, cart, and order tracking.";
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

async function parseChatResponse(res: Response) {
  const text = await res.text();
  if (!text.trim()) {
    return {
      data: {} as BotChatResponse & { error?: string },
      parseFailed: !res.ok,
    };
  }
  try {
    return {
      data: JSON.parse(text) as BotChatResponse & { error?: string },
      parseFailed: false,
    };
  } catch {
    return {
      data: {
        error: res.ok
          ? "Unexpected server response."
          : `Request failed (${res.status}). Please try again.`,
      } as BotChatResponse & { error?: string },
      parseFailed: true,
    };
  }
}

async function postOrderBotChat(message: string, sessionId: string) {
  const res = await fetch("/api/client/order-bot/chat", {
    method: "POST",
    headers: clientAuthJsonHeaders(),
    credentials: "include",
    body: JSON.stringify({ message, sessionId: sessionId || undefined }),
  });
  const { data } = await parseChatResponse(res);
  return { res, data };
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

export function OrderBotWidget() {
  const [portalReady, setPortalReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [access, setAccess] = useState<BotAccess>("loading");
  const [canChat, setCanChat] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: WELCOME_GUEST },
  ]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [navActions, setNavActions] = useState<BotNavAction[]>([]);
  const [orderPlacedToastId, setOrderPlacedToastId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoOpenedRef = useRef(false);
  const orderToastTimerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    setPortalReady(true);
    document.body.classList.add("sarjan-has-order-bot");
    return () => document.body.classList.remove("sarjan-has-order-bot");
  }, []);

  const syncAccess = useCallback(async () => {
    if (!clientAuthToken()) {
      await restoreClientSessionFromCookie();
    }

    const nextAccess = resolveBotAccess();
    setAccess(nextAccess);

    if (nextAccess === "approved") {
      setMessages((prev) => {
        if (prev.length !== 1 || prev[0]?.id !== "welcome") return prev;
        return [{ id: "welcome", role: "assistant", text: WELCOME_APPROVED }];
      });
      setQuickReplies((prev) =>
        prev.length ? prev : ["Categories", "My cart", "Place order"],
      );
      setCanChat(Boolean(clientAuthToken()));
    } else {
      setCanChat(false);
      setQuickReplies([]);
      setNavActions([]);
      setMessages((prev) => {
        if (prev.length !== 1 || prev[0]?.id !== "welcome") return prev;
        return [{ id: "welcome", role: "assistant", text: WELCOME_GUEST }];
      });
    }

    setAuthReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fallback = window.setTimeout(() => {
      if (!cancelled) setAuthReady(true);
    }, 400);
    void syncAccess().finally(() => {
      if (!cancelled) setAuthReady(true);
      window.clearTimeout(fallback);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, [syncAccess]);

  useEffect(() => {
    const onStorage = () => {
      void syncAccess();
    };
    const onAuth = () => {
      void syncAccess();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("sarjan-auth-updated", onAuth);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sarjan-auth-updated", onAuth);
    };
  }, [syncAccess]);

  const accessUi = authReady ? access : "guest";

  const showGuestNav = accessUi === "guest";
  const inputPlaceholder =
    accessUi === "approved"
      ? "e.g. show Ajrakh, add 1 50 sets, place order"
      : accessUi === "guest"
        ? "Sign in or register to chat…"
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

  const applyResponse = useCallback((data: BotChatResponse) => {
    setSessionId(data.sessionId);
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
      },
    ]);
    setQuickReplies(
      data.quickReplies ?? ["Categories", "My cart", "Place order"],
    );
    setNavActions(data.navActions ?? []);
  }, []);

  const sendMessage = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || sending) return;

      if (access !== "approved") {
        setVisible(true);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "user", text: message },
          {
            id: nextId(),
            role: "assistant",
            text: gateMessage(access === "loading" ? "guest" : access),
          },
        ]);
        setInput("");
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
      playOrderBotSendSound();
      setVisible(true);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", text: message },
      ]);
      setInput("");
      setSending(true);
      try {
        let { res, data } = await postOrderBotChat(message, sessionId);

        if (res.status === 401) {
          const restored = await restoreClientSessionFromCookie();
          if (restored.ok) {
            ({ res, data } = await postOrderBotChat(message, sessionId));
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
                (res.status === 401
                  ? "Session expired. Please sign in again from **My Account**."
                  : "Something went wrong. Please try again."),
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
    [access, applyResponse, canChat, sending, sessionId],
  );

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
            <button
              type="button"
              className="sarjan-order-bot-close"
              aria-label="Close chat"
              onClick={() => setVisible(false)}
            >
              ×
            </button>
          </header>
          <div className="sarjan-order-bot-scroll">
            <div className="sarjan-order-bot-messages" ref={scrollRef}>
              {accessUi !== "approved" && accessUi !== "loading" ? (
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
                        <OrderBotProductCards products={msg.products} />
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
              {sending ? (
                <div className="sarjan-order-bot-bubble sarjan-order-bot-bubble--assistant">
                  Thinking…
                </div>
              ) : null}
            </div>
          </div>
          {showGuestNav || navActions.length ? (
            <div
              className="sarjan-order-bot-nav"
              data-order-placed={orderPlacedToastId ? "true" : undefined}
            >
              {(showGuestNav ? GUEST_NAV : navActions).map((action) => (
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
          {accessUi === "approved" && quickReplies.length ? (
            <div className="sarjan-order-bot-quick">
              {quickReplies.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="sarjan-order-bot-chip"
                  disabled={sending || !canChat}
                  onClick={() => void sendMessage(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}
          <form
            className="sarjan-order-bot-form"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <input
              type="text"
              placeholder={inputPlaceholder}
              value={input}
              disabled={sending || accessUi !== "approved" || !canChat}
              onChange={(event) => setInput(event.target.value)}
              autoComplete="off"
            />
            <button
              type="submit"
              className="sarjan-order-bot-send"
              disabled={sending || accessUi !== "approved" || !canChat}
            >
              Send
            </button>
          </form>
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
