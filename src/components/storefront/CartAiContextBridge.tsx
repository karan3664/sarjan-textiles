"use client";

import { useEffect, useState } from "react";
import { SarjanAiPageContextBridge } from "@/components/storefront/SarjanAiPageContextBridge";
import { readCart } from "@/lib/cart-client";
import { sumOrderPieces } from "@/lib/order-pieces";

function buildCartContext() {
  const items = readCart();
  return {
    kind: "cart" as const,
    path: "/cart",
    cart: {
      lineCount: items.length,
      totalPieces: sumOrderPieces(items),
    },
  };
}

export function CartAiContextBridge() {
  const [context, setContext] = useState(buildCartContext);

  useEffect(() => {
    const refresh = () => setContext(buildCartContext());
    window.addEventListener("sarjan-cart-updated", refresh);
    return () => window.removeEventListener("sarjan-cart-updated", refresh);
  }, []);

  return <SarjanAiPageContextBridge context={context} />;
}
