"use client";

import { subscribeOrderConfettiBurst } from "@/lib/order-confetti-bus";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const COLORS = [
  "#9b1c31",
  "#c9a227",
  "#2d8f5f",
  "#181818",
  "#f5e6dc",
  "#7a1e2c",
];
const PIECE_COUNT = 80;

type Piece = {
  id: number;
  left: string;
  width: number;
  height: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
};

function buildPieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, id) => ({
    id,
    left: `${Math.random() * 100}%`,
    width: 8 + Math.random() * 10,
    height: 12 + Math.random() * 12,
    color: COLORS[id % COLORS.length] ?? COLORS[0],
    delay: Math.random() * 0.55,
    duration: 2.1 + Math.random() * 1.4,
    drift: (Math.random() - 0.5) * 220,
    rotate: Math.random() * 720 - 360,
  }));
}

/** Full-screen DOM confetti portaled above header/modals. */
export function OrderConfettiLayer() {
  const [burstKey, setBurstKey] = useState(0);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const onBurst = () => {
      setPieces(buildPieces());
      setBurstKey((key) => key + 1);
    };

    const unsubscribe = subscribeOrderConfettiBurst(onBurst);
    window.addEventListener("sarjan:order-confetti", onBurst);
    return () => {
      unsubscribe();
      window.removeEventListener("sarjan:order-confetti", onBurst);
    };
  }, []);

  if (!mounted || burstKey === 0) {
    return null;
  }

  return createPortal(
    <div key={burstKey} className="sarjan-order-confetti-layer" aria-hidden>
      {pieces.map((piece) => (
        <span
          key={`${burstKey}-${piece.id}`}
          className="sarjan-order-confetti-piece"
          style={{
            left: piece.left,
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ["--sarjan-drift" as string]: `${piece.drift}px`,
            ["--sarjan-spin" as string]: `${piece.rotate}deg`,
          }}
        />
      ))}
    </div>,
    document.body,
  );
}
