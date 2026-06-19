import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  isPostgresEnabled,
  pgInsertReturning,
  pgQuery,
  pgUpdateReturning,
} from "@/lib/postgres";
import type {
  AiAnalyticsSummary,
  AiChatMessageRow,
  AiChatSessionRow,
  AiLanguage,
  AiMessageRole,
  AiSessionEventType,
  AiSessionStatus,
  AiSource,
  AiUserPreferences,
} from "@/lib/ai-chat/types";

type AiChatDbFile = {
  preferences: Record<string, AiUserPreferences>;
  sessions: AiChatSessionRow[];
  messages: AiChatMessageRow[];
  events: Array<{
    id: string;
    sessionId: string;
    clientId: string;
    eventType: AiSessionEventType;
    productSlug?: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
};

const dbPath = path.join(process.cwd(), "data", "ai-chat-db.json");

const defaultDb: AiChatDbFile = {
  preferences: {},
  sessions: [],
  messages: [],
  events: [],
};

let schemaEnsured = false;

async function ensureAiChatSchema() {
  if (!isPostgresEnabled() || schemaEnsured) return;
  schemaEnsured = true;
  await pgQuery(`
    create table if not exists ai_user_preferences (
      client_id uuid primary key references clients (id) on delete cascade,
      language text not null default 'en' check (language in ('en', 'hi', 'hinglish')),
      updated_at timestamptz not null default now()
    );
    create table if not exists ai_chat_sessions (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null references clients (id) on delete cascade,
      language text not null default 'en' check (language in ('en', 'hi', 'hinglish')),
      source text not null default 'web' check (source in ('web', 'app')),
      status text not null default 'active' check (status in ('active', 'closing', 'closed')),
      state jsonb not null default '{}'::jsonb,
      started_at timestamptz not null default now(),
      ended_at timestamptz,
      last_activity_at timestamptz not null default now(),
      session_duration_seconds integer,
      rating smallint check (rating >= 1 and rating <= 5),
      feedback text,
      products_viewed integer not null default 0,
      products_recommended integer not null default 0,
      add_to_cart_count integer not null default 0,
      orders_placed integer not null default 0
    );
    create table if not exists ai_chat_messages (
      id uuid primary key default gen_random_uuid(),
      session_id uuid not null references ai_chat_sessions (id) on delete cascade,
      role text not null check (role in ('user', 'assistant', 'system')),
      content text not null default '',
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
    create table if not exists ai_session_events (
      id uuid primary key default gen_random_uuid(),
      session_id uuid not null references ai_chat_sessions (id) on delete cascade,
      client_id uuid not null references clients (id) on delete cascade,
      event_type text not null,
      product_slug text,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
  `).catch(() => null);
}

async function readAiChatDb(): Promise<AiChatDbFile> {
  try {
    const raw = await readFile(dbPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AiChatDbFile>;
    return {
      preferences: parsed.preferences ?? {},
      sessions: parsed.sessions ?? [],
      messages: parsed.messages ?? [],
      events: parsed.events ?? [],
    };
  } catch {
    return structuredClone(defaultDb);
  }
}

async function writeAiChatDb(db: AiChatDbFile) {
  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
}

function mapSession(row: Record<string, unknown>): AiChatSessionRow {
  return {
    id: String(row.id),
    clientId: String(row.client_id ?? row.clientId),
    language: String(row.language ?? "en") as AiLanguage,
    source: String(row.source ?? "web") as AiSource,
    status: String(row.status ?? "active") as AiSessionStatus,
    state:
      row.state && typeof row.state === "object"
        ? (row.state as Record<string, unknown>)
        : {},
    startedAt: String(
      row.started_at ?? row.startedAt ?? new Date().toISOString(),
    ),
    endedAt:
      row.ended_at != null
        ? String(row.ended_at)
        : row.endedAt != null
          ? String(row.endedAt)
          : undefined,
    lastActivityAt: String(
      row.last_activity_at ?? row.lastActivityAt ?? new Date().toISOString(),
    ),
    sessionDurationSeconds:
      row.session_duration_seconds != null
        ? Number(row.session_duration_seconds)
        : row.sessionDurationSeconds != null
          ? Number(row.sessionDurationSeconds)
          : undefined,
    rating: row.rating != null ? Number(row.rating) : undefined,
    feedback: row.feedback != null ? String(row.feedback) : undefined,
    productsViewed: Number(row.products_viewed ?? row.productsViewed ?? 0),
    productsRecommended: Number(
      row.products_recommended ?? row.productsRecommended ?? 0,
    ),
    addToCartCount: Number(row.add_to_cart_count ?? row.addToCartCount ?? 0),
    ordersPlaced: Number(row.orders_placed ?? row.ordersPlaced ?? 0),
  };
}

function mapMessage(row: Record<string, unknown>): AiChatMessageRow {
  return {
    id: String(row.id),
    sessionId: String(row.session_id ?? row.sessionId),
    role: String(row.role ?? "assistant") as AiMessageRole,
    content: String(row.content ?? ""),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: String(
      row.created_at ?? row.createdAt ?? new Date().toISOString(),
    ),
  };
}

export async function getAiUserPreferences(
  clientId: string,
): Promise<AiUserPreferences | null> {
  await ensureAiChatSchema();
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      "select client_id, language, updated_at from ai_user_preferences where client_id = $1",
      [clientId],
    );
    if (!rows[0]) return null;
    return {
      clientId: String(rows[0].client_id),
      language: String(rows[0].language) as AiLanguage,
      updatedAt: String(rows[0].updated_at),
    };
  }
  const db = await readAiChatDb();
  return db.preferences[clientId] ?? null;
}

