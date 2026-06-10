import { siteSettings } from "@/data/mock";

const productionEmailOrigin = `https://${siteSettings.domain}`.replace(
  /\/$/,
  "",
);

function isNonProductionEmailHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".vercel.app") ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(h)
  );
}

/**
 * Public site origin for absolute image / link URLs in HTML mail.
 * Uses the live domain (not Vercel preview / localhost) so logos load in inboxes
 * and footer links match https://sarjantextiles.com/ even when the app runs on a preview URL.
 */
export function emailSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    try {
      const host = new URL(fromEnv).hostname;
      if (isNonProductionEmailHost(host)) return productionEmailOrigin;
      return fromEnv;
    } catch {
      return productionEmailOrigin;
    }
  }
  return productionEmailOrigin;
}

function absUrl(path: string): string {
  const trimmed = path.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = emailSiteOrigin();
  const p = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${p}`;
}

export function escapeHtml(value: string | number | undefined): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Plain text → safe HTML with line breaks (admin replies, etc.). */
export function plainTextToEmailHtml(text: string): string {
  return escapeHtml(text).replaceAll("\r\n", "\n").replaceAll("\n", "<br>\n");
}

/** Subscriber-facing confirmation body (uses Sarjan email layout wrapper). */
export function newsletterSubscriberConfirmationInnerHtml(
  subscriberEmail: string,
): string {
  const e = escapeHtml(subscriberEmail);
  return `<p style="margin:0 0 16px;color:#4d4843;line-height:1.65;">Thank you for subscribing to the <strong>${escapeHtml(siteSettings.brandName)}</strong> newsletter.</p>
<p style="margin:0 0 10px;color:#4d4843;font-size:14px;">We saved this address for updates:</p>
<p style="margin:0;padding:14px 16px;background:#fbfaf7;border-radius:10px;border:1px solid #e8e2d9;font-size:15px;line-height:1.5;color:#141414;"><strong>${e}</strong></p>
<p style="margin:18px 0 0;color:#6f6a64;font-size:14px;line-height:1.6;">We share occasional notes on collections, MOQ-friendly programs, and B2B order workflows. You can reply to this email if you need the team.</p>`;
}

/** Internal notification body for orders inbox. */
export function newsletterAdminNotificationInnerHtml(
  subscriberEmail: string,
  source = "footer",
): string {
  const e = escapeHtml(subscriberEmail);
  const channel =
    source === "app"
      ? "New mobile app newsletter signup."
      : source === "launch"
        ? "Someone used “Notify me at launch” on the pre-launch page."
        : source === "inquiry"
          ? "Wholesale inquiry submitted — email added to the launch newsletter list."
          : source === "register"
            ? "Wholesale registration — email added to the launch newsletter list."
            : source === "footer"
              ? "New footer newsletter signup on the website."
              : `New newsletter signup (${escapeHtml(source)}).`;
  return `<p style="margin:0 0 12px;color:#4d4843;line-height:1.65;">${channel}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0;padding:14px 16px;background:#fbfaf7;border-radius:10px;border:1px solid #e8e2d9;">
  <tr><td style="font-size:15px;line-height:1.5;color:#141414;"><strong>Subscriber email</strong><br /><a href="mailto:${e}" style="color:#8b1e2d;text-decoration:none;">${e}</a></td></tr>
</table>
<p style="margin:16px 0 0;color:#6f6a64;font-size:13px;line-height:1.5;">Reply-To is set to the subscriber so you can respond directly from your inbox.</p>`;
}

function formatInquiryEmailDate(iso?: string): string | undefined {
  if (!iso?.trim()) return undefined;
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return undefined;
  }
}

export type ContactInquiryReplyEmailFields = {
  greetingName: string;
  companyName: string;
  subject: string;
  replyMessagePlain: string;
  submittedAtIso?: string;
  requirement?: string;
  orderId?: string;
};

/**
 * Inner HTML for admin “Contact Inquiries” replies — matches order/account mail
 * styling (greeting, key-value reference table, subject + message cards).
 */
export function contactInquiryReplyInnerHtml(
  fields: ContactInquiryReplyEmailFields,
): string {
  const brand = escapeHtml(siteSettings.brandName);
  const greeting = escapeHtml(
    fields.greetingName.trim() || fields.companyName.trim() || "there",
  );
  const company = escapeHtml(fields.companyName.trim() || "—");
  const subject = escapeHtml(fields.subject.trim());
  const replyHtml = plainTextToEmailHtml(fields.replyMessagePlain);

  const submitted = formatInquiryEmailDate(fields.submittedAtIso);
  const rows: [string, string][] = [["Company", company]];
  if (submitted) rows.push(["Inquiry received", escapeHtml(submitted)]);
  if (fields.requirement?.trim()) {
    rows.push(["Requirement", escapeHtml(fields.requirement.trim())]);
  }
  if (fields.orderId?.trim()) {
    rows.push(["Order reference", escapeHtml(fields.orderId.trim())]);
  }

  const refTable = `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 22px;background:#fff;">
      <tbody>
        ${rows
          .map(
            ([label, value]) => `
        <tr>
          <td style="width:38%;padding:10px 12px;border:1px solid #e8e2d9;background:#fbfaf7;color:#6f6a64;font-size:14px;font-family:Arial,Helvetica,sans-serif;">${label}</td>
          <td style="padding:10px 12px;border:1px solid #e8e2d9;font-size:14px;color:#141414;line-height:1.45;font-family:Arial,Helvetica,sans-serif;">${value}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;

  return `
    <p style="margin:0 0 14px;color:#4d4843;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">
      Hello <strong style="color:#141414;">${greeting}</strong>,
    </p>
    <p style="margin:0 0 20px;color:#4d4843;line-height:1.65;font-family:Arial,Helvetica,sans-serif;">
      Thank you for contacting <strong>${brand}</strong>. Below is our team&rsquo;s response regarding your website inquiry.
    </p>
    ${refTable}
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#6f6a64;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Subject</p>
    <p style="margin:0 0 18px;padding:14px 16px;background:#fbfaf7;border-radius:10px;border:1px solid #e8e2d9;font-size:15px;line-height:1.45;color:#141414;font-family:Arial,Helvetica,sans-serif;">
      ${subject}
    </p>
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#6f6a64;font-weight:700;font-family:Arial,Helvetica,sans-serif;">Message</p>
    <div style="padding:18px 16px;background:#ffffff;border-radius:10px;border:1px solid #e8e2d9;font-size:15px;line-height:1.65;color:#141414;font-family:Arial,Helvetica,sans-serif;">
      ${replyHtml}
    </div>
    <p style="margin:22px 0 0;color:#6f6a64;font-size:14px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
      If you need anything else, reply directly to this email or use the phone and email in the footer below.
    </p>
    <p style="margin:14px 0 0;color:#4d4843;font-size:14px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
      Best regards,<br />
      <strong style="color:#141414;">${brand} team</strong>
    </p>
  `;
}

/** Plain-text body for inquiry replies (non-HTML clients). */
export function contactInquiryReplyPlainText(fields: {
  greetingName: string;
  companyName: string;
  subject: string;
  replyMessagePlain: string;
  submittedAtIso?: string;
  requirement?: string;
  orderId?: string;
}): string {
  const brand = siteSettings.brandName;
  const origin = emailSiteOrigin();
  const greet =
    fields.greetingName.trim() || fields.companyName.trim() || "there";
  const submitted = formatInquiryEmailDate(fields.submittedAtIso);
  const lines = [
    `${brand}`,
    "",
    `Hello ${greet},`,
    "",
    "Thank you for contacting us. Here is our team's message regarding your inquiry:",
    "",
    `Subject: ${fields.subject.trim()}`,
    "",
    fields.replyMessagePlain.trim(),
    "",
    "---",
    `Company: ${fields.companyName.trim() || "—"}`,
  ];
  if (submitted) lines.push(`Inquiry received: ${submitted}`);
  if (fields.requirement?.trim()) {
    lines.push(`Requirement: ${fields.requirement.trim()}`);
  }
  if (fields.orderId?.trim()) {
    lines.push(`Order reference: ${fields.orderId.trim()}`);
  }
  lines.push("", `Website: ${origin}/`, "", `Best regards,`, `${brand} team`);
  return lines.join("\n");
}

type SocialKind = "facebook" | "instagram" | "linkedin";

type SocialLink = {
  href: string;
  bg: string;
  title: string;
  kind: SocialKind;
};

/** White icons as hosted SVGs — many clients strip inline SVG in HTML. */
function emailSocialIconImg(kind: SocialKind): string {
  const src = escapeHtml(absUrl(`/sarjan-assets/email-icon-${kind}.svg`));
  // Inline-block so parent td text-align:center actually centers (block+margin:0 sticks left in Gmail/Apple Mail).
  return `<img src="${src}" width="20" height="20" alt="" role="presentation" border="0" style="display:inline-block;width:20px;height:20px;margin:0;padding:0;border:0;outline:none;text-decoration:none;line-height:0;vertical-align:middle;" />`;
}

function socialLinks(): SocialLink[] {
  const out: SocialLink[] = [];
  const push = (
    href: string | undefined,
    bg: string,
    kind: SocialKind,
    title: string,
  ) => {
    const h = href?.trim() ?? "";
    if (h.startsWith("http://") || h.startsWith("https://")) {
      out.push({ href: h, bg, kind, title });
    }
  };
  push(siteSettings.facebookUrl, "#1877F2", "facebook", "Facebook");
  push(siteSettings.instagramUrl, "#E4405F", "instagram", "Instagram");
  push(siteSettings.linkedinUrl, "#0A66C2", "linkedin", "LinkedIn");
  return out;
}

/** Per-icon column width: keeps three circles equal-spaced as one centered block in Gmail/Outlook. */
const EMAIL_SOCIAL_COL_PX = 60;

function socialIconsTable(compact = false): string {
  const links = socialLinks();
  if (!links.length) return "";

  const rowWidth = links.length * EMAIL_SOCIAL_COL_PX;
  const topMargin = compact ? "9px" : "18px";
  const labelPad = compact ? "5px" : "10px";

  const cells = links
    .map((item) => {
      const inner = emailSocialIconImg(item.kind);
      const bg = escapeHtml(item.bg);
      return `<td width="${EMAIL_SOCIAL_COL_PX}" align="center" valign="middle" style="width:${EMAIL_SOCIAL_COL_PX}px;min-width:${EMAIL_SOCIAL_COL_PX}px;max-width:${EMAIL_SOCIAL_COL_PX}px;padding:0;font-size:0;line-height:0;vertical-align:middle;text-align:center;"><a href="${escapeHtml(item.href)}" title="${escapeHtml(item.title)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;line-height:0;font-size:0;text-align:center;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="44" height="44" align="center" bgcolor="${bg}" style="width:44px;height:44px;margin:0 auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;border-radius:22px;background-color:${bg};"><tr><td align="center" valign="middle" width="44" height="44" style="width:44px;height:44px;padding:0;margin:0;font-size:0;line-height:0;vertical-align:middle;text-align:center;border-radius:22px;">${inner}</td></tr></table></a></td>`;
    })
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="margin:${topMargin} auto 0;width:100%;max-width:100%;border-collapse:collapse;"><tr><td align="center" style="text-align:center;font-size:12px;color:#6f6a64;padding-bottom:${labelPad};">Connect with us</td></tr><tr><td align="center" style="text-align:center;padding:0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="${rowWidth}" style="width:${rowWidth}px;max-width:100%;margin:0 auto;border-collapse:collapse;table-layout:fixed;mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr>${cells}</tr></table></td></tr></table>`;
}

function footerBlock(compact = false): string {
  const brand = escapeHtml(siteSettings.brandName);
  const phone = escapeHtml(siteSettings.phone);
  const email = escapeHtml(siteSettings.email);
  const telHref = escapeHtml(siteSettings.phone.replace(/\s/g, ""));
  const origin = emailSiteOrigin();
  const siteHref = escapeHtml(`${origin}/`);
  const siteLabel = escapeHtml(`${origin}/`);

  const pad = compact ? "14px 16px 12px" : "28px 24px 22px";
  const brandMb = compact ? "7px" : "14px";
  const contactMb = compact ? "9px" : "18px";
  const siteMt = compact ? "11px" : "22px";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#fbfaf7;border-top:1px solid #e8e2d9;">
      <tr>
        <td align="center" style="padding:${pad};text-align:center;">
          <p align="center" style="margin:0 0 ${brandMb};text-align:center;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8b1e2d;font-weight:700;font-family:Arial,Helvetica,sans-serif;">
            ${brand}
          </p>
          <p align="center" style="margin:0 0 ${contactMb};text-align:center;font-size:14px;line-height:1.65;color:#4d4843;font-family:Arial,Helvetica,sans-serif;">
            <a href="tel:${telHref}" style="color:#8b1e2d;text-decoration:none;font-weight:600;">${phone}</a>
            <span style="color:#c4bdb4;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
            <a href="mailto:${email}" style="color:#8b1e2d;text-decoration:none;font-weight:600;">${email}</a>
          </p>
          ${socialIconsTable(compact)}
          <p align="center" style="margin:${siteMt} 0 0;text-align:center;font-size:11px;line-height:1.5;color:#a39e98;font-family:Arial,Helvetica,sans-serif;">
            <a href="${siteHref}" style="color:#8b1e2d;text-decoration:underline;">${siteLabel}</a>
            &nbsp;·&nbsp;B2B textile sourcing &amp; order management
          </p>
        </td>
      </tr>
    </table>
  `;
}

