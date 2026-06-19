"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getClientPageContext,
  setClientPageContext,
} from "@/lib/ai-chat/page-context-browser";
import {
  mergePageContext,
  pageKindFromPath,
  type AiPageContext,
} from "@/lib/ai-chat/page-context";

export function useOrderBotPageContext(): AiPageContext | undefined {
  const pathname = usePathname() ?? "/";
  const [bridged, setBridged] = useState<AiPageContext | null>(() =>
    getClientPageContext(),
  );

  useEffect(() => {
    const onUpdate = () => setBridged(getClientPageContext());
    window.addEventListener("sarjan-ai-page-context", onUpdate);
    return () => window.removeEventListener("sarjan-ai-page-context", onUpdate);
  }, []);

  return useMemo(() => {
    const base: AiPageContext = {
      kind: pageKindFromPath(pathname),
      path: pathname,
    };
    return mergePageContext(base, bridged) ?? base;
  }, [bridged, pathname]);
}

/** Clear bridge when navigating away (optional helper for client pages). */
export function clearOrderBotPageContext() {
  setClientPageContext(null);
}
