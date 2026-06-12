import {
  getCmsSnapshot,
  saveCmsSnapshot,
  appendAuditLog,
} from "@/lib/cms-store";
import {
  localizeMobileAppOnSave,
  syncMobileAppExtrasFromHome,
} from "@/lib/mobile-app-cms";
import { localizeHomeOnSave } from "@/lib/content-localize";
import { syncCustomSitePagesToProfileMenus } from "@/lib/custom-site-page-mobile";
import {
  localizeCategoryHubsOnSave,
  localizeCollectionsOnSave,
  localizeCustomSitePagesOnSave,
  localizeProductFiltersOnSave,
  localizeSeoPagesOnSave,
} from "@/lib/pages-localize";
import { normalizeMobileProfileMenus } from "@/lib/mobile-profile-menus";
import {
  asStoredCategoryHubs,
  asStoredCollectionPages,
  asStoredHome,
  asStoredProductFilters,
  asStoredSeoPages,
  adminCmsPutResponse,
  cmsSnapshotForRole,
} from "@/lib/cms-admin-view";
import { getAdminRouteSession } from "@/lib/admin-route-session";

export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const snapshot = await getCmsSnapshot();
  return Response.json(cmsSnapshotForRole(snapshot, session.role));
}

export async function PUT(request: Request) {
  try {
    const session = await getAdminRouteSession(request);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const before = await getCmsSnapshot();
    const mergedHome = body.home
      ? { ...before.home, ...body.home }
      : before.home;

    if (body.home) {
      body.home = asStoredHome(
        await localizeHomeOnSave(mergedHome, before.home),
      );
      body.mobileApp = syncMobileAppExtrasFromHome(
        before.mobileApp,
        before.siteSettings,
        body.home,
      );
    }

    if (body.categoryHubPages) {
      body.categoryHubPages = asStoredCategoryHubs(
        await localizeCategoryHubsOnSave(body.categoryHubPages),
      );
    }

    if (body.collectionPages) {
      body.collectionPages = asStoredCollectionPages(
        await localizeCollectionsOnSave(body.collectionPages),
      );
    }

    if (body.seoPages) {
      body.seoPages = asStoredSeoPages(
        await localizeSeoPagesOnSave(body.seoPages),
      );
    }

    if (body.productFilters) {
      body.productFilters = asStoredProductFilters(
        await localizeProductFiltersOnSave(body.productFilters),
      );
    }

    if (body.customSitePages) {
      body.customSitePages = await localizeCustomSitePagesOnSave(
        body.customSitePages,
      );
      const profileMenus = normalizeMobileProfileMenus(
        body.mobileApp?.profileMenus ?? before.mobileApp.profileMenus,
      );
      body.mobileApp = {
        ...(body.mobileApp ?? before.mobileApp),
        profileMenus: syncCustomSitePagesToProfileMenus(
          body.customSitePages,
          profileMenus,
        ),
      };
    }

    if (body.mobileApp) {
      body.mobileApp = await localizeMobileAppOnSave(
        body.mobileApp,
        before.siteSettings,
        mergedHome,
        before.mobileApp,
      );
    }

    const bodyKeys = Object.keys(body);
    const next = await saveCmsSnapshot(body, before, { light: true });
    void appendAuditLog({
      actor: session.email,
      role: session.role,
      action: "update_cms",
      entity: "cms_snapshot",
      entityId: "main",
      note: bodyKeys.join(", "),
    }).catch(() => null);

    return Response.json(adminCmsPutResponse(next, bodyKeys));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "CMS save failed" },
      { status: 400 },
    );
  }
}
