function parseSyncTimestamp(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

/** Last-write-wins merge for client-owned snapshots (cart, wishlist, compare). */
export function resolveSyncedSnapshot<T>(
  local: T,
  server: T,
  localUpdatedAt: string | null,
  serverUpdatedAt: string | null,
  isEmpty: (value: T) => boolean,
): {
  items: T;
  pushLocal: boolean;
  adoptUpdatedAt: string | null;
} {
  const localTime = parseSyncTimestamp(localUpdatedAt);
  const serverTime = parseSyncTimestamp(serverUpdatedAt);
  const samePayload = JSON.stringify(local) === JSON.stringify(server);

  if (samePayload) {
    return {
      items: local,
      pushLocal: false,
      adoptUpdatedAt: serverUpdatedAt ?? localUpdatedAt,
    };
  }

  const serverNeverSaved =
    isEmpty(server) && serverTime <= 0 && !isEmpty(local);

  if (serverNeverSaved) {
    return { items: local, pushLocal: true, adoptUpdatedAt: null };
  }

  if (serverTime > localTime) {
    return {
      items: server,
      pushLocal: false,
      adoptUpdatedAt: serverUpdatedAt,
    };
  }

  if (localTime > serverTime) {
    return { items: local, pushLocal: true, adoptUpdatedAt: null };
  }

  if (isEmpty(local)) {
    return {
      items: server,
      pushLocal: false,
      adoptUpdatedAt: serverUpdatedAt,
    };
  }

  if (isEmpty(server)) {
    if (serverTime > 0) {
      return {
        items: server,
        pushLocal: false,
        adoptUpdatedAt: serverUpdatedAt,
      };
    }
    return {
      items: local,
      pushLocal: !isEmpty(local),
      adoptUpdatedAt: serverUpdatedAt,
    };
  }

  return {
    items: server,
    pushLocal: false,
    adoptUpdatedAt: serverUpdatedAt,
  };
}
