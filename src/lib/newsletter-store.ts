import { randomUUID, createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { assertProductionDatabase } from "@/lib/database-status";

export type NewsletterSubscriber = {
  id: string;
  email: string;
  status: "active" | "unsubscribed";
  unsubscribeToken: string;
  source: string;
  subscribedAt: string;
  unsubscribedAt?: string;
};

export type NewsletterCampaignLog = {
  id: string;
  templateId: string;
  subject: string;
  fields: Record<string, string>;
  sentBy?: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
};

type LocalNewsletterDb = {
  subscribers: NewsletterSubscriber[];
  campaigns: NewsletterCampaignLog[];
};

const dataPath = path.join(
  process.cwd(),
  "data",
  "newsletter-subscribers.json",
);

const defaultDb: LocalNewsletterDb = { subscribers: [], campaigns: [] };

function supabaseAdmin() {
  if (process.env.SUPABASE_ENABLED !== "true") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
  });
}

function newUnsubscribeToken(email: string) {
  return createHash("sha256")
    .update(
      `${email}:${randomUUID()}:${process.env.ADMIN_SESSION_SECRET ?? "sarjan"}`,
    )
    .digest("hex")
    .slice(0, 48);
}

function mapSubscriber(row: Record<string, unknown>): NewsletterSubscriber {
  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? "").toLowerCase(),
    status: row.status === "unsubscribed" ? "unsubscribed" : "active",
    unsubscribeToken: String(
      row.unsubscribe_token ?? row.unsubscribeToken ?? "",
    ),
    source: String(row.source ?? "footer"),
    subscribedAt: String(
      row.subscribed_at ?? row.subscribedAt ?? new Date().toISOString(),
    ),
    unsubscribedAt:
      row.unsubscribed_at != null
        ? String(row.unsubscribed_at)
        : row.unsubscribedAt != null
          ? String(row.unsubscribedAt)
          : undefined,
  };
}

function mapCampaign(row: Record<string, unknown>): NewsletterCampaignLog {
  const fields =
    row.fields && typeof row.fields === "object" && !Array.isArray(row.fields)
      ? (row.fields as Record<string, string>)
      : {};
  return {
    id: String(row.id ?? ""),
    templateId: String(row.template_id ?? row.templateId ?? ""),
    subject: String(row.subject ?? ""),
    fields,
    sentBy: row.sent_by != null ? String(row.sent_by) : undefined,
    recipientCount: Number(row.recipient_count ?? row.recipientCount ?? 0),
    sentCount: Number(row.sent_count ?? row.sentCount ?? 0),
    failedCount: Number(row.failed_count ?? row.failedCount ?? 0),
    createdAt: String(
      row.created_at ?? row.createdAt ?? new Date().toISOString(),
    ),
  };
}

