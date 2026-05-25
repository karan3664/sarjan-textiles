/**
 * Short UI chimes for the order assistant (Web Audio, no external files).
 * Autoplay may be blocked until the user interacts; call unlockOrderBotAudio()
 * from a gesture when needed.
 */

let audioCtx: AudioContext | null = null;

function prefersReducedSound() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  peak = 0.1,
) {
  const master = ctx.createGain();
  master.gain.value = peak;
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(master);

  const t0 = ctx.currentTime + start;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(1, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function runWithContext(play: (ctx: AudioContext) => void): boolean {
  if (prefersReducedSound()) return false;
  const ctx = getAudioContext();
  if (!ctx) return false;

  const start = () => {
    try {
      play(ctx);
    } catch {
      /* ignore */
    }
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(start);
    return false;
  }

  start();
  return true;
}

export function unlockOrderBotAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().catch(() => null);
}

/** Panel opened / assistant ready — friendly ascending chime. */
export function playOrderBotOpenSound(): boolean {
  return runWithContext((ctx) => {
    tone(ctx, 523.25, 0, 0.1, 0.09);
    tone(ctx, 659.25, 0.09, 0.12, 0.09);
    tone(ctx, 783.99, 0.2, 0.16, 0.08);
  });
}

/** Message sent — short tap. */
export function playOrderBotSendSound(): void {
  runWithContext((ctx) => {
    tone(ctx, 440, 0, 0.05, 0.06);
    tone(ctx, 554.37, 0.04, 0.06, 0.04);
  });
}
