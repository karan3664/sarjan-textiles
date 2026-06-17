import {
  runCelebrationFeedback,
  setupCelebrationFeedbackUnlock,
} from "@/lib/celebration-feedback";
import { requestOrderConfettiBurst } from "@/lib/order-confetti-bus";

/** Canvas confetti burst — same palette as payment confirmation. */
export function runOrderConfetti() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  requestOrderConfettiBurst();
  window.dispatchEvent(new Event("sarjan:order-confetti"));

  void import("canvas-confetti").then(({ default: confetti }) => {
    const colors = ["#9b1c31", "#c9a227", "#2d8f5f", "#181818", "#f5e6dc"];
    const zIndex = 2147483646;

    confetti({
      particleCount: 110,
      spread: 86,
      startVelocity: 42,
      origin: { x: 0.5, y: 0.45 },
      colors,
      zIndex,
      disableForReducedMotion: true,
    });

    const end = Date.now() + 2600;
    const tick = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.5 },
        colors,
        zIndex,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.5 },
        colors,
        zIndex,
        disableForReducedMotion: true,
      });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  });
}

/** Confetti + optional sound/vibration (manual checkout / order history). */
export function celebrateOrderPlaced() {
  runOrderConfetti();
  runCelebrationFeedback();
  return setupCelebrationFeedbackUnlock();
}
