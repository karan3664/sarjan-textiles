import { NextResponse } from "next/server";

import { previewAbandonedCartEmailHtml } from "@/lib/abandoned-cart-reminders";
import type { CartReminderStage } from "@/lib/local-db";
import { buildSarjanEmailHtml, escapeHtml } from "@/lib/email-template";

export const dynamic = "force-dynamic";

function parseStage(raw: string | null): CartReminderStage {
  if (raw === "2") return 2;
  if (raw === "daily") return "daily";
  return 1;
}

/**
 * Opens in browser like a mini “inbox” so you can confirm footer + social alignment
 * before sending real mail. Disabled in production unless ENABLE_DEV_EMAIL_PREVIEW=true.
 *
 * Local:
 *   http://localhost:3000/dev/email-preview
 *   http://localhost:3000/dev/email-preview?template=abandoned-cart&stage=1
 *   http://localhost:3000/dev/email-preview?template=abandoned-cart&stage=2
 */
export async function GET(request: Request) {
  const allowed =
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_DEV_EMAIL_PREVIEW === "true";

  if (!allowed) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const template = searchParams.get("template");

  const html =
    template === "abandoned-cart"
      ? previewAbandonedCartEmailHtml(parseStage(searchParams.get("stage")))
      : buildSarjanEmailHtml({
          preheader: "Footer + social icons preview",
          heading: "Branded email preview",
          innerHtml: `<p style="margin:0;">${escapeHtml(
            "Sample body — scroll down for the same footer and “Connect with us” row as real transactional mail. Icon image URLs follow NEXT_PUBLIC_SITE_URL / production domain rules from emailSiteOrigin().",
          )}</p>`,
        });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}
