import type { ReactNode } from "react";
import { siteSettings } from "@/data/mock";
import { formatInrPricingLine } from "@/lib/gst-display";
import { invoicePaymentSummary } from "@/lib/invoice-payment";
import { readLocalDb } from "@/lib/local-db";

export const dynamic = "force-dynamic";

function formatDate(value?: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function InvoicePaymentStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; inv?: string }>;
}) {
  const params = await searchParams;
  const orderId = params.orderId?.trim() ?? "";
  const invoiceRef = params.inv?.trim() ?? "";

  if (!orderId) {
    return (
      <StatusShell title="Invalid link">
        <p>
          Order reference missing. Open the invoice from your Sarjan account.
        </p>
      </StatusShell>
    );
  }

  const db = await readLocalDb();
  const requested = orderId.toLowerCase();
  const order = db.orders.find((row) => {
    const fullId = row.id.toLowerCase();
    const numericId = fullId.replace(/^st-/, "");
    return fullId === requested || numericId === requested;
  });

  if (!order) {
    return (
      <StatusShell title="Invoice not found">
        <p>
          We could not find order <strong>{orderId}</strong>. Check the invoice
          link or contact Sarjan Textiles support.
        </p>
      </StatusShell>
    );
  }

  const payment = invoicePaymentSummary(order, order.total ?? order.subtotal);
  const receivedOn = formatDate(payment.paymentReceivedAt);

  if (payment.fullyPaid) {
    return (
      <StatusShell title="Already paid" tone="paid">
        <div className="status-icon" aria-hidden="true">
          ✓
        </div>
        <h1>Already paid</h1>
        <p className="lead">
          This invoice has already been settled. Please do not pay again.
        </p>
        <dl className="status-facts">
          {invoiceRef ? (
            <>
              <dt>Invoice</dt>
              <dd>{invoiceRef}</dd>
            </>
          ) : null}
          <dt>Order</dt>
          <dd>{order.id}</dd>
          <dt>Amount received</dt>
          <dd>{formatInrPricingLine(payment.paidAmount)}</dd>
          {receivedOn ? (
            <>
              <dt>Received on</dt>
              <dd>{receivedOn}</dd>
            </>
          ) : null}
        </dl>
        <p className="fine-print">
          {siteSettings.brandName} · {siteSettings.phone} · {siteSettings.email}
        </p>
      </StatusShell>
    );
  }

  if (payment.partial) {
    return (
      <StatusShell title="Partially paid" tone="partial">
        <div className="status-icon" aria-hidden="true">
          ₹
        </div>
        <h1>Partial payment received</h1>
        <p className="lead">
          Part of this invoice is already paid. Pay only the remaining balance.
        </p>
        <dl className="status-facts">
          {invoiceRef ? (
            <>
              <dt>Invoice</dt>
              <dd>{invoiceRef}</dd>
            </>
          ) : null}
          <dt>Order</dt>
          <dd>{order.id}</dd>
          <dt>Paid so far</dt>
          <dd>{formatInrPricingLine(payment.paidAmount)}</dd>
          <dt>Balance due</dt>
          <dd>{formatInrPricingLine(payment.outstanding)}</dd>
        </dl>
        <p className="fine-print">
          Use the balance QR on your tax invoice to pay the remaining amount.
        </p>
      </StatusShell>
    );
  }

  return (
    <StatusShell title="Payment pending" tone="pending">
      <div className="status-icon" aria-hidden="true">
        !
      </div>
      <h1>Payment pending</h1>
      <p className="lead">
        This invoice is not marked as paid yet. Use the Scan &amp; Pay QR on the
        invoice to complete payment.
      </p>
      <dl className="status-facts">
        {invoiceRef ? (
          <>
            <dt>Invoice</dt>
            <dd>{invoiceRef}</dd>
          </>
        ) : null}
        <dt>Order</dt>
        <dd>{order.id}</dd>
        <dt>Amount due</dt>
        <dd>{formatInrPricingLine(payment.outstanding)}</dd>
      </dl>
    </StatusShell>
  );
}

function StatusShell({
  title,
  tone = "neutral",
  children,
}: {
  title: string;
  tone?: "paid" | "partial" | "pending" | "neutral";
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>
          {title} | {siteSettings.brandName}
        </title>
        <style>{`
          :root {
            --brand: #7a1e2c;
            --ink: #1a1a1a;
            --muted: #5c5c5c;
            --line: #d9d0d2;
            --paid: #1e8e5a;
            --paid-soft: #e5f4ec;
            --partial: #c77b16;
            --partial-soft: #fbf0dc;
            --pending: #7a1e2c;
            --pending-soft: #f8ecee;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 24px 16px;
            font-family: "Segoe UI", Inter, system-ui, sans-serif;
            background: #f3f0eb;
            color: var(--ink);
          }
          .card {
            width: min(100%, 440px);
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 28px 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            text-align: center;
          }
          .card[data-tone="paid"] { border-color: #b8dfc9; background: linear-gradient(180deg, #fff 0%, var(--paid-soft) 100%); }
          .card[data-tone="partial"] { border-color: #ecd4a8; background: linear-gradient(180deg, #fff 0%, var(--partial-soft) 100%); }
          .card[data-tone="pending"] { border-color: #e0c5ca; background: linear-gradient(180deg, #fff 0%, var(--pending-soft) 100%); }
          .status-icon {
            width: 56px;
            height: 56px;
            margin: 0 auto 14px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            font-size: 28px;
            font-weight: 800;
            background: #fff;
            border: 2px solid var(--line);
          }
          .card[data-tone="paid"] .status-icon { color: var(--paid); border-color: #b8dfc9; }
          .card[data-tone="partial"] .status-icon { color: var(--partial); border-color: #ecd4a8; }
          .card[data-tone="pending"] .status-icon { color: var(--pending); border-color: #e0c5ca; }
          h1 { margin: 0 0 10px; font-size: 24px; color: var(--brand); }
          .lead { margin: 0 0 18px; color: var(--muted); line-height: 1.5; font-size: 15px; }
          .status-facts {
            margin: 0 0 18px;
            padding: 14px 16px;
            border-radius: 12px;
            background: rgba(255,255,255,0.72);
            border: 1px solid rgba(0,0,0,0.06);
            text-align: left;
          }
          .status-facts dt {
            margin: 10px 0 2px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--muted);
            font-weight: 700;
          }
          .status-facts dt:first-child { margin-top: 0; }
          .status-facts dd {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
          }
          .fine-print {
            margin: 0;
            font-size: 12px;
            color: var(--muted);
            line-height: 1.45;
          }
        `}</style>
      </head>
      <body>
        <main className="card" data-tone={tone}>
          {children}
        </main>
      </body>
    </html>
  );
}
