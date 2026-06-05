import { cookies, headers } from "next/headers";
import {
  isAppLocale,
  parseRequestLocale,
  type AppLocale,
} from "@/lib/localized-text";
import { SARJAN_LANG_COOKIE } from "@/lib/locale-cookie";

export async function localeFromHeaders(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(SARJAN_LANG_COOKIE)?.value?.trim();
  const headerStore = await headers();
  return parseRequestLocale(
    headerStore.get("accept-language"),
    cookieLang && isAppLocale(cookieLang) ? cookieLang : null,
  );
}
