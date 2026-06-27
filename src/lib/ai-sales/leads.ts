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
  AiLeadRow,
  AiLeadStatus,
  AiSalesAnalyticsSummary,
  CaptureAiLeadInput,
} from "@/lib/ai-sales/types";
import { sendAiLeadAdminPush } from "@/lib/admin-push-notifications";

type AiSalesDbFile = {
  leads: AiLeadRow[];
};

const dbPath = path.join(process.cwd(), "data", "ai-sales-db.json");
const defaultDb: AiSalesDbFile = { leads: [] };

let schemaEnsured = false;

async function ensureAiSalesSchema() {
  if (!isPostgresEnabled() || schemaEnsured) return;
  schemaEnsured = true;
  await pgQuery(`
    create table if not exists ai_leads (
      id uuid primary key default gen_random_uuid(),
      client_id uuid not null references clients (id) on delete cascade,
      session_id uuid references ai_chat_sessions (id) on delete set null,
      status text not null default 'new' check (status in ('new', 'qualified', 'converted', 'lost')),
      product_interest text,
      product_slugs jsonb not null default '[]'::jsonb,
      quantity_interest integer,
      budget_inr numeric(12, 2),
      source text not null default 'web' check (source in ('web', 'app')),
      notes text,
      converted_order_id text,
      revenue_inr numeric(12, 2),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `).catch(() => null);
}

async function readAiSalesDb(): Promise<AiSalesDbFile> {
  try {
    const raw = await readFile(dbPath, "utf8");
    return JSON.parse(raw) as AiSalesDbFile;
  } catch {
    return structuredClone(defaultDb);
  }
}

async function writeAiSalesDb(db: AiSalesDbFile) {
  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
}

function mapLead(row: Record<string, unknown>): AiLeadRow {
  const slugs = row.product_slugs ?? row.productSlugs;
  return {
    id: String(row.id),
    clientId: String(row.client_id ?? row.clientId),
    sessionId:
      row.session_id != null
        ? String(row.session_id)
        : row.sessionId != null
          ? String(row.sessionId)
          : undefined,
    status: String(row.status ?? "new") as AiLeadStatus,
    intentType:
      row.intent_type != null
        ? (String(row.intent_type) as AiLeadRow["intentType"])
        : row.intentType != null
          ? (String(row.intentType) as AiLeadRow["intentType"])
          : "purchase_intent",
    productInterest:
      row.product_interest != null
        ? String(row.product_interest)
        : row.productInterest != null
          ? String(row.productInterest)
          : undefined,
    interestedProduct:
      row.interested_product != null
        ? String(row.interested_product)
        : row.interestedProduct != null
          ? String(row.interestedProduct)
          : undefined,
    productSlugs: Array.isArray(slugs)
      ? slugs.map(String)
      : typeof slugs === "string"
        ? (JSON.parse(slugs) as string[])
        : [],
    quantityInterest:
      row.quantity_interest != null
        ? Number(row.quantity_interest)
        : row.quantityInterest != null
          ? Number(row.quantityInterest)
          : undefined,
    budgetInr:
      row.budget_inr != null
        ? Number(row.budget_inr)
        : row.budgetInr != null
          ? Number(row.budgetInr)
          : undefined,
    source: String(row.source ?? "web") as AiLeadRow["source"],
    notes: row.notes != null ? String(row.notes) : undefined,
    convertedOrderId:
      row.converted_order_id != null
        ? String(row.converted_order_id)
        : row.convertedOrderId != null
          ? String(row.convertedOrderId)
          : undefined,
    revenueInr:
      row.revenue_inr != null
        ? Number(row.revenue_inr)
        : row.revenueInr != null
          ? Number(row.revenueInr)
          : undefined,
    createdAt: String(
      row.created_at ?? row.createdAt ?? new Date().toISOString(),
    ),
    updatedAt: String(
      row.updated_at ?? row.updatedAt ?? new Date().toISOString(),
    ),
  };
}

export async function captureAiLead(
  input: CaptureAiLeadInput,
): Promise<AiLeadRow> {
  await ensureAiSalesSchema();
  const id = randomUUID();
  const now = new Date().toISOString();
  const row = {
    id,
    client_id: input.clientId,
    session_id: input.sessionId ?? null,
    status: input.status ?? "new",
    intent_type: input.intentType ?? "purchase_intent",
    product_interest: input.productInterest?.trim() || null,
    interested_product: input.interestedProduct?.trim() || null,
    product_slugs: input.productSlugs ?? [],
    quantity_interest: input.quantityInterest ?? null,
    budget_inr: input.budgetInr ?? null,
    source: input.source ?? "web",
    notes: input.notes?.trim() || null,
    created_at: now,
    updated_at: now,
  };

  if (isPostgresEnabled()) {
    const saved = await pgInsertReturning("ai_leads", row);
    const lead = mapLead(saved ?? row);
    sendAiLeadAdminPush({
      id: lead.id,
      clientId: lead.clientId,
      productInterest: lead.productInterest,
      budgetInr: lead.budgetInr,
      intentType: lead.intentType,
    });
    return lead;
  }

  const db = await readAiSalesDb();
  const lead = mapLead(row);
  db.leads.unshift(lead);
  await writeAiSalesDb(db);
  sendAiLeadAdminPush({
    id: lead.id,
    clientId: lead.clientId,
    productInterest: lead.productInterest,
    budgetInr: lead.budgetInr,
    intentType: lead.intentType,
  });
  return lead;
}

