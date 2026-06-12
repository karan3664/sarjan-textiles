import { appendAuditLog } from "@/lib/cms-store";
import { getPromotionAnalytics } from "@/lib/promotion-analytics";
import type { PromotionAd, PromotionPlacement } from "@/lib/promotions-cms";
import {
  deletePromotionAd,
  listPromotionAds,
  savePromotionAds,
  upsertPromotionAd,
} from "@/lib/promotions-store";
import { promotionScheduleActive } from "@/lib/promotions-resolve";
import { getAdminRouteSession } from "@/lib/admin-route-session";

function canManage(role: string) {
  return role === "super_admin" || role === "admin" || role === "content";
}

function normalizeAd(
  raw: Record<string, unknown>,
  existing?: PromotionAd,
): PromotionAd {
  const id = String(raw.id ?? existing?.id ?? `promo-${Date.now()}`).trim();
  return {
    id,
    title: String(raw.title ?? existing?.title ?? "").trim(),
    image: String(raw.image ?? existing?.image ?? "").trim(),
    ctaLabel:
      raw.ctaLabel != null ? String(raw.ctaLabel).trim() : existing?.ctaLabel,
    ctaHref: String(raw.ctaHref ?? existing?.ctaHref ?? "/products").trim(),
    placement: (String(
      raw.placement ?? existing?.placement ?? "web_home",
    ).trim() || "web_home") as PromotionPlacement,
    audience:
      raw.audience === "dealers" || raw.audience === "premium"
        ? raw.audience
        : (existing?.audience ?? "all"),
    startAt: String(
      raw.startAt ?? existing?.startAt ?? new Date().toISOString(),
    ),
    endAt: String(
      raw.endAt ??
        existing?.endAt ??
        new Date(Date.now() + 7 * 86400000).toISOString(),
    ),
    priority: Math.max(
      0,
      Number(raw.priority ?? existing?.priority ?? 50) || 0,
    ),
    enabled: raw.enabled === false ? false : (existing?.enabled ?? true),
  };
}

export async function GET(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session || !canManage(session.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [promotions, analytics] = await Promise.all([
    listPromotionAds(),
    getPromotionAnalytics(),
  ]);

  const rows = promotions.map((ad) => ({
    ...ad,
    status: promotionScheduleActive(ad)
      ? "active"
      : ad.enabled
        ? "scheduled"
        : "disabled",
    metrics: analytics.rows.find((row) => row.adId === ad.id),
  }));

  return Response.json({
    promotions: rows,
    analytics: analytics.rows,
    recentEvents: analytics.recentEvents,
  });
}

export async function PUT(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session || !canManage(session.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const promotions = Array.isArray(body.promotions)
    ? body.promotions.map((entry) =>
        normalizeAd(entry as Record<string, unknown>),
      )
    : null;

  if (!promotions) {
    return Response.json(
      { error: "promotions array required" },
      { status: 400 },
    );
  }

  for (const ad of promotions) {
    if (!ad.title || !ad.image || !ad.ctaHref) {
      return Response.json(
        { error: "Each promotion needs title, image, and CTA link." },
        { status: 400 },
      );
    }
  }

  await savePromotionAds(promotions);
  await appendAuditLog({
    actor: session.email,
    role: session.role,
    action: "save_promotions",
    entity: "promotion",
    note: `${promotions.length} ads`,
  }).catch(() => null);

  return Response.json({ promotions });
}

export async function POST(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session || !canManage(session.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const ad = normalizeAd(body);
  if (!ad.title || !ad.image || !ad.ctaHref) {
    return Response.json(
      { error: "Title, image, and CTA link are required." },
      { status: 400 },
    );
  }

  const saved = await upsertPromotionAd(ad);
  await appendAuditLog({
    actor: session.email,
    role: session.role,
    action: "upsert_promotion",
    entity: "promotion",
    entityId: saved.id,
    after: saved,
  }).catch(() => null);

  return Response.json({ promotion: saved });
}

export async function DELETE(request: Request) {
  const session = await getAdminRouteSession(request);
  if (!session || !canManage(session.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }

  await deletePromotionAd(id);
  await appendAuditLog({
    actor: session.email,
    role: session.role,
    action: "delete_promotion",
    entity: "promotion",
    entityId: id,
  }).catch(() => null);

  return Response.json({ ok: true });
}
