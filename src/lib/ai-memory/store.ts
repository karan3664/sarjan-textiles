import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { isPostgresEnabled, pgQuery } from "@/lib/postgres";
import type {
  AiMemoryEventType,
  AiMemoryInterestType,
  AiMemoryRecommendationKind,
  AiMemorySource,
  AiUserInterestRow,
  AiUserRecommendationRow,
  TrackAiMemoryInput,
} from "@/lib/ai-memory/types";

type AiMemoryDbFile = {
  interests: AiUserInterestRow[];
  recommendations: AiUserRecommendationRow[];
};

const dbPath = path.join(process.cwd(), "data", "ai-memory-db.json");
const defaultDb: AiMemoryDbFile = { interests: [], recommendations: [] };

let schemaEnsured = false;

function scoreDelta(eventType: AiMemoryEventType) {
  switch (eventType) {
    case "order":
      return 25;
    case "add_to_cart":
      return 12;
    case "product_view":
      return 4;
    case "search":
      return 3;
    default:
      return 1;
  }
}

function buildInterestKey(input: TrackAiMemoryInput) {
  if (input.productSlug?.trim()) {
    return `product:${input.productSlug.trim().toLowerCase()}`;
  }
  if (input.searchQuery?.trim()) {
    return `search:${input.searchQuery.trim().toLowerCase()}`;
  }
  if (input.category?.trim()) {
    return `category:${input.category.trim().toLowerCase()}`;
  }
  return `event:${input.eventType}`;
}

function mergeSources(
  current: AiMemorySource[],
  source: AiMemorySource,
): AiMemorySource[] {
  const set = new Set(current);
  set.add(source);
  return [...set];
}

function mapInterest(row: Record<string, unknown>): AiUserInterestRow {
  const sources = row.sources;
  return {
    id: String(row.id),
    clientId: String(row.client_id ?? row.clientId),
    interestKey: String(row.interest_key ?? row.interestKey),
    interestType: String(
      row.interest_type ?? row.interestType,
    ) as AiMemoryInterestType,
    productSlug:
      row.product_slug != null
        ? String(row.product_slug)
        : row.productSlug != null
          ? String(row.productSlug)
          : undefined,
    category: row.category != null ? String(row.category) : undefined,
    searchQuery:
      row.search_query != null
        ? String(row.search_query)
        : row.searchQuery != null
          ? String(row.searchQuery)
          : undefined,
    quantityTotal: Number(row.quantity_total ?? row.quantityTotal ?? 0),
    orderCount: Number(row.order_count ?? row.orderCount ?? 0),
    score: Number(row.score ?? 0),
    sources: Array.isArray(sources)
      ? (sources.map(String) as AiMemorySource[])
      : [],
    lastSeenAt: String(
      row.last_seen_at ?? row.lastSeenAt ?? new Date().toISOString(),
    ),
    createdAt: String(
      row.created_at ?? row.createdAt ?? new Date().toISOString(),
    ),
  };
}

function mapRecommendation(
  row: Record<string, unknown>,
): AiUserRecommendationRow {
  const slugs = row.product_slugs ?? row.productSlugs;
  const context = row.context ?? {};
  return {
    id: String(row.id),
    clientId: String(row.client_id ?? row.clientId),
    kind: String(row.kind) as AiMemoryRecommendationKind,
    productSlugs: Array.isArray(slugs)
      ? slugs.map(String)
      : typeof slugs === "string"
        ? (JSON.parse(slugs) as string[])
        : [],
    context:
      typeof context === "object" && context
        ? (context as Record<string, unknown>)
        : {},
    source: String(row.source ?? "web") as AiMemorySource,
    expiresAt:
      row.expires_at != null
        ? String(row.expires_at)
        : row.expiresAt != null
          ? String(row.expiresAt)
          : undefined,
    createdAt: String(
      row.created_at ?? row.createdAt ?? new Date().toISOString(),
    ),
    updatedAt: String(
      row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
    ),
  };
}

