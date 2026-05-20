export const DEFAULT_CLIENT_AVATAR =
  "/template/storefront/images/avatar/user-account.jpg";

const AVATAR_CACHE_KEY = "sarjan-avatar-cache";

/** Bust browser cache when the same storage path is overwritten (e.g. `{id}.webp`). */
export function bumpClientAvatarCache() {
  if (typeof window === "undefined") return;
  localStorage.setItem(AVATAR_CACHE_KEY, String(Date.now()));
}

export function hasCustomClientAvatar(avatarUrl?: string | null) {
  return Boolean(avatarUrl?.trim());
}

export function clientAvatarSrc(avatarUrl?: string | null): string {
  const raw = avatarUrl?.trim();
  if (!raw) return DEFAULT_CLIENT_AVATAR;
  const version =
    typeof window !== "undefined"
      ? localStorage.getItem(AVATAR_CACHE_KEY)?.trim()
      : "";
  if (!version) return raw;
  const separator = raw.includes("?") ? "&" : "?";
  return `${raw}${separator}v=${encodeURIComponent(version)}`;
}
