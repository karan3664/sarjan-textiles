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

type SocialLink = {
  href: string;
  bg: string;
  title: string;
  /** "instagram" uses inline SVG; others use a single letter. */
  kind: "instagram" | "facebook" | "pinterest";
};

/** White Instagram mark on gradient circle (no remote image; works in most mail apps). */
const instagramGlyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" role="img" aria-hidden="true" style="display:block;margin:0 auto;">
<path fill="#ffffff" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 11-2.881 0 1.44 1.44 0 012.881 0z"/>
</svg>`;

function socialLinks(): SocialLink[] {
  const out: SocialLink[] = [];
  const push = (
    href: string | undefined,
    bg: string,
    kind: SocialLink["kind"],
    title: string,
  ) => {
    const h = href?.trim() ?? "";
    if (h.startsWith("http://") || h.startsWith("https://")) {
      out.push({ href: h, bg, kind, title });
    }
  };
  push(siteSettings.facebookUrl, "#1877F2", "facebook", "Facebook");
  push(siteSettings.instagramUrl, "#E4405F", "instagram", "Instagram");
  push(siteSettings.pinterestUrl, "#BD081C", "pinterest", "Pinterest");
  return out;
}

function socialIconsTable(): string {
  const links = socialLinks();
  if (!links.length) return "";

  const cells = links
    .map((item) => {
      const inner =
        item.kind === "instagram"
          ? instagramGlyphSvg
          : escapeHtml(item.kind === "facebook" ? "f" : "P");
      return `
      <td style="padding:0 6px;">
        <a href="${escapeHtml(item.href)}" title="${escapeHtml(item.title)}" target="_blank" rel="noopener noreferrer"
          style="display:inline-block;width:40px;height:40px;line-height:40px;border-radius:50%;background:${item.bg};color:#ffffff;text-align:center;text-decoration:none;font-weight:700;font-size:15px;font-family:Arial,Helvetica,sans-serif;">
          <span style="display:inline-block;vertical-align:middle;line-height:0;padding-top:9px;">${inner}</span>
        </a>
      </td>`;
    })
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
  const origin = emailSiteOrigin();
  const siteHref = escapeHtml(`${origin}/`);
  const siteLabel = escapeHtml(`${origin}/`);

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