export async function saveAiUserPreferences(
  clientId: string,
  language: AiLanguage,
): Promise<AiUserPreferences> {
  await ensureAiChatSchema();
  const updatedAt = new Date().toISOString();
  if (isPostgresEnabled()) {
    const row = await pgUpsertPreferences(clientId, language);
    return {
      clientId,
      language: row.language as AiLanguage,
      updatedAt: String(row.updated_at),
    };
  }
  const db = await readAiChatDb();
  const prefs = { clientId, language, updatedAt };
  db.preferences[clientId] = prefs;
  await writeAiChatDb(db);
  return prefs;
}

async function pgUpsertPreferences(clientId: string, language: AiLanguage) {
  const { rows } = await pgQuery(
    `insert into ai_user_preferences (client_id, language, updated_at)
     values ($1, $2, now())
     on conflict (client_id) do update
       set language = excluded.language, updated_at = now()
     returning *`,
    [clientId, language],
  );
  return rows[0];
}

export async function createAiChatSession(input: {
  clientId: string;
  language: AiLanguage;
  source: AiSource;
  state?: Record<string, unknown>;
}): Promise<AiChatSessionRow> {
  await ensureAiChatSchema();
  const id = randomUUID();
  const now = new Date().toISOString();
  if (isPostgresEnabled()) {
    const row = await pgInsertReturning("ai_chat_sessions", {
      id,
      client_id: input.clientId,
      language: input.language,
      source: input.source,
      status: "active",
      state: input.state ?? {},
      started_at: now,
      last_activity_at: now,
    });
    return mapSession(
      row ?? {
        id,
        client_id: input.clientId,
        language: input.language,
        source: input.source,
        started_at: now,
        last_activity_at: now,
      },
    );
  }
  const db = await readAiChatDb();
  const session: AiChatSessionRow = {
    id,
    clientId: input.clientId,
    language: input.language,
    source: input.source,
    status: "active",
    state: input.state ?? {},
    startedAt: now,
    lastActivityAt: now,
    productsViewed: 0,
    productsRecommended: 0,
    addToCartCount: 0,
    ordersPlaced: 0,
  };
  db.sessions.unshift(session);
  await writeAiChatDb(db);
  return session;
}

