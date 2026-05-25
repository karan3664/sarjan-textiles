import {
  runCelebrationFeedback,
  setupCelebrationFeedbackUnlock,
} from "@/lib/celebration-feedback";

/** Canvas confetti burst — same palette as payment confirmation. */
export function runOrderConfetti() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  void import("canvas-confetti").then(({ default: confetti }) => {
    const colors = ["#9b1c31", "#c9a227", "#2d8f5f", "#181818", "#f5e6dc"];
    const zIndex = 10050;

    confetti({
      particleCount: 90,
      spread: 78,
      startVelocity: 38,
      origin: { x: 0.5, y: 0.52 },
      colors,
      zIndex,
      disableForReducedMotion: true,
    });

    const end = Date.now() + 2200;
    const tick = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 50,
        origin: { x: 0, y: 0.58 },
        colors,
        zIndex,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 50,
        origin: { x: 1, y: 0.58 },
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
