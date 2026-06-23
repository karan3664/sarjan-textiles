import { buildTaxInvoiceHtml } from "@/lib/invoice-html";
import { isOrderInvoiceAvailable } from "@/lib/invoice-order-access";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { resolveInvoiceContext } from "@/lib/invoice-route-auth";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { orderId: rawId } = await context.params;
  const orderId = rawId?.trim();
  if (!orderId) {
    return Response.json({ error: "Order id required" }, { status: 400 });
  }

  const resolved = await resolveInvoiceContext(request, orderId);
  if (resolved instanceof Response) return resolved;
  const { order, client } = resolved;

  if (!isOrderInvoiceAvailable(order.status)) {
    return Response.json(
      {
        error:
          "Tax invoice is available after your order is confirmed by Sarjan Textiles.",
      },
      { status: 403 },
    );
  }

  try {
    const html = await buildTaxInvoiceHtml({
      order,
      client,
      showToolbar: false,
      embedImages: true,
    });
    const pdf = await renderInvoicePdf(html);
    const filename = `Sarjan-Tax-Invoice-${order.id}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[invoice.pdf] build failed", order.id, err);
    return Response.json(
      { error: "Could not generate tax invoice PDF. Please try again later." },
      { status: 500 },
    );
  }
}