export async function markAiLeadConverted(input: {
  leadId?: string;
  sessionId?: string;
  clientId: string;
  orderId: string;
  revenueInr: number;
}) {
  await ensureAiSalesSchema();
  const now = new Date().toISOString();

  if (isPostgresEnabled()) {
    if (input.leadId) {
      await pgUpdateReturning("ai_leads", "id", input.leadId, {
        status: "converted",
        converted_order_id: input.orderId,
        revenue_inr: input.revenueInr,
        updated_at: now,
      });
      return;
    }
    if (input.sessionId) {
      await pgQuery(
        `update ai_leads
         set status = 'converted', converted_order_id = $3, revenue_inr = $4, updated_at = $5
         where session_id = $1 and client_id = $2 and status <> 'converted'`,
        [input.sessionId, input.clientId, input.orderId, input.revenueInr, now],
      );
    }
    return;
  }

  const db = await readAiSalesDb();
  const lead = db.leads.find((item) =>
    input.leadId
      ? item.id === input.leadId
      : input.sessionId
        ? item.sessionId === input.sessionId && item.clientId === input.clientId
        : false,
  );
  if (!lead) return;
  lead.status = "converted";
  lead.convertedOrderId = input.orderId;
  lead.revenueInr = input.revenueInr;
  lead.updatedAt = now;
  await writeAiSalesDb(db);
}

export async function getAiSalesAnalytics(
  limit = 25,
): Promise<AiSalesAnalyticsSummary> {
  await ensureAiSalesSchema();

  if (isPostgresEnabled()) {
    const { rows: stats } = await pgQuery<{
      total_leads: string;
      new_leads: string;
      qualified_leads: string;
      converted_leads: string;
      lost_leads: string;
      ai_revenue: string;
      avg_budget: string | null;
    }>(`
      select
        count(*)::text as total_leads,
        count(*) filter (where status = 'new')::text as new_leads,
        count(*) filter (where status = 'qualified')::text as qualified_leads,
        count(*) filter (where status = 'converted')::text as converted_leads,
        count(*) filter (where status = 'lost')::text as lost_leads,
        coalesce(sum(revenue_inr) filter (where status = 'converted'), 0)::text as ai_revenue,
        avg(budget_inr)::text as avg_budget
      from ai_leads
    `);

    const { rows: orderStats } = await pgQuery<{ ai_orders: string }>(`
      select count(*)::text as ai_orders
      from orders
      where placed_via = 'ai_bot'
    `);

    const { rows: recent } = await pgQuery(
      "select * from ai_leads order by created_at desc limit $1",
      [limit],
    );

    const row = stats[0];
    const totalLeads = Number(row?.total_leads ?? 0);
    const convertedLeads = Number(row?.converted_leads ?? 0);

    return {
      totalLeads,
      newLeads: Number(row?.new_leads ?? 0),
      qualifiedLeads: Number(row?.qualified_leads ?? 0),
      convertedLeads,
      conversionRate:
        totalLeads > 0
          ? Math.round((convertedLeads / totalLeads) * 1000) / 10
          : 0,
      aiRevenueInr: Number(row?.ai_revenue ?? 0),
      aiOrderCount: Number(orderStats[0]?.ai_orders ?? 0),
      averageLeadBudgetInr:
        row?.avg_budget != null ? Number(row.avg_budget) : null,
      recentLeads: recent.map(mapLead),
      leadsByStatus: {
        new: Number(row?.new_leads ?? 0),
        qualified: Number(row?.qualified_leads ?? 0),
        converted: convertedLeads,
        lost: Number(row?.lost_leads ?? 0),
      },
    };
  }

  const db = await readAiSalesDb();
  const leads = db.leads;
  const converted = leads.filter((lead) => lead.status === "converted");
  const budgets = leads
    .map((lead) => lead.budgetInr)
    .filter((value): value is number => value != null && value > 0);

  return {
    totalLeads: leads.length,
    newLeads: leads.filter((lead) => lead.status === "new").length,
    qualifiedLeads: leads.filter((lead) => lead.status === "qualified").length,
    convertedLeads: converted.length,
    conversionRate:
      leads.length > 0
        ? Math.round((converted.length / leads.length) * 1000) / 10
        : 0,
    aiRevenueInr: converted.reduce(
      (sum, lead) => sum + (lead.revenueInr ?? 0),
      0,
    ),
    aiOrderCount: converted.filter((lead) => lead.convertedOrderId).length,
    averageLeadBudgetInr:
      budgets.length > 0
        ? budgets.reduce((sum, value) => sum + value, 0) / budgets.length
        : null,
    recentLeads: leads.slice(0, limit),
    leadsByStatus: {
      new: leads.filter((lead) => lead.status === "new").length,
      qualified: leads.filter((lead) => lead.status === "qualified").length,
      converted: converted.length,
      lost: leads.filter((lead) => lead.status === "lost").length,
    },
  };
}

export async function listAiLeads(limit = 50): Promise<AiLeadRow[]> {
  await ensureAiSalesSchema();
  if (isPostgresEnabled()) {
    const { rows } = await pgQuery(
      "select * from ai_leads order by created_at desc limit $1",
      [limit],
    );
    return rows.map(mapLead);
  }
  const db = await readAiSalesDb();
  return db.leads.slice(0, limit);
}
