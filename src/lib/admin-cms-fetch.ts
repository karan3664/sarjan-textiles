/** Shared PUT helper for admin CMS editors — consistent cookies + error text. */
export async function putAdminCms<T extends Record<string, unknown>>(
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch("/api/admin/cms", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    if (res.status === 524) {
      throw new Error(
        "Save timed out (524). The server took too long — try again in a moment.",
      );
    }
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : `Save failed (${res.status})`,
    );
  }
  return data;
}

export async function getAdminCms<T = Record<string, unknown>>(): Promise<T> {
  const res = await fetch("/api/admin/cms", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : `Load failed (${res.status})`,
    );
  }
  return data;
}
