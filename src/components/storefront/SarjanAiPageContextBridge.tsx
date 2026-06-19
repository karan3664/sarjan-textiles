"use client";

import { useEffect } from "react";
import type { AiPageContext } from "@/lib/ai-chat/page-context";
import { setClientPageContext } from "@/lib/ai-chat/page-context-browser";

/** Registers rich page context for Sarjan AI on the current storefront page. */
export function SarjanAiPageContextBridge({
  context,
}: {
  context: AiPageContext;
}) {
  const contextKey = JSON.stringify(context);

  useEffect(() => {
    setClientPageContext(context);
    return () => setClientPageContext(null);
  }, [contextKey, context]);

  return null;
}
