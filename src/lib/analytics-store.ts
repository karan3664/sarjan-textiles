import { isPostgresEnabled, pgQuery } from "@/lib/postgres";

export async function trackVisit(input: {
  visitorId: string;
  path: string;
  referrer?: string;
  userAgent?: string;
}) {
  if (!isPostgresEnabled()) return;
  await pgQuery(
    `insert into analytics_events (visitor_id, path, referrer, user_agent)
     values ($1, $2, $3, $4)`,
    [
      input.visitorId.slice(0, 80),
      input.path.slice(0, 300),
      input.referrer?.slice(0, 500) ?? null,
      input.userAgent?.slice(0, 500) ?? null,
    ],
  );
}

export async function getWebsiteAnalytics() {
  if (!isPostgresEnabled()) {
    return { totalVisitors: 0, pageViews: 0 };
  }

  try {
    const [countRes, visitorsRes] = await Promise.all([
      pgQuery<{ count: string }>(
        "select count(*)::text as count from analytics_events",
      ),
      pgQuery<{ visitor_id: string | null }>(
        "select visitor_id from analytics_events limit 10000",
      ),
    ]);
    const uniqueVisitors = new Set(
      visitorsRes.rows
        .map((row) => row.visitor_id)
        .filter((id): id is string => Boolean(id)),
    );
    return {
      totalVisitors: uniqueVisitors.size,
      pageViews: Number(countRes.rows[0]?.count ?? 0),
    };
  } catch {
    return { totalVisitors: 0, pageViews: 0 };
  }
}
