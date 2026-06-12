import path from "path";

/** Writable client avatar files (Coolify volume: /app/public/uploads). */
export function resolveClientAvatarsRoot() {
  return path.join(process.cwd(), "public", "uploads", "client-avatars");
}

export function clientAvatarFilePath(clientId: string) {
  return path.join(resolveClientAvatarsRoot(), `${clientId.trim()}.webp`);
}