export async function getAiChatSession(
  sessionId: string,
  clientId?: string,
): Promise<AiChatSessionRow | null> {
  await ensureAiChatSchema();
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      clientId
        ? "select * from ai_chat_sessions where id = $1 and client_id = $2"
        : "select * from ai_chat_sessions where id = $1",
      clientId ? [sessionId, clientId] : [sessionId],
    );
    return rows[0] ? mapSession(rows[0]) : null;
  }
  const db = await readAiChatDb();
  const session = db.sessions.find((row) => row.id === sessionId);
  if (!session) return null;
  if (clientId && session.clientId !== clientId) return null;
  return session;
}

export async function touchAiChatSession(
  sessionId: string,
  patch?: Partial<{
    state: Record<string, unknown>;
    status: AiSessionStatus;
  }>,
): Promise<void> {
  await ensureAiChatSchema();
  const now = new Date().toISOString();
  if (isPostgresEnabled()) {
    const updates: Record<string, unknown> = { last_activity_at: now };
    if (patch?.state) updates.state = patch.state;
    if (patch?.status) updates.status = patch.status;
    await pgUpdateReturning("ai_chat_sessions", "id", sessionId, updates);
    return;
  }
  const db = await readAiChatDb();
  const session = db.sessions.find((row) => row.id === sessionId);
  if (!session) return;
  session.lastActivityAt = now;
  if (patch?.state) session.state = patch.state;
  if (patch?.status) session.status = patch.status;
  await writeAiChatDb(db);
}

export async function closeAiChatSession(input: {
  sessionId: string;
  clientId: string;
  rating?: number;
  feedback?: string;
}): Promise<AiChatSessionRow | null> {
  await ensureAiChatSchema();
  const existing = await getAiChatSession(input.sessionId, input.clientId);
  if (!existing) return null;
  const endedAt = new Date();
  const started = new Date(existing.startedAt).getTime();
  const durationSeconds = Math.max(
    0,
    Math.round((endedAt.getTime() - started) / 1000),
  );
  if (isPostgresEnabled()) {
    const row = await pgUpdateReturning(
      "ai_chat_sessions",
      "id",
      input.sessionId,
      {
        status: "closed",
        ended_at: endedAt.toISOString(),
        session_duration_seconds: durationSeconds,
        rating: input.rating ?? existing.rating ?? null,
        feedback: input.feedback?.trim() || existing.feedback || null,
        last_activity_at: endedAt.toISOString(),
      },
    );
    return row ? mapSession(row) : null;
  }
  const db = await readAiChatDb();
  const session = db.sessions.find((row) => row.id === input.sessionId);
  if (!session) return null;
  session.status = "closed";
  session.endedAt = endedAt.toISOString();
  session.sessionDurationSeconds = durationSeconds;
  session.lastActivityAt = endedAt.toISOString();
  if (input.rating != null) session.rating = input.rating;
  if (input.feedback?.trim()) session.feedback = input.feedback.trim();
  await writeAiChatDb(db);
  return session;
}

