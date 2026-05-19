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

function socialIconsTable(): string {
  const links = socialLinks();
  if (!links.length) return "";

  const rowWidth = links.length * EMAIL_SOCIAL_COL_PX;

  const cells = links
    .map((item) => {
      const inner = emailSocialIconImg(item.kind);
      const bg = escapeHtml(item.bg);
      return `<td width="${EMAIL_SOCIAL_COL_PX}" align="center" valign="middle" style="width:${EMAIL_SOCIAL_COL_PX}px;min-width:${EMAIL_SOCIAL_COL_PX}px;max-width:${EMAIL_SOCIAL_COL_PX}px;padding:0;font-size:0;line-height:0;vertical-align:middle;text-align:center;"><a href="${escapeHtml(item.href)}" title="${escapeHtml(item.title)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;line-height:0;font-size:0;text-align:center;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="44" height="44" align="center" bgcolor="${bg}" style="width:44px;height:44px;margin:0 auto;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;border-radius:22px;background-color:${bg};"><tr><td align="center" valign="middle" width="44" height="44" style="width:44px;height:44px;padding:0;margin:0;font-size:0;line-height:0;vertical-align:middle;text-align:center;border-radius:22px;">${inner}</td></tr></table></a></td>`;
    })
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="margin:18px auto 0;width:100%;max-width:100%;border-collapse:collapse;"><tr><td align="center" style="text-align:center;font-size:12px;color:#6f6a64;padding-bottom:10px;">Connect with us</td></tr><tr><td align="center" style="text-align:center;padding:0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="${rowWidth}" style="width:${rowWidth}px;max-width:100%;margin:0 auto;border-collapse:collapse;table-layout:fixed;mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr>${cells}</tr></table></td></tr></table>`;
}

function footerBlock(): string {
  const brand = escapeHtml(siteSettings.brandName);
  const phone = escapeHtml(siteSettings.phone);
  const email = escapeHtml(siteSettings.email);
  const telHref = escapeHtml(siteSettings.phone.replace(/\s/g, ""));
  const origin = emailSiteOrigin();
  const siteHref = escapeHtml(`${origin}/`);
  const siteLabel = escapeHtml(`${origin}/`);

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#fbfaf7;border-top:1px solid #e8e2d9;">
      <tr>
        <td align="center" style="padding:28px 24px 22px;text-align:center;">
          <p align="center" style="margin:0 0 14px;text-align:center;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8b1e2d;font-weight:700;font-family:Arial,Helvetica,sans-serif;">
            ${brand}
          </p>
          <p align="center" style="margin:0 0 18px;text-align:center;font-size:14px;line-height:1.65;color:#4d4843;font-family:Arial,Helvetica,sans-serif;">
            <a href="tel:${telHref}" style="color:#8b1e2d;text-decoration:none;font-weight:600;">${phone}</a>
            <span style="color:#c4bdb4;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
            <a href="mailto:${email}" style="color:#8b1e2d;text-decoration:none;font-weight:600;">${email}</a>
          </p>
          ${socialIconsTable()}
          <p align="center" style="margin:22px 0 0;text-align:center;font-size:11px;line-height:1.5;color:#a39e98;font-family:Arial,Helvetica,sans-serif;">
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
};

/**
 * Full responsive-friendly HTML document: branded header, content card, footer (contact + socials).
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
