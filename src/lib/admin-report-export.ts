/** Admin report export helpers — product images in Excel and PDF. */

export const REPORT_IMAGE_KEY = "image";

export function absoluteReportImageUrl(path: string) {
  const trimmed = path?.trim() ?? "";
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (typeof window === "undefined") return trimmed;
  return `${window.location.origin}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function orderedHeaders(rows: Array<Record<string, unknown>>) {
  const keys = Object.keys(rows[0] ?? {});
  if (!keys.includes(REPORT_IMAGE_KEY)) return keys;
  return [REPORT_IMAGE_KEY, ...keys.filter((key) => key !== REPORT_IMAGE_KEY)];
}

function imageExtension(url: string): "jpeg" | "png" | "gif" {
  const lower = url.toLowerCase();
  if (lower.includes(".png") || lower.includes("image/png")) return "png";
  if (lower.includes(".webp")) return "png";
  if (lower.includes(".gif")) return "gif";
  return "jpeg";
}

async function fetchImageBuffer(url: string): Promise<ArrayBuffer | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (type && !type.startsWith("image/")) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

export async function downloadXlsxWithImages(
  filename: string,
  rows: Array<Record<string, unknown>>,
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");
  const headers = orderedHeaders(rows);

  sheet.addRow(headers.map((header) => header));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };

  const imageColIndex = headers.indexOf(REPORT_IMAGE_KEY);

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const excelRow = sheet.addRow(
      headers.map((header) =>
        header === REPORT_IMAGE_KEY ? "" : (row[header] ?? ""),
      ),
    );
    excelRow.alignment = { vertical: "middle", wrapText: true };

    if (imageColIndex >= 0) {
      const imageUrl = absoluteReportImageUrl(
        String(row[REPORT_IMAGE_KEY] ?? ""),
      );
      const buffer = await fetchImageBuffer(imageUrl);
      if (buffer) {
        const imageId = workbook.addImage({
          buffer,
          extension: imageExtension(imageUrl),
        });
        sheet.addImage(imageId, {
          tl: { col: imageColIndex, row: index + 1 },
          ext: { width: 72, height: 72 },
        });
        excelRow.height = 58;
      }
    }
  }

  headers.forEach((header, columnIndex) => {
    const column = sheet.getColumn(columnIndex + 1);
    if (header === REPORT_IMAGE_KEY) {
      column.width = 14;
    } else {
      column.width = Math.min(42, Math.max(14, header.length + 4));
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadXlsxPlain(
  filename: string,
  rows: Array<Record<string, unknown>>,
) {
  const XLSX = await import("xlsx");
  const exportRows = rows.map((row) => {
    const copy = { ...row };
    if (REPORT_IMAGE_KEY in copy) {
      copy[REPORT_IMAGE_KEY] = absoluteReportImageUrl(
        String(copy[REPORT_IMAGE_KEY] ?? ""),
      );
    }
    return copy;
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(exportRows),
    "Report",
  );
  XLSX.writeFile(workbook, filename);
}

export function printPdfWithImages(
  title: string,
  rows: Array<Record<string, unknown>>,
) {
  const headers = orderedHeaders(rows);
  const hasImages = headers.includes(REPORT_IMAGE_KEY);

  const headerLabel = (header: string) =>
    header === REPORT_IMAGE_KEY ? "Photo" : header;

  const headHtml = headers
    .map((header) => `<th>${escapeHtml(headerLabel(header))}</th>`)
    .join("");

  const bodyHtml = rows
    .map((row) => {
      const cells = headers
        .map((header) => {
          if (header === REPORT_IMAGE_KEY) {
            const url = absoluteReportImageUrl(String(row[header] ?? ""));
            if (!url) return "<td>-</td>";
            return `<td class="img-cell"><img src="${escapeHtml(url)}" alt="" width="56" height="56" /></td>`;
          }
          return `<td>${escapeHtml(String(row[header] ?? ""))}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const popup = window.open("", "_blank", "width=1200,height=900");
  if (!popup) return;

  popup.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #181818; }
    h1 { font-size: 22px; margin: 0 0 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; vertical-align: middle; }
    th { background: #f5f5f5; }
    ${hasImages ? `.img-cell { width: 64px; text-align: center; } img { object-fit: cover; border-radius: 6px; display: block; }` : ""}
    @media print { img { max-width: 56px; max-height: 56px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
</body>
</html>`);
  popup.document.close();
  popup.onload = () => {
    popup.focus();
    popup.print();
  };
}

export function rowsIncludeProductImages(rows: Array<Record<string, unknown>>) {
  return rows.some(
    (row) => String(row[REPORT_IMAGE_KEY] ?? "").trim().length > 0,
  );
}

export type ClientOrderPdfItem = {
  image: string;
  name: string;
  color: string;
  sizes: string;
  sets: string;
  lineTotal: string;
};

export type ClientOrderPdfOrder = {
  id: string;
  date: string;
  status: string;
  total: string;
  dispatch: string;
  items: ClientOrderPdfItem[];
};

export type ClientOrdersPdfInput = {
  companyName: string;
  email: string;
  phone: string;
  gst: string;
  city: string;
  orderCount: number;
  orders: ClientOrderPdfOrder[];
};

async function imagePathToPrintSrc(path: string): Promise<string> {
  const url = absoluteReportImageUrl(path);
  if (!url) return "";
  try {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) return url;
    const blob = await response.blob();
    if (blob.type && !blob.type.startsWith("image/")) return url;
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? url));
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

async function embedClientOrderImages(
  input: ClientOrdersPdfInput,
): Promise<ClientOrdersPdfInput> {
  const orders = await Promise.all(
    input.orders.map(async (order) => ({
      ...order,
      items: await Promise.all(
        order.items.map(async (item) => ({
          ...item,
          image: item.image ? await imagePathToPrintSrc(item.image) : "",
        })),
      ),
    })),
  );
  return { ...input, orders };
}

function renderClientOrderItems(items: ClientOrderPdfItem[]) {
  if (!items.length) {
    return `<p class="order-empty">No line items recorded for this order.</p>`;
  }
  const rows = items
    .map((item) => {
      const src = item.image.trim();
      const photo = src
        ? `<td class="img-cell"><img src="${escapeHtml(src)}" alt="" width="56" height="56" /></td>`
        : `<td class="img-cell">-</td>`;
      return `<tr>
        ${photo}
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.color)}</td>
        <td>${escapeHtml(item.sizes)}</td>
        <td>${escapeHtml(item.sets)}</td>
        <td>${escapeHtml(item.lineTotal)}</td>
      </tr>`;
    })
    .join("");
  return `<table class="items-table">
    <thead>
      <tr>
        <th>Photo</th>
        <th>Product</th>
        <th>Color</th>
        <th>Sizes</th>
        <th>Sets</th>
        <th>Line total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

export async function printClientOrdersPdf(input: ClientOrdersPdfInput) {
  const embedded = await embedClientOrderImages(input);
  const title = `${embedded.companyName} — Orders`;
  const meta = [
    ["Email", input.email],
    ["Phone", input.phone || "-"],
    ["GST", input.gst || "-"],
    ["City", input.city || "-"],
    ["Orders", String(embedded.orderCount)],
  ]
    .map(
      ([label, value]) =>
        `<div class="meta-cell"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
    )
    .join("");

  const orderSections = embedded.orders.length
    ? embedded.orders
        .map(
          (order) => `<section class="order-block">
        <div class="order-head">
          <div>
            <h2>${escapeHtml(order.id)}</h2>
            <p>${escapeHtml(order.date)} · ${escapeHtml(order.status)}</p>
            <p class="dispatch">${escapeHtml(order.dispatch)}</p>
          </div>
          <div class="order-total">${escapeHtml(order.total)}</div>
        </div>
        ${renderClientOrderItems(order.items)}
      </section>`,
        )
        .join("")
    : `<p class="empty">No orders for this client.</p>`;

  const popup = window.open("", "_blank", "width=1200,height=900");
  if (!popup) return;

  popup.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #181818; }
    h1 { font-size: 22px; margin: 0 0 12px; }
    .meta { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .meta-cell span { display: block; font-size: 10px; color: #666; text-transform: uppercase; }
    .meta-cell strong { font-size: 13px; }
    .order-block { margin-bottom: 28px; page-break-inside: avoid; }
    .order-head { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 10px; align-items: flex-start; }
    .order-head h2 { font-size: 16px; margin: 0 0 4px; }
    .order-head p { margin: 0; font-size: 11px; color: #555; }
    .order-head .dispatch { margin-top: 4px; }
    .order-total { font-size: 18px; font-weight: 700; white-space: nowrap; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; vertical-align: middle; }
    th { background: #f5f5f5; }
    .img-cell { width: 64px; text-align: center; }
    .img-cell img { object-fit: cover; border-radius: 6px; display: block; }
    .order-empty, .empty { color: #666; font-size: 12px; }
    @media print {
      .order-block { page-break-inside: avoid; }
      img { max-width: 56px; max-height: 56px; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${meta}</div>
  ${orderSections}
</body>
</html>`);
  popup.document.close();

  const waitForImages = () =>
    new Promise<void>((resolve) => {
      const images = Array.from(popup.document.images);
      if (!images.length) {
        resolve();
        return;
      }
      let pending = images.length;
      const finish = () => {
        pending -= 1;
        if (pending <= 0) resolve();
      };
      const timeout = window.setTimeout(() => resolve(), 5000);
      for (const img of images) {
        if (img.complete) finish();
        else {
          img.addEventListener("load", finish, { once: true });
          img.addEventListener("error", finish, { once: true });
        }
      }
      if (pending <= 0) {
        window.clearTimeout(timeout);
        resolve();
      }
    });

  const runPrint = async () => {
    await waitForImages();
    popup.focus();
    popup.print();
  };

  if (popup.document.readyState === "complete") {
    void runPrint();
  } else {
    popup.onload = () => void runPrint();
  }
}
