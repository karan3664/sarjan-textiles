import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  if (process.env.SUPABASE_ENABLED !== "true") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

export async function trackVisit(input: {
  visitorId: string;
  path: string;
  referrer?: string;
  userAgent?: string;
}) {
  const supabase = supabaseAdmin();
  if (!supabase) return;
  await supabase.from("analytics_events").insert({
    visitor_id: input.visitorId.slice(0, 80),
    path: input.path.slice(0, 300),
    referrer: input.referrer?.slice(0, 500),
    user_agent: input.userAgent?.slice(0, 500),
  });
}

export async function getWebsiteAnalytics() {
  const supabase = supabaseAdmin();
  if (!supabase) return { totalVisitors: 0, pageViews: 0 };

  try {
    const [{ count: pageViews }, { data }] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true }),
      supabase.from("analytics_events").select("visitor_id").limit(10000),
    ]);
    const uniqueVisitors = new Set(
      (data ?? [])
        .map((row: { visitor_id?: string | null }) => row.visitor_id)
        .filter((id): id is string => Boolean(id)),
    );
    return {
      totalVisitors: uniqueVisitors.size,
      pageViews: pageViews ?? 0,
    };
  } catch {
    return { totalVisitors: 0, pageViews: 0 };
  }
}
