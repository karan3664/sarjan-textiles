/** Queues confetti bursts until OrderConfettiLayer subscribes (avoids lost events on navigation). */

type BurstListener = () => void;

const listeners = new Set<BurstListener>();
let pendingBursts = 0;

export function requestOrderConfettiBurst() {
  if (listeners.size === 0) {
    pendingBursts += 1;
    return;
  }

  listeners.forEach((listener) => listener());
}

export function subscribeOrderConfettiBurst(listener: BurstListener) {
  listeners.add(listener);

  while (pendingBursts > 0) {
    pendingBursts -= 1;
    listener();
  }

  return () => {
    listeners.delete(listener);
  };
}
