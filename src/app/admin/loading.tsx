import { headers } from "next/headers";

import { AdminLoaderMarkup } from "@/components/admin/AdminGlobalLoader";
import { SARJAN_ADMIN_LOGIN_PAGE_HEADER } from "@/lib/admin-route";

export default async function AdminLoading() {
  const headerStore = await headers();
  if (headerStore.get(SARJAN_ADMIN_LOGIN_PAGE_HEADER) === "1") {
    return null;
  }
  return <AdminLoaderMarkup />;
}
