import { siteSettings } from "@/data/mock";

/** Public site origin for absolute image / link URLs in HTML mail. */
export function emailSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv;
  return `https://${siteSettings.domain}`;
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

type SocialLink = { href: string; bg: string; letter: string; title: string };

function socialLinks(): SocialLink[] {
  const out: SocialLink[] = [];
  const push = (
    href: string | undefined,
    bg: string,
    letter: string,
    title: string,
  ) => {
    const h = href?.trim() ?? "";
    if (h.startsWith("http://") || h.startsWith("https://")) {
      out.push({ href: h, bg, letter, title });
    }
  };
  push(siteSettings.facebookUrl, "#1877F2", "f", "Facebook");
  push(siteSettings.instagramUrl, "#E4405F", "I", "Instagram");
  push(siteSettings.pinterestUrl, "#BD081C", "P", "Pinterest");
  return out;
}

function socialIconsTable(): string {
  const links = socialLinks();
  if (!links.length) return "";

  const cells = links
    .map(
      (item) => `
      <td style="padding:0 6px;">
        <a href="${escapeHtml(item.href)}" title="${escapeHtml(item.title)}" target="_blank" rel="noopener noreferrer"
          style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:50%;background:${item.bg};color:#ffffff;text-align:center;text-decoration:none;font-weight:700;font-size:15px;font-family:Arial,Helvetica,sans-serif;">
          ${escapeHtml(item.letter)}
        </a>
      </td>`,
    )
    .join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:16px auto 0;">
      <tr>
        <td align="center" style="font-size:12px;color:#6f6a64;padding-bottom:8px;">Connect with us</td>
      </tr>
      <tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table></td></tr>
    </table>
  `;
}

function footerBlock(): string {
  const brand = escapeHtml(siteSettings.brandName);
  const addrHtml = siteSettings.address
    .split(",")
    .map((part) => escapeHtml(part.trim()))
    .filter(Boolean)
    .join(",<br>\n");
  const phone = escapeHtml(siteSettings.phone);
  const email = escapeHtml(siteSettings.email);
  const gst = escapeHtml(siteSettings.gstin);
  const telHref = escapeHtml(siteSettings.phone.replace(/\s/g, ""));
  const site = escapeHtml(emailSiteOrigin());

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#fbfaf7;border-top:1px solid #e8e2d9;">
      <tr>
        <td style="padding:28px 24px 20px;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8b1e2d;font-weight:700;font-family:Arial,Helvetica,sans-serif;">
            ${brand}
          </p>
          <p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:#4d4843;font-family:Arial,Helvetica,sans-serif;">
            ${addrHtml}
          </p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#4d4843;font-family:Arial,Helvetica,sans-serif;">
            <strong style="color:#141414;">Phone:</strong>
            <a href="tel:${telHref}" style="color:#8b1e2d;text-decoration:none;font-weight:600;">${phone}</a>
            &nbsp;·&nbsp;
            <strong style="color:#141414;">Email:</strong>
            <a href="mailto:${email}" style="color:#8b1e2d;text-decoration:none;font-weight:600;">${email}</a>
          </p>
          <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#6f6a64;font-family:Arial,Helvetica,sans-serif;">
            <strong style="color:#141414;">GSTIN:</strong> ${gst}
          </p>
          ${socialIconsTable()}
          <p style="margin:20px 0 0;font-size:11px;line-height:1.5;color:#a39e98;font-family:Arial,Helvetica,sans-serif;">
            <a href="${site}" style="color:#8b1e2d;text-decoration:underline;">${site}</a>
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
};

/**
 * Full responsive-friendly HTML document: branded header, content card, legal footer with GST & socials.
 */
export function buildSarjanEmailHtml(opts: SarjanEmailLayoutOptions): string {
  const preheader = escapeHtml(opts.preheader ?? opts.heading);
  const eyebrow = opts.eyebrow
    ? `<p style="margin:0 0 6px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#8b1e2d;font-weight:700;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(opts.eyebrow)}</p>`
    : "";
  const heading = escapeHtml(opts.heading);
  const logoSrc = escapeHtml(absUrl(siteSettings.logo));
  const brand = escapeHtml(siteSettings.brandName);

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
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e2d9;box-shadow:0 8px 28px rgba(20,20,20,0.06);">
          <tr>
            <td style="background:#141414;padding:22px 24px;text-align:center;">
              <img src="${logoSrc}" alt="${brand}" width="200" height="48" style="display:block;margin:0 auto;max-width:200px;height:auto;border:0;outline:none;text-decoration:none;" />
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;font-family:Arial,Helvetica,sans-serif;color:#141414;">
              ${eyebrow}
              <h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700;color:#141414;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 28px;font-family:Arial,Helvetica,sans-serif;color:#4d4843;font-size:15px;line-height:1.65;">
              ${opts.innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0;">
              ${footerBlock()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
