import { cookies } from "next/headers";
import { verifyClientToken } from "@/lib/client-token";

export async function getServerClientSession() {
  const jar = await cookies();
  const token =
    jar.get("sarjan-client-token")?.value?.trim() ||
    jar.get("sarjan_client_token")?.value?.trim() ||
    "";
  return await verifyClientToken(token || null);
}

export async function getServerClientId() {
  return (await getServerClientSession())?.clientId ?? null;
}
