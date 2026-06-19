"use client";

import type { AiPageContext } from "@/lib/ai-chat/page-context";

let clientPageContext: AiPageContext | null = null;

export function setClientPageContext(context: AiPageContext | null) {
  clientPageContext = context;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sarjan-ai-page-context"));
  }
}

export function getClientPageContext() {
  return clientPageContext;
}