export async function appendAiChatMessage(input: {
  sessionId: string;
  role: AiMessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<AiChatMessageRow> {
  await ensureAiChatSchema();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  if (isPostgresEnabled()) {
    const row = await pgInsertReturning("ai_chat_messages", {
      id,
      session_id: input.sessionId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? {},
      created_at: createdAt,
    });
    await touchAiChatSession(input.sessionId);
    return mapMessage(
      row ?? {
        id,
        session_id: input.sessionId,
        role: input.role,
        content: input.content,
        created_at: createdAt,
      },
    );
  }
  const db = await readAiChatDb();
  const message: AiChatMessageRow = {
    id,
    sessionId: input.sessionId,
    role: input.role,
    content: input.content,
    metadata: input.metadata ?? {},
    createdAt,
  };
  db.messages.push(message);
  await touchAiChatSession(input.sessionId);
  await writeAiChatDb(db);
  return message;
}

export async function recordAiSessionEvent(input: {
  sessionId: string;
  clientId: string;
  eventType: AiSessionEventType;
  productSlug?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await ensureAiChatSchema();
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  if (isPostgresEnabled()) {
    await pgInsertReturning("ai_session_events", {
      id,
      session_id: input.sessionId,
      client_id: input.clientId,
      event_type: input.eventType,
      product_slug: input.productSlug ?? null,
      metadata: input.metadata ?? {},
      created_at: createdAt,
    });
    await incrementSessionCounter(input.sessionId, input.eventType);
    return;
  }
  const db = await readAiChatDb();
  db.events.push({
    id,
    sessionId: input.sessionId,
    clientId: input.clientId,
    eventType: input.eventType,
    productSlug: input.productSlug,
    metadata: input.metadata ?? {},
    createdAt,
  });
  await incrementSessionCounter(input.sessionId, input.eventType);
  await writeAiChatDb(db);
}

async function incrementSessionCounter(
  sessionId: string,
  eventType: AiSessionEventType,
) {
  const column = counterColumnForEvent(eventType);
  if (!column) return;
  if (isPostgresEnabled()) {
    await pgQuery(
      `update ai_chat_sessions set ${column} = ${column} + 1, last_activity_at = now() where id = $1`,
      [sessionId],
    );
    return;
  }
  const db = await readAiChatDb();
  const session = db.sessions.find((row) => row.id === sessionId);
  if (!session) return;
  if (column === "products_viewed") session.productsViewed += 1;
  if (column === "products_recommended") session.productsRecommended += 1;
  if (column === "add_to_cart_count") session.addToCartCount += 1;
  if (column === "orders_placed") session.ordersPlaced += 1;
  session.lastActivityAt = new Date().toISOString();
  await writeAiChatDb(db);
}

function counterColumnForEvent(eventType: AiSessionEventType): string | null {
  switch (eventType) {
    case "product_viewed":
      return "products_viewed";
    case "product_recommended":
      return "products_recommended";
    case "add_to_cart":
      return "add_to_cart_count";
    case "order_placed":
      return "orders_placed";
    default:
      return null;
  }
}

export async function getAiAnalyticsSummary(
  limit = 20,
): Promise<AiAnalyticsSummary> {
  await ensureAiChatSchema();
  if (isPostgresEnabled()) {
    const { rows: stats } = await pgQuery<{
      total_sessions: string;
      active_sessions: string;
      closed_sessions: string;
      avg_rating: string | null;
      rated_sessions: string;
      products_viewed: string;
      products_recommended: string;
      add_to_cart_count: string;
      orders_placed: string;
      web_sessions: string;
      app_sessions: string;
      en_sessions: string;
      hi_sessions: string;
      hinglish_sessions: string;
    }>(`
      select
        count(*)::text as total_sessions,
        count(*) filter (where status = 'active')::text as active_sessions,
        count(*) filter (where status = 'closed')::text as closed_sessions,
        avg(rating)::text as avg_rating,
        count(*) filter (where rating is not null)::text as rated_sessions,
        coalesce(sum(products_viewed), 0)::text as products_viewed,
        coalesce(sum(products_recommended), 0)::text as products_recommended,
        coalesce(sum(add_to_cart_count), 0)::text as add_to_cart_count,
        coalesce(sum(orders_placed), 0)::text as orders_placed,
        count(*) filter (where source = 'web')::text as web_sessions,
        count(*) filter (where source = 'app')::text as app_sessions,
        count(*) filter (where language = 'en')::text as en_sessions,
        count(*) filter (where language = 'hi')::text as hi_sessions,
        count(*) filter (where language = 'hinglish')::text as hinglish_sessions
      from ai_chat_sessions
    `);
    const { rows: recent } = await pgQuery(
      "select * from ai_chat_sessions order by started_at desc limit $1",
      [limit],
    );
    const row = stats[0];
    return {
      totalSessions: Number(row?.total_sessions ?? 0),
      activeSessions: Number(row?.active_sessions ?? 0),
      closedSessions: Number(row?.closed_sessions ?? 0),
      averageRating: row?.avg_rating != null ? Number(row.avg_rating) : null,
      ratedSessions: Number(row?.rated_sessions ?? 0),
      productsViewed: Number(row?.products_viewed ?? 0),
      productsRecommended: Number(row?.products_recommended ?? 0),
      addToCartEvents: Number(row?.add_to_cart_count ?? 0),
      ordersPlaced: Number(row?.orders_placed ?? 0),
      sessionsBySource: {
        web: Number(row?.web_sessions ?? 0),
        app: Number(row?.app_sessions ?? 0),
      },
      sessionsByLanguage: {
        en: Number(row?.en_sessions ?? 0),
        hi: Number(row?.hi_sessions ?? 0),
        hinglish: Number(row?.hinglish_sessions ?? 0),
      },
      recentSessions: recent.map(mapSession),
    };
  }
  const db = await readAiChatDb();
  const sessions = db.sessions;
  const rated = sessions.filter((s) => s.rating != null);
  const avg =
    rated.length > 0
      ? rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length
      : null;
  return {
    totalSessions: sessions.length,
    activeSessions: sessions.filter((s) => s.status === "active").length,
    closedSessions: sessions.filter((s) => s.status === "closed").length,
    averageRating: avg,
    ratedSessions: rated.length,
    productsViewed: sessions.reduce((sum, s) => sum + s.productsViewed, 0),
    productsRecommended: sessions.reduce(
      (sum, s) => sum + s.productsRecommended,
      0,
    ),
    addToCartEvents: sessions.reduce((sum, s) => sum + s.addToCartCount, 0),
    ordersPlaced: sessions.reduce((sum, s) => sum + s.ordersPlaced, 0),
    sessionsBySource: {
      web: sessions.filter((s) => s.source === "web").length,
      app: sessions.filter((s) => s.source === "app").length,
    },
    sessionsByLanguage: {
      en: sessions.filter((s) => s.language === "en").length,
      hi: sessions.filter((s) => s.language === "hi").length,
      hinglish: sessions.filter((s) => s.language === "hinglish").length,
    },
    recentSessions: sessions.slice(0, limit),
  };
}

export function serializeBotSessionState(session: {
  cart: unknown[];
  lastProducts: unknown[];
  lastCategory?: string;
  focusProductIndex?: number;
  pageContext?: unknown;
}): Record<string, unknown> {
  return {
    cart: session.cart,
    lastProducts: session.lastProducts,
    lastCategory: session.lastCategory,
    focusProductIndex: session.focusProductIndex,
    pageContext: session.pageContext,
  };
}

export function hydrateBotSessionFromState(
  session: {
    cart: unknown[];
    lastProducts: unknown[];
    lastCategory?: string;
    focusProductIndex?: number;
    pageContext?: import("@/lib/ai-chat/page-context").AiPageContext;
  },
  state: Record<string, unknown> | undefined,
) {
  if (!state) return;
  if (Array.isArray(state.cart)) session.cart = state.cart as never[];
  if (Array.isArray(state.lastProducts))
    session.lastProducts = state.lastProducts as never[];
  if (typeof state.lastCategory === "string")
    session.lastCategory = state.lastCategory;
  if (typeof state.focusProductIndex === "number")
    session.focusProductIndex = state.focusProductIndex;
  if (state.pageContext && typeof state.pageContext === "object") {
    session.pageContext =
      state.pageContext as import("@/lib/ai-chat/page-context").AiPageContext;
  }
}
