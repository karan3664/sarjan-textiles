/**
 * Short chime when admin notification unread count increases.
 * Browsers require a user gesture before AudioContext runs; call
 * `unlockAdminNotificationAudio()` from click/pointerdown first.
 */

let audioCtx: AudioContext | null = null;
let lastChimeAt = 0;
const CHIME_MIN_MS = 2200;

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

/** Call from a user gesture (e.g. first click on admin) so polling can play sounds later. */
export function unlockAdminNotificationAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().catch(() => null);
}

export function playAdminNotificationChime(): void {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;
  const now = Date.now();
  if (now - lastChimeAt < CHIME_MIN_MS) return;
  lastChimeAt = now;

  try {
    const master = ctx.createGain();
    master.gain.value = 0.11;
    master.connect(ctx.destination);

    const tone = (freq: number, start: number, duration: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(master);
      const t0 = ctx.currentTime + start;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(1, t0 + 0.018);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      o.start(t0);
      o.stop(t0 + duration + 0.06);
    };

    tone(784, 0, 0.11);
    tone(1046, 0.09, 0.14);
  } catch {
    /* ignore */
  }
}