async function ensureAiMemorySchema() {
  if (!isPostgresEnabled() || schemaEnsured) return;
  schemaEnsured = true;
  await pgQuery(`
    create table if not exists ai_user_interests (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null references clients (id) on delete cascade,
      interest_key text not null,
      interest_type text not null,
      product_slug text,
      category text,
      search_query text,
      quantity_total integer not null default 0,
      order_count integer not null default 0,
      score integer not null default 1,
      sources jsonb not null default '[]'::jsonb,
      last_seen_at timestamptz not null default now(),
      created_at timestamptz not null default now(),
      unique (client_id, interest_key)
    );
  `).catch(() => null);
  await pgQuery(`
    create table if not exists ai_user_recommendations (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null references clients (id) on delete cascade,
      kind text not null,
      product_slugs jsonb not null default '[]'::jsonb,
      context jsonb not null default '{}'::jsonb,
      source text not null default 'web',
      expires_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (client_id, kind)
    );
  `).catch(() => null);
}

async function readMemoryDb(): Promise<AiMemoryDbFile> {
  try {
    const raw = await readFile(dbPath, "utf8");
    return JSON.parse(raw) as AiMemoryDbFile;
  } catch {
    return structuredClone(defaultDb);
  }
}

async function writeMemoryDb(db: AiMemoryDbFile) {
  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
}

export async function trackAiMemoryEvent(
  input: TrackAiMemoryInput,
): Promise<AiUserInterestRow> {
  await ensureAiMemorySchema();
  const now = new Date().toISOString();
  const source = input.source ?? "web";
  const interestKey = buildInterestKey(input);
  const delta = scoreDelta(input.eventType);
  const interestType: AiMemoryInterestType = input.productSlug
    ? input.eventType
    : input.searchQuery
      ? "search"
      : input.category
        ? "category"
        : input.eventType;

  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      `insert into ai_user_interests (
         id, client_id, interest_key, interest_type, product_slug, category,
         search_query, quantity_total, order_count, score, sources, last_seen_at, created_at
       ) values (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $12
       )
       on conflict (client_id, interest_key) do update set
         interest_type = excluded.interest_type,
         product_slug = coalesce(excluded.product_slug, ai_user_interests.product_slug),
         category = coalesce(excluded.category, ai_user_interests.category),
         search_query = coalesce(excluded.search_query, ai_user_interests.search_query),
         quantity_total = ai_user_interests.quantity_total + excluded.quantity_total,
         order_count = ai_user_interests.order_count + excluded.order_count,
         score = ai_user_interests.score + excluded.score,
         sources = (
           select coalesce(jsonb_agg(distinct value), '[]'::jsonb)
           from jsonb_array_elements_text(
             ai_user_interests.sources || excluded.sources
           ) as value
         ),
         last_seen_at = excluded.last_seen_at
       returning *`,
      [
        randomUUID(),
        input.clientId,
        interestKey,
        interestType,
        input.productSlug?.trim() || null,
        input.category?.trim() || null,
        input.searchQuery?.trim() || null,
        Math.max(0, input.quantity ?? 0),
        input.eventType === "order" ? 1 : 0,
        delta,
        JSON.stringify([source]),
        now,
      ],
    );
    return mapInterest(rows[0] ?? {});
  }

  const db = await readMemoryDb();
  const existing = db.interests.find(
    (row) => row.clientId === input.clientId && row.interestKey === interestKey,
  );
  if (existing) {
    existing.interestType = interestType;
    existing.productSlug = input.productSlug?.trim() || existing.productSlug;
    existing.category = input.category?.trim() || existing.category;
    existing.searchQuery = input.searchQuery?.trim() || existing.searchQuery;
    existing.quantityTotal += Math.max(0, input.quantity ?? 0);
    if (input.eventType === "order") existing.orderCount += 1;
    existing.score += delta;
    existing.sources = mergeSources(existing.sources, source);
    existing.lastSeenAt = now;
    await writeMemoryDb(db);
    return existing;
  }

  const created: AiUserInterestRow = {
    id: randomUUID(),
    clientId: input.clientId,
    interestKey,
    interestType,
    productSlug: input.productSlug?.trim() || undefined,
    category: input.category?.trim() || undefined,
    searchQuery: input.searchQuery?.trim() || undefined,
    quantityTotal: Math.max(0, input.quantity ?? 0),
    orderCount: input.eventType === "order" ? 1 : 0,
    score: delta,
    sources: [source],
    lastSeenAt: now,
    createdAt: now,
  };
  db.interests.unshift(created);
  await writeMemoryDb(db);
  return created;
}