export type SarjanEmailLayoutOptions = {
  /** Hidden preview line in inbox */
  preheader?: string;
  /** Main H1-style title inside the white card */
  heading: string;
  /** Optional kicker above heading */
  eyebrow?: string;
  /** Safe HTML only (caller escapes user data). */
  innerHtml: string;
  /** Tighter vertical spacing (~50% less padding) for newsletter campaigns. */
  compact?: boolean;
};

/**
 * Full responsive-friendly HTML document: branded header, content card, footer (contact + socials).
 */
export function buildSarjanEmailHtml(opts: SarjanEmailLayoutOptions): string {
  const compact = opts.compact === true;
  const preheader = escapeHtml(opts.preheader ?? opts.heading);
  const eyebrowMb = compact ? "3px" : "6px";
  const eyebrow = opts.eyebrow
    ? `<p style="margin:0 0 ${eyebrowMb};font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#8b1e2d;font-weight:700;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(opts.eyebrow)}</p>`
    : "";
  const heading = escapeHtml(opts.heading);
  const logoSrc = escapeHtml(absUrl(siteSettings.logo));
  const brand = escapeHtml(siteSettings.brandName);
  const outerPad = compact ? "16px 12px" : "32px 12px";
  const headerPad = compact ? "12px 16px" : "22px 24px";
  const titlePad = compact ? "14px 16px 4px" : "28px 24px 8px";
  const bodyPad = compact ? "0 16px 14px" : "0 24px 28px";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#ede8e2;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#ede8e2;">
    <tr>
      <td align="center" style="padding:${outerPad};">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d9;box-shadow:0 8px 28px rgba(20,20,20,0.06);">
          <tr>
            <td bgcolor="#ffffff" style="background:#ffffff;padding:${headerPad};text-align:center;border-bottom:1px solid #e8e2d9;">
              <img src="${logoSrc}" alt="${brand}" width="200" height="48" style="display:block;margin:0 auto;max-width:200px;height:auto;border:0;outline:none;text-decoration:none;background-color:#ffffff;" />
            </td>
          </tr>
          <tr>
            <td style="padding:${titlePad};font-family:Arial,Helvetica,sans-serif;color:#141414;">
              ${eyebrow}
              <h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700;color:#141414;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:${bodyPad};font-family:Arial,Helvetica,sans-serif;color:#4d4843;font-size:15px;line-height:1.65;">
              ${opts.innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0;">
              ${footerBlock(compact)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
