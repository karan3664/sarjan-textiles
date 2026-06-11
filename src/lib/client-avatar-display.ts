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

function clientAvatarApiPath(
  clientId?: string | null,
  avatarUrl?: string | null,
) {
  const id = clientId?.trim();
  if (id) {
    return `/api/clients/${encodeURIComponent(id)}/avatar`;
  }
  const raw = avatarUrl?.trim() ?? "";
  const match = raw.match(/^\/sarjan-assets\/client-avatars\/([^/.]+)\.webp$/i);
  if (match?.[1]) {
    return `/api/clients/${encodeURIComponent(match[1])}/avatar`;
  }
  return null;
}

function withAvatarCacheBuster(src: string) {
  const version =
    typeof window !== "undefined"
      ? localStorage.getItem(AVATAR_CACHE_KEY)?.trim()
      : "";
  if (!version) return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}v=${encodeURIComponent(version)}`;
}

export function clientAvatarSrc(
  avatarUrl?: string | null,
  clientId?: string | null,
): string {
  if (!hasCustomClientAvatar(avatarUrl)) return DEFAULT_CLIENT_AVATAR;
  const apiPath = clientAvatarApiPath(clientId, avatarUrl);
  if (apiPath) return withAvatarCacheBuster(apiPath);
  return withAvatarCacheBuster(avatarUrl!.trim());
}
