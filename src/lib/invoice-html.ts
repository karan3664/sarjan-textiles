import "server-only";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { siteSettings } from "@/data/mock";
import { escapeHtml } from "@/lib/email-template";
import { enrichOrderPricing, formatInrPricingLine } from "@/lib/gst-display";
import { resolveDispatchAddress } from "@/lib/dispatch-address";
import {
  DEFAULT_TEXTILE_HSN,
  INVOICE_BANK,
  SELLER_STATE,
  SELLER_STATE_CODE,
} from "@/lib/invoice-config";
import type { LocalClient, LocalOrder } from "@/lib/local-db";
import {
  invoicePaymentStatusUrl,
  invoicePaymentSummary,
} from "@/lib/invoice-payment";

let cachedStyles: string | null = null;

function invoiceStylesPathCandidates() {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return [
    path.join(process.cwd(), "src/lib/invoice-styles.css"),
    path.join(moduleDir, "invoice-styles.css"),
    path.join(process.cwd(), ".next/standalone/src/lib/invoice-styles.css"),
  ];
}

function invoiceStyles() {
  if (cachedStyles) return cachedStyles;
  for (const candidate of invoiceStylesPathCandidates()) {
    if (fs.existsSync(candidate)) {
      cachedStyles = fs.readFileSync(candidate, "utf8");
      return cachedStyles;
    }
  }
  throw new Error(
    `invoice-styles.css not found (checked ${invoiceStylesPathCandidates().join(", ")})`,
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatInr(amount: number) {
  return formatInrPricingLine(amount);
}

function invoiceNumber(order: LocalOrder) {
  const d = new Date(order.createdAt);
  const month = d.getMonth();
  const year = d.getFullYear();
  const fyStart = month >= 3 ? year : year - 1;
  const fyEnd = (fyStart + 1) % 100;
  const seq = order.id.replace(/^ST-/i, "").slice(-5).padStart(5, "0");
  return `ST/INV/FY${String(fyStart).slice(-2)}-${String(fyEnd).padStart(2, "0")}/${seq}`;
}

function dueDate(order: LocalOrder) {
  const days = order.creditDays ?? siteSettings.creditTermDays ?? 30;
  const d = new Date(order.createdAt);
  d.setDate(d.getDate() + days);
  return formatDate(d.toISOString());
}

function customerDisplayName(client: LocalClient, dispatchText: string) {
  return (
    client.companyName?.trim() ||
    client.address?.contactName?.trim() ||
    client.address?.ownerLegalName?.trim() ||
    dispatchText.split("\n")[0]?.trim() ||
    "Customer"
  );
}

function clientState(client: LocalClient) {
  return (
    client.address?.state?.trim() ||
    (client.city?.toLowerCase().includes("gujarat") ? SELLER_STATE : "") ||
    ""
  );
}

function isIntraState(client: LocalClient) {
  const state = clientState(client).toLowerCase();
  if (!state) return true;
  return state.includes("gujarat") || state === "gj";
}

function addressHtml(text: string) {
  return escapeHtml(text)
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

function amountInWordsInr(amount: number) {
  const n = Math.round(amount);
  if (!Number.isFinite(n) || n < 0) return "";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function twoDigits(num: number) {
    if (num < 20) return ones[num];
    return `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ""}`.trim();
  }

  function threeDigits(num: number) {
    if (num < 100) return twoDigits(num);
    return `${ones[Math.floor(num / 100)]} Hundred${num % 100 ? ` ${twoDigits(num % 100)}` : ""}`.trim();
  }

  function convert(num: number) {
    if (num === 0) return "Zero";
    const parts: string[] = [];
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const rest = num % 1000;
    if (crore) parts.push(`${convert(crore)} Crore`);
    if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
    if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
    if (rest) parts.push(threeDigits(rest));
    return parts.join(" ");
  }

  return `${convert(n)} Rupees Only`;
}

async function buildQrSvg(payload: string, ariaLabel: string) {
  const svg = await QRCode.toString(payload, {
    type: "svg",
    width: 112,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });
  return svg
    .replace(/<\?xml[^?]*\?>\s*/i, "")
    .replace(
      "<svg ",
      `<svg class="upi-qr-svg" role="img" aria-label="${escapeHtml(ariaLabel)}" `,
    );
}

async function buildUpiPayQrSvg(
  amount: number,
  invoiceRef: string,
  note: string,
) {
  const upiUrl =
    `upi://pay?pa=${encodeURIComponent(INVOICE_BANK.upiId)}` +
    `&pn=${encodeURIComponent(INVOICE_BANK.accountName)}` +
    `&cu=INR&am=${amount.toFixed(2)}&tn=${encodeURIComponent(note)}`;
  return buildQrSvg(upiUrl, "UPI payment QR code");
}

async function buildPaidStatusQrSvg(input: {
  orderId: string;
  invoiceRef: string;
  paidAmount: number;
  baseUrl?: string;
}) {
  const statusUrl = invoicePaymentStatusUrl({
    orderId: input.orderId,
    invoiceRef: input.invoiceRef,
    baseUrl: input.baseUrl,
  });
  return buildQrSvg(statusUrl, "Invoice payment status QR code");
}

export function orderInvoicePath(orderId: string) {
  return `/api/orders/${encodeURIComponent(orderId)}/invoice`;
}

export function orderInvoiceUrl(orderId: string, baseUrl?: string) {
  const base = (
    baseUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://sarjantextiles.com"
  ).replace(/\/$/, "");
  return `${base}${orderInvoicePath(orderId)}`;
}

export async function buildTaxInvoiceHtml(input: {
  order: LocalOrder;
  client: LocalClient;
  showToolbar?: boolean;
}) {
  const { order, client, showToolbar = true } = input;
  const invNo = invoiceNumber(order);
  const dispatchText = resolveDispatchAddress(order.dispatchAddress, client);
  const customerName = customerDisplayName(client, dispatchText);
  const priced = enrichOrderPricing(order, {
    platformFee: siteSettings.platformFee,
    shipping: siteSettings.shipping,
  });
  const gstPct = priced.taxApplies ? Math.round(priced.taxRate * 100) : 0;
  const intra = isIntraState(client);
  const cgst = intra && priced.tax ? priced.tax / 2 : 0;
  const sgst = intra && priced.tax ? priced.tax / 2 : 0;
  const igst = !intra && priced.tax ? priced.tax : 0;
  const placeOfSupply = intra
    ? `${SELLER_STATE} (${SELLER_STATE_CODE})`
    : clientState(client) || "—";
  const clientGst = client.address?.gst?.trim() || client.gst?.trim() || "";
  const payment = invoicePaymentSummary(order, priced.total);
  const siteBase = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarjantextiles.com"
  ).replace(/\/$/, "");
  const qrSvg = payment.fullyPaid
    ? await buildPaidStatusQrSvg({
        orderId: order.id,
        invoiceRef: invNo,
        paidAmount: payment.paidAmount,
        baseUrl: siteBase,
      })
    : await buildUpiPayQrSvg(
        payment.partial ? payment.outstanding : priced.total,
        invNo,
        payment.partial ? `Balance ${invNo}` : invNo,
      );
  const paymentStatusMeta = payment.fullyPaid
    ? `<span class="invoice-payment-pill invoice-payment-pill--paid">Paid in full</span>`
    : payment.partial
      ? `<span class="invoice-payment-pill invoice-payment-pill--partial">Partially paid</span>`
      : payment.statusLabel === "Overdue"
        ? `<span class="invoice-payment-pill invoice-payment-pill--overdue">Overdue</span>`
        : `<span class="invoice-payment-pill invoice-payment-pill--pending">Payment pending</span>`;
  const amountReceivedMeta =
    payment.paidAmount > 0
      ? `${formatInr(payment.paidAmount)}${payment.paymentReceivedAt ? ` · ${formatDate(payment.paymentReceivedAt)}` : ""}`
      : "—";
  const balanceMeta = payment.fullyPaid
    ? "₹0 · Settled"
    : payment.outstanding > 0
      ? formatInr(payment.outstanding)
      : formatInr(priced.total);

  const totalSets = order.items.reduce(
    (sum, item) => sum + Number(item.setQuantity ?? 0),
    0,
  );
  const totalPieces = order.items.reduce(
    (sum, item) =>
      sum + (item.piecesPerSet ?? 1) * Number(item.setQuantity ?? 0),
    0,
  );
  const hsnCodes = [
    ...new Set(order.items.map(() => DEFAULT_TEXTILE_HSN).filter(Boolean)),
  ];

  const itemRows = order.items.length
    ? order.items
        .map((item, index) => {
          const pcs = (item.piecesPerSet ?? 1) * Number(item.setQuantity ?? 0);
          const taxable = Number(item.lineTotal ?? 0);
          const taxAmt = priced.taxApplies
            ? Math.round(taxable * priced.taxRate * 100) / 100
            : 0;
          const lineTotal = taxable + taxAmt;
          const sizeLabel = item.sizes?.join(", ") || "—";
          return `
          <tr>
            <td class="center">${index + 1}</td>
            <td>
              <div class="product-cell">
                ${
                  item.image
                    ? `<img src="${escapeHtml(item.image)}" alt="" />`
                    : ""
                }
                <div>
                  <div class="name">${escapeHtml(item.name)}</div>
                  <div class="sku">${escapeHtml(item.slug ?? "")} · ${escapeHtml(item.color)} · ${escapeHtml(sizeLabel)}</div>
                </div>
              </div>
            </td>
            <td>${DEFAULT_TEXTILE_HSN}</td>
            <td>${escapeHtml(item.color)}</td>
            <td>${escapeHtml(sizeLabel)}</td>
            <td class="center">${escapeHtml(String(item.setQuantity ?? "—"))}</td>
            <td class="center">${escapeHtml(String(item.piecesPerSet ?? "—"))}</td>
            <td class="center">${pcs || "—"}</td>
            <td class="num">${formatInr(Number(item.unitPrice ?? 0))}</td>
            <td class="num">${formatInr(taxable)}</td>
            <td class="center">${gstPct ? `${gstPct}%` : "—"}</td>
            <td class="num">${taxAmt ? formatInr(taxAmt) : "—"}</td>
            <td class="num">${formatInr(lineTotal)}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="13" class="center">Item details pending.</td></tr>`;

  const logoUrl = siteSettings.logo.startsWith("http")
    ? siteSettings.logo
    : `${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarjantextiles.com").replace(/\/$/, "")}${siteSettings.logo.startsWith("/") ? "" : "/"}${siteSettings.logo}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sarjan Textiles — Tax Invoice | ${escapeHtml(invNo)}</title>
  <style>${invoiceStyles()}</style>
</head>
<body>
  ${
    showToolbar
      ? `<div class="toolbar">
    <p>Open in Chrome → <strong>Print</strong> → <strong>Save as PDF</strong></p>
    <button type="button" onclick="window.print()">Save / Print PDF</button>
  </div>`
      : ""
  }
  <article class="invoice">
    <header class="header">
      <div class="brand">
        <img class="logo" src="${escapeHtml(logoUrl)}" alt="Sarjan Textiles" />
        <div>
          <h1>SARJAN TEXTILES</h1>
          <p class="legal">${escapeHtml(siteSettings.legalName)}</p>
          <p>${escapeHtml(siteSettings.address)}</p>
          <p><strong>GSTIN:</strong> ${escapeHtml(siteSettings.gstin)} &nbsp;|&nbsp; <strong>State:</strong> ${SELLER_STATE} (${SELLER_STATE_CODE})</p>
          <p><strong>Phone:</strong> ${escapeHtml(siteSettings.phone)} &nbsp;|&nbsp; <strong>Email:</strong> ${escapeHtml(siteSettings.email)}</p>
        </div>
      </div>
      <div class="doc-title">
        <h2>TAX INVOICE</h2>
        <span class="copy">Original for Recipient</span>
        ${payment.fullyPaid ? `<span class="invoice-paid-stamp">PAID</span>` : ""}
      </div>
    </header>
    ${
      payment.fullyPaid
        ? `<div class="invoice-paid-banner" role="status">
      <strong>Payment received — this invoice is already paid.</strong>
      <span>Amount received: ${formatInr(payment.paidAmount)}${payment.paymentReceivedAt ? ` on ${formatDate(payment.paymentReceivedAt)}` : ""}. Please do not pay again.</span>
    </div>`
        : payment.partial
          ? `<div class="invoice-partial-banner" role="status">
      <strong>Partial payment received.</strong>
      <span>Paid ${formatInr(payment.paidAmount)} · Balance due ${formatInr(payment.outstanding)}. Scan QR to pay the remaining amount.</span>
    </div>`
          : ""
    }

    <section class="meta-grid">
      <div><label>Invoice Number</label><strong>${escapeHtml(invNo)}</strong></div>
      <div><label>Invoice Date</label><strong>${formatDate(order.createdAt)}</strong></div>
      <div><label>Order Reference</label><strong>${escapeHtml(order.id)}</strong></div>
      <div><label>Place of Supply</label><strong>${escapeHtml(placeOfSupply)}</strong></div>
      <div><label>Payment Terms</label><strong>Credit — ${order.creditDays ?? siteSettings.creditTermDays} Days</strong></div>
      <div><label>Due Date</label><strong>${dueDate(order)}</strong></div>
      <div><label>Payment Status</label><strong>${paymentStatusMeta}</strong></div>
      <div><label>${payment.fullyPaid ? "Amount Received" : "Balance Due"}</label><strong>${payment.fullyPaid ? amountReceivedMeta : balanceMeta}</strong></div>
    </section>

    <section class="parties">
      <div class="party">
        <h3>Bill To</h3>
        <p><strong>${escapeHtml(customerName)}</strong></p>
        ${clientGst ? `<p>GSTIN: ${escapeHtml(clientGst)}</p>` : ""}
        ${addressHtml(dispatchText)}
        ${client.phone ? `<p>Contact: ${escapeHtml(client.phone)}</p>` : ""}
        <p>Email: ${escapeHtml(order.clientEmail)}</p>
      </div>
      <div class="party">
        <h3>Ship To</h3>
        <p><strong>${escapeHtml(customerName)}</strong></p>
        ${addressHtml(dispatchText)}
      </div>
    </section>

    <div class="table-wrap">
      <table class="items">
        <colgroup>
          <col class="col-no" />
          <col class="col-product" />
          <col class="col-hsn" />
          <col class="col-color" />
          <col class="col-size" />
          <col class="col-sets" />
          <col class="col-pcs" />
          <col class="col-qty" />
          <col class="col-rate" />
          <col class="col-taxable" />
          <col class="col-gst" />
          <col class="col-tax" />
          <col class="col-total" />
        </colgroup>
        <thead>
          <tr>
            <th class="center">#</th>
            <th>Product</th>
            <th>HSN</th>
            <th>Color</th>
            <th>Size</th>
            <th class="center">Sets</th>
            <th class="center">Pcs/Set</th>
            <th class="center">Qty</th>
            <th class="num">Rate/Set</th>
            <th class="num">Taxable</th>
            <th class="center">GST</th>
            <th class="num">Tax ₹</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
    <p class="tax-note">
      Tax ₹ = CGST + SGST (intra-state). IGST applies on inter-state supplies.
    </p>

    <div class="totals-wrap">
      <div class="qty-summary">
        <h4>Dispatch Summary</h4>
        <p><strong>Total Sets:</strong> ${totalSets || "—"}</p>
        <p><strong>Total Pieces:</strong> ${totalPieces || "—"}</p>
        ${
          hsnCodes.length
            ? `<p><strong>HSN Reference:</strong></p>
        <p class="hsn-ref">${hsnCodes.map((code) => escapeHtml(code)).join("<br />")}</p>`
            : ""
        }
      </div>
      <div class="totals">
        <table>
        <tr><td>Taxable Value</td><td>${formatInr(priced.taxableAmount)}</td></tr>
        <tr><td>CGST</td><td>${cgst ? formatInr(cgst) : "—"}</td></tr>
        <tr><td>SGST</td><td>${sgst ? formatInr(sgst) : "—"}</td></tr>
        <tr><td>IGST</td><td>${igst ? formatInr(igst) : "—"}</td></tr>
        ${
          priced.shipping
            ? `<tr><td>Shipping / Freight</td><td>${formatInr(priced.shipping)}</td></tr>`
            : ""
        }
        ${
          priced.platformFee
            ? `<tr><td>${escapeHtml(priced.platformFeeLabel)}</td><td>${formatInr(priced.platformFee)}</td></tr>`
            : ""
        }
        ${
          priced.roundOff
            ? `<tr><td>Round Off</td><td>${formatInr(priced.roundOff)}</td></tr>`
            : ""
        }
        ${
          payment.paidAmount > 0
            ? `<tr class="paid-row"><td>Amount Received</td><td>${formatInr(payment.paidAmount)}</td></tr>`
            : ""
        }
        ${
          !payment.fullyPaid && payment.outstanding > 0
            ? `<tr class="balance-row"><td>Balance Due</td><td>${formatInr(payment.outstanding)}</td></tr>`
            : ""
        }
        <tr class="grand"><td>Grand Total (INR)</td><td>${formatInr(priced.total)}</td></tr>
        </table>
      </div>
    </div>

    <div class="words"><strong>Amount in Words:</strong> ${escapeHtml(amountInWordsInr(priced.total))}</div>

    <div class="footer-grid">
      <div class="footer-block bank">
        <div class="bank-pay-row">
          <div class="bank-text">
            <h4>Bank Details</h4>
            <p><strong>Account Name:</strong> ${INVOICE_BANK.accountName}</p>
            <p><strong>Bank:</strong> ${INVOICE_BANK.bankName}, ${INVOICE_BANK.branch} Branch</p>
            <p><strong>Account Number:</strong> ${INVOICE_BANK.accountNumber}</p>
            <p><strong>IFSC Code:</strong> ${INVOICE_BANK.ifsc}</p>
            <p><strong>Account Type:</strong> ${INVOICE_BANK.accountType}</p>
            <p><strong>UPI ID:</strong> ${INVOICE_BANK.upiId}</p>
            <p style="margin-top:8px;color:var(--muted);font-size:10px">Please mention invoice number <strong>${escapeHtml(invNo)}</strong> in payment reference / UPI note.</p>
          </div>
          <div class="upi-box${payment.fullyPaid ? " upi-box--paid" : payment.partial ? " upi-box--partial" : ""}">
            <h5>${payment.fullyPaid ? "Already Paid" : payment.partial ? "Scan & Pay Balance" : "Scan & Pay"}</h5>
            <div class="qr-wrap${payment.fullyPaid ? " qr-wrap--paid" : ""}">
              ${qrSvg}
              ${payment.fullyPaid ? `<span class="qr-paid-overlay">PAID</span>` : ""}
            </div>
            ${
              payment.fullyPaid
                ? `<p class="upi-paid-note"><strong>Already paid.</strong> Scan to verify payment status — do not pay again.</p>`
                : `<p class="upi-id"><strong>UPI:</strong> ${INVOICE_BANK.upiId}</p>
            <p class="upi-bank">${INVOICE_BANK.bankName}</p>
            <p class="upi-apps">${payment.partial ? `Pay balance ${formatInr(payment.outstanding)} · ` : ""}GPay · PhonePe · Paytm · BHIM · Any UPI App</p>`
            }
          </div>
        </div>
      </div>
      <div class="footer-block">
        <h4>Terms &amp; Conditions</h4>
        <ul>
          <li>Goods once sold shall not be taken back except as per Sarjan Textiles quality claim policy.</li>
          <li>Any quantity or quality discrepancy must be reported within 48 hours of delivery with LR proof.</li>
          <li>Title and risk pass to the buyer upon handover to the carrier unless otherwise agreed in writing.</li>
          <li>Interest @ 18% p.a. may apply on overdue invoices beyond agreed credit period.</li>
          <li>All disputes subject to exclusive jurisdiction of courts at Bhuj, Kachchh, Gujarat.</li>
          <li>E. &amp; O.E. — Errors and omissions excepted.</li>
          <li>This is a computer-generated tax invoice and is valid without physical signature when issued from Sarjan systems.</li>
          <li>GST is charged as per applicable law; intra-state supplies attract CGST + SGST.</li>
        </ul>
      </div>
    </div>

    <div class="signatures">
      <div class="sign">
        <p class="sign-note">This is a computer-generated invoice. Physical signature is not required.</p>
        <div class="line">Authorised Signatory — For Sarjan Textiles</div>
      </div>
      <div class="sign">
        <div class="line">Customer Acknowledgement — ${escapeHtml(customerName)}</div>
      </div>
    </div>

    <div class="footnote">
      ${escapeHtml(siteSettings.brandName)} · GSTIN ${escapeHtml(siteSettings.gstin)} · Bhuj, Gujarat · Order ${escapeHtml(order.id)} · Status: ${escapeHtml(order.status)}
    </div>
  </article>
</body>
</html>`;
}