export async function listAiUserInterests(
  clientId: string,
  limit = 40,
): Promise<AiUserInterestRow[]> {
  await ensureAiMemorySchema();
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      `select * from ai_user_interests
       where client_id = $1
       order by score desc, last_seen_at desc
       limit $2`,
      [clientId, limit],
    );
    return rows.map(mapInterest);
  }
  const db = await readMemoryDb();
  return db.interests
    .filter((row) => row.clientId === clientId)
    .sort(
      (a, b) => b.score - a.score || b.lastSeenAt.localeCompare(a.lastSeenAt),
    )
    .slice(0, limit);
}

export async function saveAiUserRecommendation(input: {
  clientId: string;
  kind: AiMemoryRecommendationKind;
  productSlugs: string[];
  source?: AiMemorySource;
  context?: Record<string, unknown>;
  ttlHours?: number;
}) {
  await ensureAiMemorySchema();
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = input.ttlHours
    ? new Date(now.getTime() + input.ttlHours * 60 * 60 * 1000).toISOString()
    : null;
  const source = input.source ?? "web";

  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      `insert into ai_user_recommendations (
         id, client_id, kind, product_slugs, context, source, expires_at, created_at, updated_at
       ) values ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $8)
       on conflict (client_id, kind) do update set
         product_slugs = excluded.product_slugs,
         context = excluded.context,
         source = excluded.source,
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at
       returning *`,
      [
        randomUUID(),
        input.clientId,
        input.kind,
        JSON.stringify(input.productSlugs),
        JSON.stringify(input.context ?? {}),
        source,
        expiresAt,
        createdAt,
      ],
    );
    return mapRecommendation(rows[0] ?? {});
  }

  const db = await readMemoryDb();
  const existing = db.recommendations.find(
    (row) => row.clientId === input.clientId && row.kind === input.kind,
  );
  if (existing) {
    existing.productSlugs = input.productSlugs;
    existing.context = input.context ?? {};
    existing.source = source;
    existing.expiresAt = expiresAt ?? undefined;
    existing.updatedAt = createdAt;
    await writeMemoryDb(db);
    return existing;
  }
  const created: AiUserRecommendationRow = {
    id: randomUUID(),
    clientId: input.clientId,
    kind: input.kind,
    productSlugs: input.productSlugs,
    context: input.context ?? {},
    source,
    expiresAt: expiresAt ?? undefined,
    createdAt,
    updatedAt: createdAt,
  };
  db.recommendations.unshift(created);
  await writeMemoryDb(db);
  return created;
}

export async function listAiUserRecommendations(
  clientId: string,
): Promise<AiUserRecommendationRow[]> {
  await ensureAiMemorySchema();
  const now = new Date().toISOString();
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      `select * from ai_user_recommendations
       where client_id = $1
         and (expires_at is null or expires_at > $2)
       order by updated_at desc`,
      [clientId, now],
    );
    return rows.map(mapRecommendation);
  }
  const db = await readMemoryDb();
  return db.recommendations.filter(
    (row) =>
      row.clientId === clientId && (!row.expiresAt || row.expiresAt > now),
  );
}
