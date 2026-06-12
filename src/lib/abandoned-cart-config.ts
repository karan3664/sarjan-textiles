function envHours(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Hours after last cart change before the first abandoned-cart push. */
export function abandonedCartFirstReminderHours() {
  return envHours("ABANDONED_CART_FIRST_REMINDER_HOURS", 6);
}

/** Hours after last cart change before the second reminder. */
export function abandonedCartSecondReminderHours() {
  return envHours("ABANDONED_CART_SECOND_REMINDER_HOURS", 24);
}

/** Hours between repeat daily nudges once both reminders were sent. */
export function abandonedCartRepeatReminderHours() {
  return envHours("ABANDONED_CART_REPEAT_REMINDER_HOURS", 12);
}
