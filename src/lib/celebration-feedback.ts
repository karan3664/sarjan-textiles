/**
 * Confetti celebration sound (Web Audio) + short vibration on capable phones.
 * Respects prefers-reduced-motion. Retries audio after user gesture if autoplay blocked.
 */

let audioUnlocked = false;
let audioContext: AudioContext | null = null;

function prefersReducedCelebration() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  return audioContext;
}

/** Short band-limited noise burst — papery confetti rustle. */
function burstNoise(
  ctx: AudioContext,
  start: number,
  opts: { duration: number; gain: number; centerHz: number },
) {
  const { duration, gain, centerHz } = opts;
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    const env = Math.exp(-i / (sampleCount * 0.22));
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = centerHz;
  filter.Q.value = 0.7;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, start);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

/** Tiny pop — party popper crackle. */
function burstPop(ctx: AudioContext, start: number, freq: number) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.35, start + 0.06);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.14, start);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + 0.07);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + 0.08);
}

/** Synthesized confetti / party-popper burst (no external audio file). */
export function playConfettiSound(): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;

  const start = () => {
    const t0 = ctx.currentTime + 0.02;
    const pops = [520, 680, 420, 760, 580, 880, 640];

    pops.forEach((freq, index) => {
      burstPop(ctx, t0 + index * 0.045 + Math.random() * 0.02, freq);
    });

    for (let i = 0; i < 14; i++) {
      burstNoise(ctx, t0 + 0.02 + i * 0.038 + Math.random() * 0.04, {
        duration: 0.05 + Math.random() * 0.04,
        gain: 0.08 + Math.random() * 0.06,
        centerHz: 900 + Math.random() * 2200,
      });
    }

    burstNoise(ctx, t0 + 0.35, {
      duration: 0.18,
      gain: 0.12,
      centerHz: 1400,
    });
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(() => {
      audioUnlocked = true;
      start();
    });
    return false;
  }

  audioUnlocked = true;
  start();
  return true;
}

/** Gentle celebration pulse — only where Vibration API exists (mostly phones). */
export function triggerConfettiVibration() {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate([35, 40, 35, 40, 55, 70]);
  } catch {
    /* ignore unsupported patterns */
  }
}

export type CelebrationFeedbackResult = {
  soundPlayed: boolean;
  vibrationTriggered: boolean;
};

let vibrationFired = false;

function triggerConfettiVibrationOnce() {
  const supported = typeof navigator !== "undefined" && "vibrate" in navigator;
  if (!supported || vibrationFired) return false;
  vibrationFired = true;
  triggerConfettiVibration();
  return true;
}

export function runCelebrationFeedback(): CelebrationFeedbackResult {
  if (prefersReducedCelebration()) {
    return { soundPlayed: false, vibrationTriggered: false };
  }

  const soundPlayed = playConfettiSound();
  const vibrationTriggered = triggerConfettiVibrationOnce();

  return { soundPlayed, vibrationTriggered };
}

/**
 * Call once on mount; if the browser blocks autoplay, the first tap/keypress
 * on the page will play the confetti sound (vibration runs at most once).
 */
export function setupCelebrationFeedbackUnlock(onUnlocked?: () => void) {
  if (prefersReducedCelebration()) return () => {};

  let soundDone = false;

  const trySound = () => {
    if (soundDone) return;
    triggerConfettiVibrationOnce();
    const played = playConfettiSound();
    if (played || audioUnlocked) {
      soundDone = true;
      onUnlocked?.();
      cleanup();
    }
  };

  const onGesture = () => {
    trySound();
  };

  const cleanup = () => {
    document.removeEventListener("pointerdown", onGesture);
    document.removeEventListener("keydown", onGesture);
  };

  trySound();

  if (!soundDone) {
    document.addEventListener("pointerdown", onGesture, { passive: true });
    document.addEventListener("keydown", onGesture);
  }

  return cleanup;
}
