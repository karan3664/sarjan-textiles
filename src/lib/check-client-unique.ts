import type { ClientDuplicateField } from "@/lib/client-duplicate-check";

export type CheckClientUniqueInput = {
  email?: string;
  phone?: string;
  gst?: string;
  excludeClientId?: string;
};

export type CheckClientUniqueResult =
  | { ok: true }
  | { ok: false; field?: ClientDuplicateField; error: string };

export async function checkClientFieldsUnique(
  fields: CheckClientUniqueInput,
  options?: { authHeaders?: HeadersInit },
): Promise<CheckClientUniqueResult> {
  const res = await fetch("/api/clients/check-unique", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.authHeaders ?? {}),
    },
    body: JSON.stringify(fields),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    field?: ClientDuplicateField;
    error?: string;
  };
  if (res.ok && data.ok) return { ok: true };
  return {
    ok: false,
    field: data.field,
    error: data.error ?? "This value is already in use.",
  };
}