async function readLocalNewsletterDb(): Promise<LocalNewsletterDb> {
  try {
    const raw = await readFile(dataPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalNewsletterDb>;
    return {
      subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : [],
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
    };
  } catch {
    return structuredClone(defaultDb);
  }
}

async function writeLocalNewsletterDb(db: LocalNewsletterDb) {
  assertProductionDatabase();
  await mkdir(path.dirname(dataPath), { recursive: true });
  await writeFile(dataPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

export async function listNewsletterSubscribers(): Promise<
  NewsletterSubscriber[]
> {
  const sb = supabaseAdmin();
  if (sb) {
    const { data, error } = await sb
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      mapSubscriber(row as Record<string, unknown>),
    );
  }
  const db = await readLocalNewsletterDb();
  return [...db.subscribers].sort(
    (a, b) => Date.parse(b.subscribedAt) - Date.parse(a.subscribedAt),
  );
}

export async function listActiveNewsletterSubscribers(): Promise<
  NewsletterSubscriber[]
> {
  const all = await listNewsletterSubscribers();
  return all.filter((s) => s.status === "active");
}

export async function newsletterSubscriberStats() {
  const all = await listNewsletterSubscribers();
  const active = all.filter((s) => s.status === "active").length;
  const unsubscribed = all.filter((s) => s.status === "unsubscribed").length;
  return { total: all.length, active, unsubscribed };
}

export async function subscribeNewsletterEmail(
  email: string,
  source = "footer",
): Promise<{ subscriber: NewsletterSubscriber; created: boolean }> {
  const normalized = email.trim().toLowerCase();
  const sb = supabaseAdmin();

  if (sb) {
    const { data: existing } = await sb
      .from("newsletter_subscribers")
      .select("*")
      .eq("email", normalized)
      .maybeSingle();

    if (existing) {
      const row = existing as Record<string, unknown>;
      if (row.status === "unsubscribed") {
        const token = newUnsubscribeToken(normalized);
        const { data: updated, error } = await sb
          .from("newsletter_subscribers")
          .update({
            status: "active",
            unsubscribe_token: token,
            unsubscribed_at: null,
            subscribed_at: new Date().toISOString(),
            source,
          })
          .eq("id", row.id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return {
          subscriber: mapSubscriber(updated as Record<string, unknown>),
          created: false,
        };
      }
      return {
        subscriber: mapSubscriber(row),
        created: false,
      };
    }

    const token = newUnsubscribeToken(normalized);
    const { data: inserted, error } = await sb
      .from("newsletter_subscribers")
      .insert({
        email: normalized,
        status: "active",
        unsubscribe_token: token,
        source,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return {
      subscriber: mapSubscriber(inserted as Record<string, unknown>),
      created: true,
    };
  }

  const db = await readLocalNewsletterDb();
  const found = db.subscribers.find((s) => s.email === normalized);
  if (found) {
    if (found.status === "unsubscribed") {
      found.status = "active";
      found.unsubscribeToken = newUnsubscribeToken(normalized);
      found.unsubscribedAt = undefined;
      found.subscribedAt = new Date().toISOString();
      found.source = source;
      await writeLocalNewsletterDb(db);
    }
    return { subscriber: found, created: false };
  }

  const subscriber: NewsletterSubscriber = {
    id: randomUUID(),
    email: normalized,
    status: "active",
    unsubscribeToken: newUnsubscribeToken(normalized),
    source,
    subscribedAt: new Date().toISOString(),
  };
  db.subscribers.push(subscriber);
  await writeLocalNewsletterDb(db);
  return { subscriber, created: true };
}

export async function unsubscribeByToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const sb = supabaseAdmin();
  if (sb) {
    const { data, error } = await sb
      .from("newsletter_subscribers")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("unsubscribe_token", trimmed)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapSubscriber(data as Record<string, unknown>) : null;
  }

  const db = await readLocalNewsletterDb();
  const found = db.subscribers.find((s) => s.unsubscribeToken === trimmed);
  if (!found) return null;
  found.status = "unsubscribed";
  found.unsubscribedAt = new Date().toISOString();
  await writeLocalNewsletterDb(db);
  return found;
}

export async function logNewsletterCampaign(input: {
  templateId: string;
  subject: string;
  fields: Record<string, string>;
  sentBy?: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
}) {
  const sb = supabaseAdmin();
  const row = {
    template_id: input.templateId,
    subject: input.subject,
    fields: input.fields,
    sent_by: input.sentBy ?? null,
    recipient_count: input.recipientCount,
    sent_count: input.sentCount,
    failed_count: input.failedCount,
  };

  if (sb) {
    const { data, error } = await sb
      .from("newsletter_campaigns")
      .insert(row)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapCampaign(data as Record<string, unknown>);
  }

  const db = await readLocalNewsletterDb();
  const entry: NewsletterCampaignLog = {
    id: randomUUID(),
    templateId: input.templateId,
    subject: input.subject,
    fields: input.fields,
    sentBy: input.sentBy,
    recipientCount: input.recipientCount,
    sentCount: input.sentCount,
    failedCount: input.failedCount,
    createdAt: new Date().toISOString(),
  };
  db.campaigns.unshift(entry);
  await writeLocalNewsletterDb(db);
  return entry;
}

export async function listRecentNewsletterCampaigns(limit = 20) {
  const sb = supabaseAdmin();
  if (sb) {
    const { data, error } = await sb
      .from("newsletter_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      mapCampaign(row as Record<string, unknown>),
    );
  }
  const db = await readLocalNewsletterDb();
  return db.campaigns.slice(0, limit);
}
